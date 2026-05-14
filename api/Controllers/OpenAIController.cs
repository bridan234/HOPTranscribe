using System.Security.Claims;
using HOPTranscribe.Api.Models.Common;
using HOPTranscribe.Api.Models.OpenAI;
using HOPTranscribe.Api.Services.OpenAI;
using HOPTranscribe.Api.Services.Sessions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HOPTranscribe.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/openai")]
public class OpenAIController : ControllerBase
{
    private readonly IOpenAIRealtimeService _realtime;
    private readonly ISessionService _sessions;
    private readonly ILogger<OpenAIController> _logger;

    public OpenAIController(IOpenAIRealtimeService realtime, ISessionService sessions, ILogger<OpenAIController> logger)
    {
        _realtime = realtime;
        _sessions = sessions;
        _logger = logger;
    }

    private string CurrentUser =>
        User.FindFirstValue(ClaimTypes.Name)
        ?? User.FindFirstValue("sub")
        ?? throw new UnauthorizedAccessException("No username claim found.");

    [HttpPost("transcription-session")]
    public async Task<ActionResult<ApiResponse<TranscriptionSessionResponse>>> CreateTranscriptionSession(
        [FromBody] CreateTranscriptionSessionRequest request,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.SessionCode))
            return BadRequest(ApiResponse<TranscriptionSessionResponse>.Fail("sessionCode is required."));

        var entity = await _sessions.GetEntityByCodeAsync(request.SessionCode, ct);
        if (entity is null)
            return NotFound(ApiResponse<TranscriptionSessionResponse>.Fail("Session not found."));

        if (!string.Equals(entity.OwnerUsername, CurrentUser, StringComparison.OrdinalIgnoreCase))
            return StatusCode(StatusCodes.Status403Forbidden,
                ApiResponse<TranscriptionSessionResponse>.Fail("Only the session owner can start transcription."));

        if (!string.Equals(entity.Status, "active", StringComparison.OrdinalIgnoreCase))
            return BadRequest(ApiResponse<TranscriptionSessionResponse>.Fail("Session is not active."));

        var result = await _realtime.CreateTranscriptionSessionAsync(entity.Language, ct);
        _logger.LogInformation("Minted transcription session for {Code} (model={Model})", request.SessionCode, result.Model);
        return Ok(ApiResponse<TranscriptionSessionResponse>.Ok(result));
    }
}
