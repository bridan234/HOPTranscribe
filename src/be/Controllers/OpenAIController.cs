using HOPTranscribe.Constants;
using HOPTranscribe.Models;
using HOPTranscribe.Services;
using Microsoft.AspNetCore.Mvc;

namespace HOPTranscribe.Controllers;

[ApiController]
[Route($"{ApiConstants.Routes.ApiPrefix}/{ApiConstants.Routes.OpenAIPrefix}")]
public class OpenAIController : ControllerBase
{
    private readonly IOpenAIService _openAIService;
    private readonly ILogger<OpenAIController> _logger;

    public OpenAIController(
        IOpenAIService openAIService,
        ILogger<OpenAIController> logger)
    {
        _openAIService = openAIService ?? throw new ArgumentNullException(
            nameof(openAIService), 
            ApiConstants.ErrorMessages.ArgumentNullOpenAIService);
        _logger = logger ?? throw new ArgumentNullException(
            nameof(logger), 
            ApiConstants.ErrorMessages.ArgumentNullLogger);
    }

    /// <summary>
    /// Creates an ephemeral OpenAI Realtime API session token.
    /// Token expires in 60 seconds and is used for WebRTC connection.
    /// </summary>
    /// <returns>Session details including ephemeral client_secret</returns>
    [HttpPost(ApiConstants.Routes.SessionEndpoint)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> CreateSession(CancellationToken cancellationToken)
    {
        try
        {
            _logger.LogInformation("Received request to create OpenAI realtime session");

            var session = await _openAIService.CreateRealtimeSessionAsync(cancellationToken);

            var response = new
            {
                ephemeral_key = new
                {
                    value = session.Value,
                    expires_at = session.ExpiresAt,
                    expires_at_utc = DateTimeOffset.FromUnixTimeSeconds(session.ExpiresAt)
                },
                session_id = session.Session?.Id,
                model = session.Session?.Model
            };

            return Ok(ApiResponse<object>.Ok(response, "Session created successfully"));
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "HTTP error creating OpenAI session");
            return StatusCode(
                StatusCodes.Status502BadGateway,
                ApiResponse<object>.Fail("OpenAI API error", ex.Message)
            );
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error creating OpenAI session");
            return StatusCode(
                StatusCodes.Status500InternalServerError,
                ApiResponse<object>.Fail("Internal server error", ex.Message)
            );
        }
    }

    /// <summary>
    /// Sanitizes malformed JSON using OpenAI LLM.
    /// Used as a fallback when WebSocket responses contain invalid JSON.
    /// </summary>
    /// <returns>Sanitized, valid JSON string</returns>
    [HttpPost(ApiConstants.Routes.SanitizeJsonEndpoint)]
    [ProducesResponseType(typeof(ApiResponse<SanitizeJsonResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> SanitizeJson([FromBody] SanitizeJsonRequest request, CancellationToken cancellationToken)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(request.MalformedJson))
            {
                return BadRequest(ApiResponse<object>.Fail(ApiConstants.ErrorMessages.MalformedJsonRequired));
            }

            _logger.LogInformation(ApiConstants.LogMessages.AttemptingJsonSanitization);

            var userPrompt = string.Format(
                ApiConstants.Prompts.JsonSanitizerUserPromptTemplate, 
                request.MalformedJson);
            
            var sanitizedJson = await _openAIService.GetChatCompletionAsync(
                ApiConstants.Prompts.JsonSanitizerSystemPrompt, 
                userPrompt, 
                cancellationToken);

            if (string.IsNullOrWhiteSpace(sanitizedJson))
            {
                return Ok(ApiResponse<SanitizeJsonResponse>.Fail(
                    ApiConstants.ErrorMessages.JsonSanitizationFailed));
            }

            // Strip markdown code blocks if present
            sanitizedJson = sanitizedJson.Trim();
            if (sanitizedJson.StartsWith("```json"))
            {
                sanitizedJson = sanitizedJson.Substring(7);
            }
            if (sanitizedJson.StartsWith("```"))
            {
                sanitizedJson = sanitizedJson.Substring(3);
            }
            if (sanitizedJson.EndsWith("```"))
            {
                sanitizedJson = sanitizedJson.Substring(0, sanitizedJson.Length - 3);
            }
            sanitizedJson = sanitizedJson.Trim();

            // Validate that it's actually valid JSON
            try
            {
                System.Text.Json.JsonDocument.Parse(sanitizedJson);
            }
            catch (System.Text.Json.JsonException)
            {
                _logger.LogWarning(ApiConstants.LogMessages.LLMReturnedInvalidJson);
                return Ok(ApiResponse<SanitizeJsonResponse>.Fail(
                    ApiConstants.ErrorMessages.SanitizationProducedInvalidJson));
            }

            _logger.LogInformation(ApiConstants.LogMessages.SuccessfullySanitizedJson);

            return Ok(ApiResponse<SanitizeJsonResponse>.Ok(
                new SanitizeJsonResponse { SanitizedJson = sanitizedJson },
                ApiConstants.ResponseMessages.JsonSanitizedSuccessfully
            ));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, ApiConstants.LogMessages.ErrorSanitizingJson);
            return StatusCode(
                StatusCodes.Status500InternalServerError,
                ApiResponse<object>.Fail(ApiConstants.ErrorMessages.InternalServerErrorDuringJsonSanitization)
            );
        }
    }
}

public record SanitizeJsonRequest
{
    public string MalformedJson { get; init; } = string.Empty;
    public string Context { get; init; } = string.Empty;
}

public record SanitizeJsonResponse
{
    public string SanitizedJson { get; init; } = string.Empty;
}
