using System.Security.Claims;
using HOPTranscribe.Api.Models.Common;
using HOPTranscribe.Api.Models.Matching;
using HOPTranscribe.Api.Services.Matching;
using HOPTranscribe.Api.Services.Sessions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace HOPTranscribe.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/match")]
public class MatchController : ControllerBase
{
    private readonly IScriptureMatchService _matcher;
    private readonly ISessionService _sessions;
    private readonly ILogger<MatchController> _logger;

    public MatchController(IScriptureMatchService matcher, ISessionService sessions, ILogger<MatchController> logger)
    {
        _matcher = matcher;
        _sessions = sessions;
        _logger = logger;
    }

    private string CurrentUser =>
        User.FindFirstValue(ClaimTypes.Name)
        ?? User.FindFirstValue("sub")
        ?? throw new UnauthorizedAccessException("No username claim found.");

    [HttpPost]
    [EnableRateLimiting("match")]
    public async Task<ActionResult<ApiResponse<MatchResponse>>> Match(
        [FromBody] MatchRequest request,
        CancellationToken ct)
    {
        if (!ModelState.IsValid)
            return BadRequest(ApiResponse<MatchResponse>.Fail("Invalid request."));

        var entity = await _sessions.GetEntityByCodeAsync(request.SessionCode, ct);
        if (entity is null)
            return NotFound(ApiResponse<MatchResponse>.Fail("Session not found."));

        if (!string.Equals(entity.OwnerUsername, CurrentUser, StringComparison.OrdinalIgnoreCase))
            return StatusCode(StatusCodes.Status403Forbidden,
                ApiResponse<MatchResponse>.Fail("Only the session owner can request scripture matches."));

        var result = await _matcher.MatchAsync(request, ct);
        _logger.LogInformation("Matching returned {Count} verses for session {Code}", result.Matches.Count, request.SessionCode);
        return Ok(ApiResponse<MatchResponse>.Ok(result));
    }
}
