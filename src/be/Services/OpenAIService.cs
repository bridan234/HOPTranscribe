using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using HOPTranscribe.Configuration;
using HOPTranscribe.Constants;
using HOPTranscribe.Models.OpenAI;
using Microsoft.Extensions.Options;

namespace HOPTranscribe.Services;

public class OpenAIService : IOpenAIService
{
    private readonly HttpClient _httpClient;
    private readonly OpenAISettings _settings;
    private readonly ILogger<OpenAIService> _logger;

    public OpenAIService(
        HttpClient httpClient,
        IOptions<OpenAISettings> settings,
        ILogger<OpenAIService> logger)
    {
        _httpClient = httpClient ?? throw new ArgumentNullException(
            nameof(httpClient), 
            ApiConstants.ErrorMessages.ArgumentNullHttpClient);
        _settings = settings?.Value ?? throw new ArgumentNullException(
            nameof(settings), 
            ApiConstants.ErrorMessages.ArgumentNullSettings);
        _logger = logger ?? throw new ArgumentNullException(
            nameof(logger), 
            ApiConstants.ErrorMessages.ArgumentNullLogger);

        ConfigureHttpClient();
    }

    private void ConfigureHttpClient()
    {
        if (string.IsNullOrWhiteSpace(_settings.ApiKey))
        {
            throw new InvalidOperationException(ApiConstants.ErrorMessages.OpenAIConfigMissing);
        }

        _httpClient.BaseAddress = new Uri(ApiConstants.OpenAI.BaseUrl);
        _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(
            ApiConstants.OpenAI.BearerScheme,
            _settings.ApiKey
        );
        _httpClient.Timeout = TimeSpan.FromSeconds(_settings.TimeoutSeconds);
    }

    public async Task<RealtimeSessionResponse> CreateRealtimeSessionAsync(
        CancellationToken cancellationToken = default)
    {
        try
        {
            _logger.LogInformation("Creating OpenAI realtime session");

            var request = new RealtimeSessionRequest
            {
                Session = new SessionConfig
                {
                    Model = ApiConstants.OpenAI.RealtimeModel,
                    Type = ApiConstants.OpenAI.SessionType,
                    Instructions = OpenAIInstructions.SermonInstructions,
                    Audio = new AudioConfig { Output = new AudioOutput { Voice = "marin" } },
                    Tools = new List<ToolDefinition>
                    {
                        new ToolDefinition
                        {
                            Name = "detect_scripture",
                            Description = "Called when a Bible verse or scripture reference is detected in the audio",
                            Parameters = new
                            {
                                type = "object",
                                properties = new
                                {
                                    reference = new { type = "string", description = "Scripture reference like 'John 3:16' or null if unclear" },
                                    transcript = new { type = "string", description = "Spoken words including the reference" },
                                    quote = new { type = "string", description = "Exact verse text if known; else empty string" }
                                },
                                required = new[] { "transcript" }
                            }
                        }
                    }
                }
            };

            var jsonContent = JsonSerializer.Serialize(request);
            var httpContent = new StringContent(jsonContent, Encoding.UTF8, "application/json");

            var response = await _httpClient.PostAsync(
                ApiConstants.OpenAI.RealtimeClientSecretsEndpoint,
                httpContent,
                cancellationToken
            );

            if (!response.IsSuccessStatusCode)
            {
                var errorContent = await response.Content.ReadAsStringAsync(cancellationToken);
                _logger.LogError(
                    "OpenAI API returned error. Status: {StatusCode}, Content: {Content}",
                    response.StatusCode,
                    errorContent
                );
                throw new HttpRequestException(
                    $"{ApiConstants.ErrorMessages.SessionCreationFailed}. Status: {response.StatusCode}"
                );
            }

            var responseContent = await response.Content.ReadAsStringAsync(cancellationToken);
            var session = JsonSerializer.Deserialize<RealtimeSessionResponse>(responseContent);

            if (session == null || string.IsNullOrWhiteSpace(session.Value))
            {
                _logger.LogError("Invalid session response: {Response}", responseContent);
                throw new InvalidOperationException(ApiConstants.ErrorMessages.InvalidResponse);
            }

            _logger.LogInformation(
                "Successfully created OpenAI session. Key: {KeyPrefix}..., Expires at: {ExpiresAt}",
                session.Value[..Math.Min(15, session.Value.Length)],
                DateTimeOffset.FromUnixTimeSeconds(session.ExpiresAt)
            );

            return session;
        }
        catch (Exception ex) when (ex is not HttpRequestException and not InvalidOperationException)
        {
            _logger.LogError(ex, "Unexpected error creating OpenAI realtime session");
            throw;
        }
    }

    public async Task<string> GetChatCompletionAsync(
        string systemPrompt,
        string userPrompt,
        CancellationToken cancellationToken = default)
    {
        try
        {
            _logger.LogInformation(ApiConstants.LogMessages.RequestingChatCompletion);

            var request = new
            {
                model = ApiConstants.OpenAI.ChatModel,
                messages = new[]
                {
                    new { role = "system", content = systemPrompt },
                    new { role = "user", content = userPrompt }
                },
                temperature = ApiConstants.OpenAI.JsonRepairTemperature,
                max_tokens = ApiConstants.OpenAI.JsonRepairMaxTokens,
                response_format = new { type = ApiConstants.OpenAI.JsonResponseFormat }
            };

            var jsonContent = JsonSerializer.Serialize(request);
            var httpContent = new StringContent(jsonContent, Encoding.UTF8, "application/json");

            var response = await _httpClient.PostAsync(
                ApiConstants.OpenAI.ChatCompletionsEndpoint,
                httpContent,
                cancellationToken
            );

            if (!response.IsSuccessStatusCode)
            {
                var errorContent = await response.Content.ReadAsStringAsync(cancellationToken);
                _logger.LogError(
                    ApiConstants.LogMessages.ChatApiError,
                    response.StatusCode,
                    errorContent
                );
                return string.Empty;
            }

            var responseContent = await response.Content.ReadAsStringAsync(cancellationToken);
            using var document = JsonDocument.Parse(responseContent);
            
            var content = document.RootElement
                .GetProperty("choices")[0]
                .GetProperty("message")
                .GetProperty("content")
                .GetString();

            _logger.LogInformation(ApiConstants.LogMessages.ChatCompletionSuccess);

            return content ?? string.Empty;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, ApiConstants.LogMessages.ErrorGettingChatCompletion);
            return string.Empty;
        }
    }
}
