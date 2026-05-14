using System.Security.Cryptography;
using HOPTranscribe.Api.Data;
using HOPTranscribe.Api.Data.Entities;
using HOPTranscribe.Api.Models.Common;
using HOPTranscribe.Api.Models.Sessions;
using Microsoft.EntityFrameworkCore;

namespace HOPTranscribe.Api.Services.Sessions;

public class SqliteSessionService : ISessionService
{
    private const string CodeAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private const int CodeLength = 6;

    private readonly HopDbContext _db;
    private readonly ILogger<SqliteSessionService> _logger;

    public SqliteSessionService(HopDbContext db, ILogger<SqliteSessionService> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task<SessionDto> CreateAsync(string ownerUsername, CreateSessionRequest request, CancellationToken ct = default)
    {
        var code = await GenerateUniqueCodeAsync(ct);
        var entity = new SessionEntity
        {
            Code = code,
            Title = request.Title.Trim(),
            OwnerUsername = ownerUsername,
            Language = string.IsNullOrWhiteSpace(request.Language) ? "en" : request.Language,
            Status = "active",
            CreatedAt = DateTimeOffset.UtcNow,
        };

        _db.Sessions.Add(entity);
        await _db.SaveChangesAsync(ct);
        _logger.LogInformation("Session created. Code={Code} Owner={Owner}", code, ownerUsername);
        return ToDto(entity, 0);
    }

    public async Task<SessionDto?> GetByCodeAsync(string code, CancellationToken ct = default)
    {
        var session = await _db.Sessions
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.Code == code, ct);
        if (session is null) return null;
        var count = await _db.TranscriptSegments.CountAsync(t => t.SessionId == session.Id, ct);
        return ToDto(session, count);
    }

    public async Task<SessionEntity?> GetEntityByCodeAsync(string code, CancellationToken ct = default)
    {
        return await _db.Sessions.FirstOrDefaultAsync(s => s.Code == code, ct);
    }

    public async Task<PaginatedResult<SessionDto>> ListForUserAsync(string username, int page, int pageSize, CancellationToken ct = default)
    {
        page = Math.Max(page, 1);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = _db.Sessions
            .AsNoTracking()
            .Where(s => s.OwnerUsername == username)
            .OrderByDescending(s => s.CreatedAt);

        var total = await query.CountAsync(ct);
        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(s => new SessionDto
            {
                Id = s.Id,
                Code = s.Code,
                Title = s.Title,
                OwnerUsername = s.OwnerUsername,
                Status = s.Status,
                Language = s.Language,
                CreatedAt = s.CreatedAt,
                EndedAt = s.EndedAt,
                SegmentCount = s.Segments.Count,
            })
            .ToListAsync(ct);

        return new PaginatedResult<SessionDto>
        {
            Items = items,
            Page = page,
            PageSize = pageSize,
            TotalCount = total,
        };
    }

    public async Task<SessionDto?> EndAsync(string code, string requestingUsername, CancellationToken ct = default)
    {
        var session = await _db.Sessions.FirstOrDefaultAsync(s => s.Code == code, ct);
        if (session is null) return null;
        if (!string.Equals(session.OwnerUsername, requestingUsername, StringComparison.OrdinalIgnoreCase))
            throw new UnauthorizedAccessException("Only the session owner can end the session.");

        session.Status = "ended";
        session.EndedAt = DateTimeOffset.UtcNow;
        await _db.SaveChangesAsync(ct);
        var count = await _db.TranscriptSegments.CountAsync(t => t.SessionId == session.Id, ct);
        return ToDto(session, count);
    }

