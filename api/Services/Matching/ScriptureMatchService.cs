using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using HOPTranscribe.Api.Configuration;
using HOPTranscribe.Api.Constants;
using HOPTranscribe.Api.Models.Matching;
using HOPTranscribe.Api.Validation;
using Microsoft.Extensions.Options;

namespace HOPTranscribe.Api.Services.Matching;

public class ScriptureMatchService : IScriptureMatchService
{
    private const string ChatCompletionsPath = "/v1/chat/completions";

    private readonly HttpClient _http;
    private readonly OpenAISettings _settings;
    private readonly ScriptureValidator _validator;
    private readonly ILogger<ScriptureMatchService> _logger;

    public ScriptureMatchService(
        HttpClient http,
        IOptions<OpenAISettings> options,
        ScriptureValidator validator,
        ILogger<ScriptureMatchService> logger)
    {
        _http = http;
        _settings = options.Value;
        _validator = validator;
        _logger = logger;

        if (string.IsNullOrWhiteSpace(_settings.ApiKey))
            throw new InvalidOperationException("OpenAI:ApiKey is not configured.");

        _http.BaseAddress = new Uri(_settings.BaseUrl);
        _http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", _settings.ApiKey);
        _http.Timeout = TimeSpan.FromSeconds(_settings.TimeoutSeconds);
    }

    public async Task<MatchResponse> MatchAsync(MatchRequest request, CancellationToken ct = default)
    {
        var preferredVersion = string.IsNullOrWhiteSpace(request.PreferredVersion) ? "NKJV" : request.PreferredVersion;
        var n = Math.Clamp(request.N <= 0 ? 3 : request.N, 1, 5);

        var primary = _settings.MatchingModel;
        var fallback = _settings.MatchingFallbackModel;

        var (raw, modelUsed) = await CallModelAsync(primary, request.Utterance, preferredVersion, n, ct);
        if (raw is null && !string.IsNullOrWhiteSpace(fallback) && !string.Equals(primary, fallback, StringComparison.OrdinalIgnoreCase))
        {
            _logger.LogWarning("Primary matching model '{Model}' unavailable; retrying with fallback '{Fallback}'", primary, fallback);
            (raw, modelUsed) = await CallModelAsync(fallback, request.Utterance, preferredVersion, n, ct);
        }

        if (raw is null)
        {
            _logger.LogError("Both primary and fallback matching models failed for utterance starting '{Snippet}'",
                request.Utterance[..Math.Min(60, request.Utterance.Length)]);
            return new MatchResponse();
        }

        _logger.LogDebug("Matching model {Model} returned {Count} raw matches", modelUsed, raw.Matches.Count);

        var validated = new List<ScriptureMatch>();
        foreach (var m in raw.Matches.OrderByDescending(m => m.Confidence))
        {
            var v = _validator.Validate(m);
            if (v is not null) validated.Add(v);
            if (validated.Count >= n) break;
        }

        return new MatchResponse { Matches = validated };
    }

    private async Task<(MatchResponse? response, string modelUsed)> CallModelAsync(
        string model, string utterance, string preferredVersion, int n, CancellationToken ct)
    {
        var body = new Dictionary<string, object?>
        {
            ["model"] = model,
            ["max_completion_tokens"] = _settings.MatchingMaxOutputTokens,
            ["response_format"] = new
            {
                type = "json_schema",
                json_schema = new
                {
                    name = "scripture_match_result",
                    strict = true,
                    schema = JsonDocument.Parse(Prompts.ScriptureMatchJsonSchema).RootElement,
                },
            },
            ["messages"] = new object[]
            {
                new { role = "system", content = Prompts.ScriptureMatchSystemPrompt },
                new { role = "user", content = Prompts.BuildUserPrompt(utterance, preferredVersion, n) },
            },
        };

        // gpt-5 / o-series reasoning models only accept the default temperature (1)
        // and reject an explicit non-default value, so only set it where supported.
        if (SupportsCustomTemperature(model))
        {
            body["temperature"] = _settings.MatchingTemperature;
        }
        else
        {
            // Keep reasoning models snappy and stop reasoning tokens from eating the
            // whole completion budget (which would yield an empty JSON response).
            body["reasoning_effort"] = "minimal";
        }

        var json = JsonSerializer.Serialize(body);
        using var content = new StringContent(json, Encoding.UTF8, "application/json");

        using var response = await _http.PostAsync(ChatCompletionsPath, content, ct);
        var raw = await response.Content.ReadAsStringAsync(ct);

        if (!response.IsSuccessStatusCode)
        {
            if (response.StatusCode is HttpStatusCode.NotFound or HttpStatusCode.BadRequest)
            {
                if (raw.Contains("model", StringComparison.OrdinalIgnoreCase) &&
                    raw.Contains("not found", StringComparison.OrdinalIgnoreCase))
                {
                    _logger.LogWarning("Matching model '{Model}' returned not-found: {Body}", model, raw);
                    return (null, model);
                }
            }
            _logger.LogError("Chat completions error {Status} for model {Model}: {Body}", response.StatusCode, model, raw);
            return (null, model);
        }

        try
        {
            using var doc = JsonDocument.Parse(raw);
            var contentText = doc.RootElement
                .GetProperty("choices")[0]
                .GetProperty("message")
                .GetProperty("content")
                .GetString();

            if (string.IsNullOrWhiteSpace(contentText))
                return (new MatchResponse(), model);

            var parsed = JsonSerializer.Deserialize<MatchResponse>(contentText, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true,
            });
            return (parsed ?? new MatchResponse(), model);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to parse matching response from model {Model}. Body: {Body}", model, raw);
            return (null, model);
        }
    }

    private static bool SupportsCustomTemperature(string model)
        => !(model.StartsWith("gpt-5", StringComparison.OrdinalIgnoreCase)
             || model.StartsWith("o1", StringComparison.OrdinalIgnoreCase)
             || model.StartsWith("o3", StringComparison.OrdinalIgnoreCase)
             || model.StartsWith("o4", StringComparison.OrdinalIgnoreCase));
}
