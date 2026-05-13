using System.Security.Claims;
using HOPTranscribe.Api.Models.Common;
using HOPTranscribe.Api.Models.Sessions;
using HOPTranscribe.Api.Services.Broadcast;
using HOPTranscribe.Api.Services.Sessions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HOPTranscribe.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/sessions")]
public class SessionController : ControllerBase
{
    private readonly ISessionService _sessions;
    private readonly ISessionBroadcaster _broadcaster;
    private readonly ILogger<SessionController> _logger;

    public SessionController(
        ISessionService sessions,
        ISessionBroadcaster broadcaster,
        ILogger<SessionController> logger)
    {
        _sessions = sessions;
        _broadcaster = broadcaster;
        _logger = logger;
    }

    private string CurrentUser =>
        User.FindFirstValue(ClaimTypes.Name)
        ?? User.FindFirstValue("sub")
        ?? throw new UnauthorizedAccessException("No username claim found.");

    [HttpGet]
    public async Task<ActionResult<ApiResponse<PaginatedResult<SessionDto>>>> List(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken ct = default)
    {
        var result = await _sessions.ListForUserAsync(CurrentUser, page, pageSize, ct);
        return Ok(ApiResponse<PaginatedResult<SessionDto>>.Ok(result));
    }

    [HttpGet("{code}")]
    public async Task<ActionResult<ApiResponse<SessionDto>>> Get(string code, CancellationToken ct)
    {
        var session = await _sessions.GetByCodeAsync(code, ct);
        if (session is null) return NotFound(ApiResponse<SessionDto>.Fail("Session not found."));
        return Ok(ApiResponse<SessionDto>.Ok(session));
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<SessionDto>>> Create([FromBody] CreateSessionRequest request, CancellationToken ct)
    {
        if (!ModelState.IsValid) return BadRequest(ApiResponse<SessionDto>.Fail("Invalid request."));
        var dto = await _sessions.CreateAsync(CurrentUser, request, ct);
        return CreatedAtAction(nameof(Get), new { code = dto.Code }, ApiResponse<SessionDto>.Ok(dto));
    }

    [HttpPatch("{code}/end")]
    public async Task<ActionResult<ApiResponse<SessionDto>>> End(string code, CancellationToken ct)
    {
        try
        {
            var dto = await _sessions.EndAsync(code, CurrentUser, ct);
            if (dto is null) return NotFound(ApiResponse<SessionDto>.Fail("Session not found."));
            await _broadcaster.SessionUpdatedAsync(code, dto);
            return Ok(ApiResponse<SessionDto>.Ok(dto));
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden, ApiResponse<SessionDto>.Fail(ex.Message));
        }
    }

    [HttpDelete("{code}")]
    public async Task<IActionResult> Delete(string code, CancellationToken ct)
    {
        try
        {
            var deleted = await _sessions.DeleteAsync(code, CurrentUser, ct);
            if (!deleted) return NotFound(ApiResponse.Fail("Session not found."));
            return NoContent();
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden, ApiResponse.Fail(ex.Message));
        }
    }

    [HttpPost("{code}/transcripts")]
    public async Task<ActionResult<ApiResponse<TranscriptSegmentDto>>> AppendTranscript(
        string code,
        [FromBody] AppendTranscriptRequest request,
        CancellationToken ct)
    {
        var entity = await _sessions.GetEntityByCodeAsync(code, ct);
        if (entity is null) return NotFound(ApiResponse<TranscriptSegmentDto>.Fail("Session not found."));
        if (!string.Equals(entity.OwnerUsername, CurrentUser, StringComparison.OrdinalIgnoreCase))
            return StatusCode(StatusCodes.Status403Forbidden,
                ApiResponse<TranscriptSegmentDto>.Fail("Only the session owner can append transcripts."));

        var segment = await _sessions.AppendSegmentAsync(code, request, request.Matches, ct);
        _logger.LogInformation(
            "Appended segment {SegmentId} to session {Code} with {Count} matches",
            segment.Id, code, segment.Matches.Count);
        await _broadcaster.TranscriptAppendedAsync(code, segment);
        return Ok(ApiResponse<TranscriptSegmentDto>.Ok(segment));
    }

    [HttpGet("{code}/transcripts")]
    public async Task<ActionResult<ApiResponse<List<TranscriptSegmentDto>>>> ListTranscripts(
        string code,
        CancellationToken ct)
    {
        var segments = await _sessions.ListSegmentsAsync(code, ct);
        return Ok(ApiResponse<List<TranscriptSegmentDto>>.Ok(segments));
    }
}