    public async Task<bool> DeleteAsync(string code, string requestingUsername, CancellationToken ct = default)
    {
        var session = await _db.Sessions.FirstOrDefaultAsync(s => s.Code == code, ct);
        if (session is null) return false;
        if (!string.Equals(session.OwnerUsername, requestingUsername, StringComparison.OrdinalIgnoreCase))
            throw new UnauthorizedAccessException("Only the session owner can delete the session.");

        _db.Sessions.Remove(session);
        await _db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<TranscriptSegmentDto> AppendSegmentAsync(string code, AppendTranscriptRequest request, IEnumerable<ScriptureMatchDto>? matches, CancellationToken ct = default)
    {
        var session = await _db.Sessions.FirstOrDefaultAsync(s => s.Code == code, ct)
            ?? throw new KeyNotFoundException($"Session '{code}' not found.");

        var segment = new TranscriptSegmentEntity
        {
            SessionId = session.Id,
            Text = request.Text,
            StartedAt = request.StartedAt,
            EndedAt = request.EndedAt,
        };

        if (matches is not null)
        {
            int rank = 0;
            foreach (var m in matches)
            {
                segment.Matches.Add(new ScriptureMatchEntity
                {
                    Reference = m.Reference,
                    Book = m.Book,
                    Chapter = m.Chapter,
                    VerseStart = m.VerseStart,
                    VerseEnd = m.VerseEnd,
                    Version = m.Version,
                    Quote = m.Quote,
                    Confidence = m.Confidence,
                    Rank = rank++,
                });
            }
        }

        _db.TranscriptSegments.Add(segment);
        await _db.SaveChangesAsync(ct);

        return new TranscriptSegmentDto
        {
            Id = segment.Id,
            Text = segment.Text,
            StartedAt = segment.StartedAt,
            EndedAt = segment.EndedAt,
            Matches = segment.Matches
                .OrderBy(m => m.Rank)
                .Select(MapMatch)
                .ToList(),
        };
    }

    public async Task<List<TranscriptSegmentDto>> ListSegmentsAsync(string code, CancellationToken ct = default)
    {
        var session = await _db.Sessions.AsNoTracking().FirstOrDefaultAsync(s => s.Code == code, ct);
        if (session is null) return new List<TranscriptSegmentDto>();

        return await _db.TranscriptSegments
            .AsNoTracking()
            .Where(t => t.SessionId == session.Id)
            .OrderBy(t => t.StartedAt)
            .Select(t => new TranscriptSegmentDto
            {
                Id = t.Id,
                Text = t.Text,
                StartedAt = t.StartedAt,
                EndedAt = t.EndedAt,
                Matches = t.Matches.OrderBy(m => m.Rank).Select(m => new ScriptureMatchDto
                {
                    Id = m.Id,
                    Reference = m.Reference,
                    Book = m.Book,
                    Chapter = m.Chapter,
                    VerseStart = m.VerseStart,
                    VerseEnd = m.VerseEnd,
                    Version = m.Version,
                    Quote = m.Quote,
                    Confidence = m.Confidence,
                    Rank = m.Rank,
                }).ToList(),
            })
            .ToListAsync(ct);
    }

    private async Task<string> GenerateUniqueCodeAsync(CancellationToken ct)
    {
        for (int attempt = 0; attempt < 8; attempt++)
        {
            var code = GenerateCode();
            var exists = await _db.Sessions.AnyAsync(s => s.Code == code, ct);
            if (!exists) return code;
        }
        throw new InvalidOperationException("Failed to generate a unique session code after multiple attempts.");
    }

    private static string GenerateCode()
    {
        Span<byte> buf = stackalloc byte[CodeLength];
        RandomNumberGenerator.Fill(buf);
        var chars = new char[CodeLength];
        for (int i = 0; i < CodeLength; i++)
        {
            chars[i] = CodeAlphabet[buf[i] % CodeAlphabet.Length];
        }
        return new string(chars);
    }

    private static SessionDto ToDto(SessionEntity e, int segmentCount) => new()
    {
        Id = e.Id,
        Code = e.Code,
        Title = e.Title,
        OwnerUsername = e.OwnerUsername,
        Status = e.Status,
        Language = e.Language,
        CreatedAt = e.CreatedAt,
        EndedAt = e.EndedAt,
        SegmentCount = segmentCount,
    };

    private static ScriptureMatchDto MapMatch(ScriptureMatchEntity m) => new()
    {
        Id = m.Id,
        Reference = m.Reference,
        Book = m.Book,
        Chapter = m.Chapter,
        VerseStart = m.VerseStart,
        VerseEnd = m.VerseEnd,
        Version = m.Version,
        Quote = m.Quote,
        Confidence = m.Confidence,
        Rank = m.Rank,
    };
}
