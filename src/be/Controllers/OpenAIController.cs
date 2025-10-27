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
}
