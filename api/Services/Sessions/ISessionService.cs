using HOPTranscribe.Api.Data.Entities;
using HOPTranscribe.Api.Models.Common;
using HOPTranscribe.Api.Models.Sessions;

namespace HOPTranscribe.Api.Services.Sessions;

public interface ISessionService
{
    Task<SessionDto> CreateAsync(string ownerUsername, CreateSessionRequest request, CancellationToken ct = default);
    Task<SessionDto?> GetByCodeAsync(string code, CancellationToken ct = default);
    Task<SessionEntity?> GetEntityByCodeAsync(string code, CancellationToken ct = default);
    Task<PaginatedResult<SessionDto>> ListForUserAsync(string username, int page, int pageSize, CancellationToken ct = default);
    Task<SessionDto?> EndAsync(string code, string requestingUsername, CancellationToken ct = default);
    Task<bool> DeleteAsync(string code, string requestingUsername, CancellationToken ct = default);
    Task<TranscriptSegmentDto> AppendSegmentAsync(string code, AppendTranscriptRequest request, IEnumerable<ScriptureMatchDto>? matches, CancellationToken ct = default);
    Task<List<TranscriptSegmentDto>> ListSegmentsAsync(string code, CancellationToken ct = default);
}
