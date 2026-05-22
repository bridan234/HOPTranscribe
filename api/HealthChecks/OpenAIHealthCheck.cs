using System.Net.Http.Headers;
using HOPTranscribe.Api.Configuration;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.Extensions.Options;

namespace HOPTranscribe.Api.HealthChecks;

public class OpenAIHealthCheck : IHealthCheck
{
    private const string ModelsPath = "/v1/models";

    private readonly IHttpClientFactory _httpClientFactory;
    private readonly OpenAISettings _settings;
    private readonly IConfiguration _configuration;

    public OpenAIHealthCheck(IHttpClientFactory httpClientFactory, IOptions<OpenAISettings> options, IConfiguration configuration)
    {
        _httpClientFactory = httpClientFactory;
        _settings = options.Value;
        _configuration = configuration;
    }

    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        if (!_configuration.GetValue("HealthChecks:OpenAI:Enabled", true))
        {
            return HealthCheckResult.Healthy("OpenAI health check is disabled.");
        }

        if (string.IsNullOrWhiteSpace(_settings.ApiKey))
        {
            return HealthCheckResult.Unhealthy("OpenAI API key is not configured.");
        }

        try
        {
            var http = _httpClientFactory.CreateClient("openai-health");
            http.BaseAddress = new Uri(_settings.BaseUrl);
            http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", _settings.ApiKey);
            http.Timeout = TimeSpan.FromSeconds(Math.Min(_settings.TimeoutSeconds, 10));

            using var request = new HttpRequestMessage(HttpMethod.Get, ModelsPath);
            using var response = await http.SendAsync(
                request,
                HttpCompletionOption.ResponseHeadersRead,
                cancellationToken);

            return response.IsSuccessStatusCode
                ? HealthCheckResult.Healthy("OpenAI API is reachable.")
                : HealthCheckResult.Unhealthy($"OpenAI API returned {(int)response.StatusCode} {response.ReasonPhrase}.");
        }
        catch (Exception ex)
        {
            return HealthCheckResult.Unhealthy("OpenAI API reachability check failed.", ex);
        }
    }
}
