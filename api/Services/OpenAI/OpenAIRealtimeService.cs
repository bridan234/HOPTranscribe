using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using HOPTranscribe.Api.Configuration;
using HOPTranscribe.Api.Models.OpenAI;
using Microsoft.Extensions.Options;

namespace HOPTranscribe.Api.Services.OpenAI;

public class OpenAIRealtimeService : IOpenAIRealtimeService
{
    private const string ClientSecretsPath = "/v1/realtime/client_secrets";
    private const string RealtimeCallsPath = "/v1/realtime/calls";

    private readonly HttpClient _http;
    private readonly OpenAISettings _settings;
    private readonly ILogger<OpenAIRealtimeService> _logger;

    public OpenAIRealtimeService(HttpClient http, IOptions<OpenAISettings> options, ILogger<OpenAIRealtimeService> logger)
    {
        _http = http;
        _settings = options.Value;
        _logger = logger;

        if (string.IsNullOrWhiteSpace(_settings.ApiKey))
            throw new InvalidOperationException("OpenAI:ApiKey is not configured.");

        _http.BaseAddress = new Uri(_settings.BaseUrl);
        _http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", _settings.ApiKey);
        _http.Timeout = TimeSpan.FromSeconds(_settings.TimeoutSeconds);
    }

    public async Task<TranscriptionSessionResponse> CreateTranscriptionSessionAsync(string language, CancellationToken ct = default)
    {
        var normalizedLanguage = string.IsNullOrWhiteSpace(language) ? "en" : language;
        var payload = new OpenAIRealtimeClientSecretRequest
        {
            Session = new OpenAIRealtimeTranscriptionSession
            {
                Audio = new OpenAIRealtimeTranscriptionAudio
                {
                    Input = new OpenAIRealtimeTranscriptionAudioInput
                    {
                        Transcription = new OpenAIInputAudioTranscription
                        {
                            Model = _settings.TranscriptionModel,
                            Language = normalizedLanguage,
                        },
                    },
                },
            },
        };

        var json = JsonSerializer.Serialize(payload);
        using var content = new StringContent(json, Encoding.UTF8, "application/json");

        _logger.LogInformation("Creating OpenAI transcription session (model={Model}, language={Language})",
            _settings.TranscriptionModel, normalizedLanguage);

        using var response = await _http.PostAsync(ClientSecretsPath, content, ct);
        var body = await response.Content.ReadAsStringAsync(ct);

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogError("OpenAI transcription session error {Status}: {Body}", response.StatusCode, body);
            throw new HttpRequestException(
                $"OpenAI transcription session request failed with status {(int)response.StatusCode}.");
        }

        var parsed = JsonSerializer.Deserialize<OpenAIRealtimeClientSecretResponse>(body);
        if (parsed?.Value is null)
        {
            _logger.LogError("OpenAI client secret response missing value: {Body}", body);
            throw new InvalidOperationException("OpenAI did not return a client secret.");
        }

        var expiresAt = parsed.ExpiresAt > 0
            ? DateTimeOffset.FromUnixTimeSeconds(parsed.ExpiresAt)
            : DateTimeOffset.UtcNow.AddMinutes(10);

        var sdpUrl = new Uri(new Uri(_settings.BaseUrl), RealtimeCallsPath).ToString();

        return new TranscriptionSessionResponse
        {
            ClientSecret = parsed.Value,
            ExpiresAt = expiresAt,
            Model = _settings.TranscriptionModel,
            SdpUrl = sdpUrl,
            SessionId = parsed.Session?.Id ?? string.Empty,
            Language = normalizedLanguage,
        };
    }
}
