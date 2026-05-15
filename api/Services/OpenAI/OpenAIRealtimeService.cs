using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using HOPTranscribe.Api.Configuration;
using HOPTranscribe.Api.Models.OpenAI;
using Microsoft.Extensions.Options;

namespace HOPTranscribe.Api.Services.OpenAI;

public class OpenAIRealtimeService : IOpenAIRealtimeService
{
    private const string TranscriptionSessionsPath = "/v1/realtime/transcription_sessions";
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
        var payload = new OpenAITranscriptionSessionPayload
        {
            InputAudioTranscription = new OpenAIInputAudioTranscription
            {
                Model = _settings.TranscriptionModel,
                Language = string.IsNullOrWhiteSpace(language) ? "en" : language,
            },
        };

        var json = JsonSerializer.Serialize(payload);
        using var content = new StringContent(json, Encoding.UTF8, "application/json");

        _logger.LogInformation("Creating OpenAI transcription session (model={Model}, language={Language})",
            _settings.TranscriptionModel, language);

        using var response = await _http.PostAsync(TranscriptionSessionsPath, content, ct);
        var body = await response.Content.ReadAsStringAsync(ct);

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogError("OpenAI transcription session error {Status}: {Body}", response.StatusCode, body);
            throw new HttpRequestException(
                $"OpenAI transcription session request failed with status {(int)response.StatusCode}.");
        }

        var parsed = JsonSerializer.Deserialize<OpenAITranscriptionSessionResponse>(body);
        if (parsed?.ClientSecret?.Value is null)
        {
            _logger.LogError("OpenAI transcription session response missing client_secret: {Body}", body);
            throw new InvalidOperationException("OpenAI did not return a client_secret.");
        }

        var expiresAt = parsed.ClientSecret.ExpiresAt > 0
            ? DateTimeOffset.FromUnixTimeSeconds(parsed.ClientSecret.ExpiresAt)
            : DateTimeOffset.UtcNow.AddMinutes(1);

        var sdpUrl = new Uri(new Uri(_settings.BaseUrl), $"{RealtimeCallsPath}?model={Uri.EscapeDataString(_settings.TranscriptionModel)}").ToString();

        return new TranscriptionSessionResponse
        {
            ClientSecret = parsed.ClientSecret.Value,
            ExpiresAt = expiresAt,
            Model = _settings.TranscriptionModel,
            SdpUrl = sdpUrl,
            SessionId = parsed.Id ?? string.Empty,
            Language = language,
        };
    }
}
