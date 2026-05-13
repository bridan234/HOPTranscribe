using HOPTranscribe.Models;

namespace HOPTranscribe.Services;

public interface ISessionService
{
    Task<Session> CreateSessionAsync(CreateSessionRequest request, CancellationToken cancellationToken = default);
    Task<Session?> GetSessionAsync(string sessionCode, CancellationToken cancellationToken = default);
    Task<PaginatedResult<Session>> GetSessionsAsync(SessionQueryParams queryParams, CancellationToken cancellationToken = default);
    Task<Session?> UpdateSessionAsync(string sessionCode, UpdateSessionRequest request, CancellationToken cancellationToken = default);
    Task<bool> DeleteSessionAsync(string id, CancellationToken cancellationToken = default);
    Task<Session?> EndSessionAsync(string sessionCode, CancellationToken cancellationToken = default);
    Task<Session?> GetCurrentSessionAsync(string userId, CancellationToken cancellationToken = default);
    
    // Transcript operations
    Task<TranscriptSegment?> AddTranscriptAsync(string sessionCode, AddTranscriptRequest request, CancellationToken cancellationToken = default);
    Task<List<TranscriptSegment>> GetTranscriptsAsync(string sessionCode, CancellationToken cancellationToken = default);
    
    // Scripture operations
    Task<ScriptureReference?> AddScriptureAsync(string sessionCode, AddScriptureRequest request, CancellationToken cancellationToken = default);
    Task<List<ScriptureReference>> GetScripturesAsync(string sessionCode, CancellationToken cancellationToken = default);
}
