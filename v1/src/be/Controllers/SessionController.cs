using HOPTranscribe.Constants;
using HOPTranscribe.Middleware;
using HOPTranscribe.Models;
using HOPTranscribe.Services;
using Microsoft.AspNetCore.Mvc;

namespace HOPTranscribe.Controllers;

[ApiController]
[Route($"{ApiConstants.Routes.ApiPrefix}/sessions")]
public class SessionController : ControllerBase
{
    private readonly ISessionService _sessionService;
    private readonly ILogger<SessionController> _logger;

    public SessionController(ISessionService sessionService, ILogger<SessionController> logger)
    {
        _sessionService = sessionService;
        _logger = logger;
    }

    /// <summary>
    /// Get paginated list of sessions with filtering and sorting
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<PaginatedResult<Session>>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> GetSessions([FromQuery] SessionQueryParams queryParams, CancellationToken cancellationToken)
    {
        try
        {
            if (queryParams.PageNumber < 1)
            {
                return BadRequest(ApiResponse<object>.Fail("Page number must be greater than 0"));
            }

            if (queryParams.PageSize < 1 || queryParams.PageSize > 100)
            {
                return BadRequest(ApiResponse<object>.Fail("Page size must be between 1 and 100"));
            }

            _logger.LogInformation(
                "Retrieving sessions - Page: {Page}, Size: {Size}, User: {User}, Status: {Status}",
                queryParams.PageNumber,
                queryParams.PageSize,
                queryParams.UserName,
                queryParams.Status
            );

            var result = await _sessionService.GetSessionsAsync(queryParams, cancellationToken);
            
            return Ok(ApiResponse<PaginatedResult<Session>>.Ok(result, "Sessions retrieved successfully"));
        }
        catch (OperationCanceledException)
        {
            _logger.LogWarning("GetSessions request was cancelled");
            return StatusCode(499, ApiResponse<object>.Fail("Request was cancelled"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving sessions");
            return StatusCode(StatusCodes.Status500InternalServerError, 
                ApiResponse<object>.Fail("An error occurred while retrieving sessions"));
        }
    }

    /// <summary>
    /// Get session by session code
    /// </summary>
    [HttpGet("{sessionCode}")]
    [ProducesResponseType(typeof(ApiResponse<Session>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> GetSession(string sessionCode, CancellationToken cancellationToken)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(sessionCode))
            {
                return BadRequest(ApiResponse<object>.Fail("Session code is required"));
            }

            _logger.LogDebug("Retrieving session {SessionCode}", sessionCode);

            var session = await _sessionService.GetSessionAsync(sessionCode, cancellationToken);
            
            if (session == null)
            {
                _logger.LogWarning("Session {SessionCode} not found", sessionCode);
                return NotFound(ApiResponse<object>.Fail($"Session {sessionCode} not found"));
            }

            return Ok(ApiResponse<Session>.Ok(session, "Session retrieved successfully"));
        }
        catch (OperationCanceledException)
        {
            _logger.LogWarning("GetSession request for {SessionCode} was cancelled", sessionCode);
            return StatusCode(499, ApiResponse<object>.Fail("Request was cancelled"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving session {SessionCode}", sessionCode);
            return StatusCode(StatusCodes.Status500InternalServerError, 
                ApiResponse<object>.Fail("An error occurred while retrieving the session"));
        }
    }

    /// <summary>
    /// Create a new session
    /// </summary>
    [HttpPost]
    [ProducesResponseType(typeof(ApiResponse<Session>), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> CreateSession([FromBody] CreateSessionRequest request, CancellationToken cancellationToken)
    {
        try
        {
            if (request == null)
            {
                return BadRequest(ApiResponse<object>.Fail("Request body is required"));
            }

            if (!ModelState.IsValid)
            {
                _logger.LogWarning("Invalid model state for CreateSession: {@ModelState}", ModelState);
                return BadRequest(ApiResponse<object>.Fail("Invalid request data"));
            }

            var userId = HttpContext.GetUserId();
            var ipAddress = HttpContext.GetIpAddress();

            _logger.LogInformation(
                "Creating session for user {UserName} from IP {IpAddress}",
                request.UserName,
                ipAddress
            );

            var session = await _sessionService.CreateSessionAsync(request, cancellationToken);

            _logger.LogInformation(
                "Session {SessionCode} created successfully for user {UserName}",
                session.SessionCode,
                request.UserName
            );

            return CreatedAtAction(
                nameof(GetSession),
                new { sessionCode = session.SessionCode },
                ApiResponse<Session>.Ok(session, "Session created successfully")
            );
        }
        catch (OperationCanceledException)
        {
            _logger.LogWarning("CreateSession request was cancelled");
            return StatusCode(499, ApiResponse<object>.Fail("Request was cancelled"));
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(ex, "Invalid argument when creating session");
            return BadRequest(ApiResponse<object>.Fail(ex.Message));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating session for user {UserName}", request?.UserName);
            return StatusCode(StatusCodes.Status500InternalServerError, 
                ApiResponse<object>.Fail("An error occurred while creating the session"));
        }
    }

    /// <summary>
    /// Update session details
    /// </summary>
    [HttpPut("{sessionCode}")]
    [ProducesResponseType(typeof(ApiResponse<Session>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> UpdateSession(
        string sessionCode,
        [FromBody] UpdateSessionRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(sessionCode))
            {
                return BadRequest(ApiResponse<object>.Fail("Session code is required"));
            }

            if (request == null)
            {
                return BadRequest(ApiResponse<object>.Fail("Request body is required"));
            }

            if (!ModelState.IsValid)
            {
                _logger.LogWarning("Invalid model state for UpdateSession: {@ModelState}", ModelState);
                return BadRequest(ApiResponse<object>.Fail("Invalid request data"));
            }

            var userId = HttpContext.GetUserId();
            var ipAddress = HttpContext.GetIpAddress();

            _logger.LogInformation(
                "Updating session {SessionCode} from IP {IpAddress}",
                sessionCode,
                ipAddress
            );

            var session = await _sessionService.UpdateSessionAsync(sessionCode, request, cancellationToken);
            
            if (session == null)
            {
                _logger.LogWarning("Session {SessionCode} not found for update", sessionCode);
                return NotFound(ApiResponse<object>.Fail($"Session {sessionCode} not found"));
            }

            _logger.LogInformation("Session {SessionCode} updated successfully", sessionCode);
            return Ok(ApiResponse<Session>.Ok(session, "Session updated successfully"));
        }
        catch (OperationCanceledException)
        {
            _logger.LogWarning("UpdateSession request for {SessionCode} was cancelled", sessionCode);
            return StatusCode(499, ApiResponse<object>.Fail("Request was cancelled"));
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(ex, "Invalid argument when updating session {SessionCode}", sessionCode);
            return BadRequest(ApiResponse<object>.Fail(ex.Message));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating session {SessionCode}", sessionCode);
            return StatusCode(StatusCodes.Status500InternalServerError, 
                ApiResponse<object>.Fail("An error occurred while updating the session"));
        }
    }

    /// <summary>
    /// End a session (mark as ended)
    /// </summary>
    [HttpPatch("{sessionCode}/end")]
    [ProducesResponseType(typeof(ApiResponse<Session>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status409Conflict)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> EndSession(string sessionCode, CancellationToken cancellationToken)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(sessionCode))
            {
                return BadRequest(ApiResponse<object>.Fail("Session code is required"));
            }

            var userId = HttpContext.GetUserId();
            var ipAddress = HttpContext.GetIpAddress();

            _logger.LogInformation(
                "Ending session {SessionCode} from IP {IpAddress}",
                sessionCode,
                ipAddress
            );

            var session = await _sessionService.EndSessionAsync(sessionCode, cancellationToken);
            
            if (session == null)
            {
                _logger.LogWarning("Session {SessionCode} not found for ending", sessionCode);
                return NotFound(ApiResponse<object>.Fail($"Session {sessionCode} not found"));
            }

            _logger.LogInformation("Session {SessionCode} ended successfully", sessionCode);
            return Ok(ApiResponse<Session>.Ok(session, "Session ended successfully"));
        }
        catch (OperationCanceledException)
        {
            _logger.LogWarning("EndSession request for {SessionCode} was cancelled", sessionCode);
            return StatusCode(499, ApiResponse<object>.Fail("Request was cancelled"));
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Invalid operation when ending session {SessionCode}", sessionCode);
            return Conflict(ApiResponse<object>.Fail(ex.Message));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error ending session {SessionCode}", sessionCode);
            return StatusCode(StatusCodes.Status500InternalServerError, 
                ApiResponse<object>.Fail("An error occurred while ending the session"));
        }
    }

    /// <summary>
    /// Delete a session
    /// </summary>
    [HttpDelete("{id}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> DeleteSession(string id, CancellationToken cancellationToken)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(id))
            {
                return BadRequest(ApiResponse<object>.Fail("Session ID is required"));
            }

            _logger.LogInformation("Deleting session {SessionId}", id);

            var deleted = await _sessionService.DeleteSessionAsync(id, cancellationToken);
            
            if (!deleted)
            {
                _logger.LogWarning("Session {SessionId} not found for deletion", id);
                return NotFound(ApiResponse<object>.Fail($"Session {id} not found"));
            }

            _logger.LogInformation("Session {SessionId} deleted successfully", id);
            return NoContent();
        }
        catch (OperationCanceledException)
        {
            _logger.LogWarning("DeleteSession request for {SessionId} was cancelled", id);
            return StatusCode(499, ApiResponse<object>.Fail("Request was cancelled"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting session {SessionId}", id);
            return StatusCode(StatusCodes.Status500InternalServerError, 
                ApiResponse<object>.Fail("An error occurred while deleting the session"));
        }
    }

    /// <summary>
    /// Get user's current active session
    /// </summary>
    [HttpGet("current/{userId}")]
    [ProducesResponseType(typeof(ApiResponse<Session>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> GetCurrentSession(string userId, CancellationToken cancellationToken)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(userId))
            {
                return BadRequest(ApiResponse<object>.Fail("User ID is required"));
            }

            _logger.LogDebug("Retrieving current session for user {UserId}", userId);

            var session = await _sessionService.GetCurrentSessionAsync(userId, cancellationToken);
            
            if (session == null)
            {
                _logger.LogDebug("No active session found for user {UserId}", userId);
                return NotFound(ApiResponse<object>.Fail($"No active session found for user {userId}"));
            }

            return Ok(ApiResponse<Session>.Ok(session, "Current session retrieved successfully"));
        }
        catch (OperationCanceledException)
        {
            _logger.LogWarning("GetCurrentSession request for user {UserId} was cancelled", userId);
            return StatusCode(499, ApiResponse<object>.Fail("Request was cancelled"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving current session for user {UserId}", userId);
            return StatusCode(StatusCodes.Status500InternalServerError, 
                ApiResponse<object>.Fail("An error occurred while retrieving the current session"));
        }
    }

    /// <summary>
    /// Add transcript segment to session
    /// </summary>
    [HttpPost("{sessionCode}/transcripts")]
    [ProducesResponseType(typeof(ApiResponse<TranscriptSegment>), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> AddTranscript(
        string sessionCode,
        [FromBody] AddTranscriptRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(sessionCode))
            {
                return BadRequest(ApiResponse<object>.Fail("Session code is required"));
            }

            if (request == null)
            {
                return BadRequest(ApiResponse<object>.Fail("Request body is required"));
            }

            if (!ModelState.IsValid)
            {
                _logger.LogWarning("Invalid model state for AddTranscript: {@ModelState}", ModelState);
                return BadRequest(ApiResponse<object>.Fail("Invalid request data"));
            }

            _logger.LogDebug("Adding transcript to session {SessionCode}", sessionCode);

            var segment = await _sessionService.AddTranscriptAsync(sessionCode, request, cancellationToken);
            
            if (segment == null)
            {
                _logger.LogWarning("Session {SessionCode} not found when adding transcript", sessionCode);
                return NotFound(ApiResponse<object>.Fail($"Session {sessionCode} not found"));
            }

            _logger.LogDebug("Transcript added successfully to session {SessionCode}", sessionCode);
            return CreatedAtAction(
                nameof(GetTranscripts),
                new { sessionCode },
                ApiResponse<TranscriptSegment>.Ok(segment, "Transcript added successfully")
            );
        }
        catch (OperationCanceledException)
        {
            _logger.LogWarning("AddTranscript request for {SessionCode} was cancelled", sessionCode);
            return StatusCode(499, ApiResponse<object>.Fail("Request was cancelled"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error adding transcript to session {SessionCode}", sessionCode);
            return StatusCode(StatusCodes.Status500InternalServerError, 
                ApiResponse<object>.Fail("An error occurred while adding the transcript"));
        }
    }

    /// <summary>
    /// Get all transcripts for a session
    /// </summary>
    [HttpGet("{sessionCode}/transcripts")]
    [ProducesResponseType(typeof(ApiResponse<List<TranscriptSegment>>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> GetTranscripts(string sessionCode, CancellationToken cancellationToken)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(sessionCode))
            {
                return BadRequest(ApiResponse<object>.Fail("Session code is required"));
            }

            _logger.LogDebug("Retrieving transcripts for session {SessionCode}", sessionCode);

            var transcripts = await _sessionService.GetTranscriptsAsync(sessionCode, cancellationToken);
            return Ok(ApiResponse<List<TranscriptSegment>>.Ok(transcripts, "Transcripts retrieved successfully"));
        }
        catch (OperationCanceledException)
        {
            _logger.LogWarning("GetTranscripts request for {SessionCode} was cancelled", sessionCode);
            return StatusCode(499, ApiResponse<object>.Fail("Request was cancelled"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving transcripts for session {SessionCode}", sessionCode);
            return StatusCode(StatusCodes.Status500InternalServerError, 
                ApiResponse<object>.Fail("An error occurred while retrieving transcripts"));
        }
    }

    /// <summary>
    /// Add scripture reference to session
    /// </summary>
    [HttpPost("{sessionCode}/scriptures")]
    [ProducesResponseType(typeof(ApiResponse<ScriptureReference>), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> AddScripture(
        string sessionCode,
        [FromBody] AddScriptureRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(sessionCode))
            {
                return BadRequest(ApiResponse<object>.Fail("Session code is required"));
            }

            if (request == null)
            {
                return BadRequest(ApiResponse<object>.Fail("Request body is required"));
            }

            if (!ModelState.IsValid)
            {
                _logger.LogWarning("Invalid model state for AddScripture: {@ModelState}", ModelState);
                return BadRequest(ApiResponse<object>.Fail("Invalid request data"));
            }

            _logger.LogDebug(
                "Adding scripture reference to session {SessionCode}: {Book} {Chapter}:{Verse}",
                sessionCode,
                request.Book,
                request.Chapter,
                request.Verse
            );

            var reference = await _sessionService.AddScriptureAsync(sessionCode, request, cancellationToken);
            
            if (reference == null)
            {
                _logger.LogWarning("Session {SessionCode} not found when adding scripture", sessionCode);
                return NotFound(ApiResponse<object>.Fail($"Session {sessionCode} not found"));
            }

            _logger.LogDebug("Scripture added successfully to session {SessionCode}", sessionCode);
            return CreatedAtAction(
                nameof(GetScriptures),
                new { sessionCode },
                ApiResponse<ScriptureReference>.Ok(reference, "Scripture added successfully")
            );
        }
        catch (OperationCanceledException)
        {
            _logger.LogWarning("AddScripture request for {SessionCode} was cancelled", sessionCode);
            return StatusCode(499, ApiResponse<object>.Fail("Request was cancelled"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error adding scripture to session {SessionCode}", sessionCode);
            return StatusCode(StatusCodes.Status500InternalServerError, 
                ApiResponse<object>.Fail("An error occurred while adding the scripture reference"));
        }
    }

    /// <summary>
    /// Get all scripture references for a session
    /// </summary>
    [HttpGet("{sessionCode}/scriptures")]
    [ProducesResponseType(typeof(ApiResponse<List<ScriptureReference>>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> GetScriptures(string sessionCode, CancellationToken cancellationToken)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(sessionCode))
            {
                return BadRequest(ApiResponse<object>.Fail("Session code is required"));
            }

            _logger.LogDebug("Retrieving scriptures for session {SessionCode}", sessionCode);

            var scriptures = await _sessionService.GetScripturesAsync(sessionCode, cancellationToken);
            return Ok(ApiResponse<List<ScriptureReference>>.Ok(scriptures, "Scriptures retrieved successfully"));
        }
        catch (OperationCanceledException)
        {
            _logger.LogWarning("GetScriptures request for {SessionCode} was cancelled", sessionCode);
            return StatusCode(499, ApiResponse<object>.Fail("Request was cancelled"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving scriptures for session {SessionCode}", sessionCode);
            return StatusCode(StatusCodes.Status500InternalServerError, 
                ApiResponse<object>.Fail("An error occurred while retrieving scripture references"));
        }
    }
}
