using HOPTranscribe.Constants;
using HOPTranscribe.Data;
using HOPTranscribe.Data.Entities;
using HOPTranscribe.Models;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace HOPTranscribe.Services;

/// <summary>
/// Database-backed implementation of ISessionService using EF Core
/// Provider-agnostic: works with SQLite, PostgreSQL, SQL Server, etc.
/// </summary>
public class DatabaseSessionService : ISessionService
{
    private readonly SessionDbContext _context;
    private readonly ILogger<DatabaseSessionService> _logger;
    private readonly IConfiguration _configuration;
    private readonly TimeSpan _expirationTime;

    public DatabaseSessionService(
        SessionDbContext context,
        ILogger<DatabaseSessionService> logger,
        IConfiguration configuration)
    {
        _context = context;
        _logger = logger;
        _configuration = configuration;
        
        var expirationDays = _configuration.GetValue<int>(
            ApiConstants.SessionStorage.ExpirationDaysConfigKey,
            ApiConstants.SessionStorage.DefaultExpirationDays);
        _expirationTime = TimeSpan.FromDays(expirationDays);

        _logger.LogInformation(
            "DatabaseSessionService initialized with {ExpirationDays}-day expiration",
            expirationDays);
    }

    public async Task<Session> CreateSessionAsync(CreateSessionRequest request, CancellationToken cancellationToken = default)
    {
        var sessionCode = GenerateSessionCode(request.UserName);
        var entity = new SessionEntity
        {
            Id = $"session-{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}",
            SessionCode = sessionCode,
            UserName = request.UserName,
            Title = request.Title,
            StartedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            Status = SessionStatus.New,
            IsReadonly = false,
            IsRecording = false,
            IsPaused = false,
            Duration = 0,
            ActiveDuration = 0,
            Metadata = request.Metadata != null ? JsonSerializer.Serialize(request.Metadata) : null
        };

        _context.Sessions.Add(entity);
        await _context.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Created session {SessionCode} for user {UserName}", sessionCode, request.UserName);

        return ToModel(entity);
    }

    public async Task<Session?> GetSessionAsync(string sessionCode, CancellationToken cancellationToken = default)
    {
        var entity = await _context.Sessions
            .Include(s => s.Transcripts.OrderBy(t => t.Timestamp))
            .Include(s => s.ScriptureReferences)
            .FirstOrDefaultAsync(s => s.SessionCode == sessionCode, cancellationToken);

        if (entity == null)
            return null;

        // Clean up expired sessions
        if (entity.UpdatedAt.Add(_expirationTime) < DateTime.UtcNow)
        {
            _context.Sessions.Remove(entity);
            await _context.SaveChangesAsync(cancellationToken);
            return null;
        }

        return ToModel(entity);
    }

    public async Task<PaginatedResult<Session>> GetSessionsAsync(
        SessionQueryParams queryParams,
        CancellationToken cancellationToken = default)
    {
        var query = _context.Sessions
            .Include(s => s.Transcripts)
            .Include(s => s.ScriptureReferences)
            .AsQueryable();

        // Apply filters
        if (!string.IsNullOrEmpty(queryParams.UserName))
            query = query.Where(s => s.UserName == queryParams.UserName);

        if (queryParams.Status.HasValue)
            query = query.Where(s => s.Status == queryParams.Status.Value);

        if (queryParams.StartDate.HasValue)
            query = query.Where(s => s.StartedAt >= queryParams.StartDate.Value);

        if (queryParams.EndDate.HasValue)
            query = query.Where(s => s.StartedAt <= queryParams.EndDate.Value);

        if (!string.IsNullOrEmpty(queryParams.SearchTerm))
            query = query.Where(s => EF.Functions.Like(s.Title, $"%{queryParams.SearchTerm}%"));

        // Clean up expired sessions
        var cutoffDate = DateTime.UtcNow.Subtract(_expirationTime);
        query = query.Where(s => s.UpdatedAt >= cutoffDate);

        // Apply sorting
        query = queryParams.SortBy?.ToLower() switch
        {
            "title" => queryParams.SortDescending
                ? query.OrderByDescending(s => s.Title)
                : query.OrderBy(s => s.Title),
            "duration" => queryParams.SortDescending
                ? query.OrderByDescending(s => s.Duration)
                : query.OrderBy(s => s.Duration),
            _ => queryParams.SortDescending
                ? query.OrderByDescending(s => s.StartedAt)
                : query.OrderBy(s => s.StartedAt)
        };

        var totalCount = await query.CountAsync(cancellationToken);
        var entities = await query
            .Skip(queryParams.Skip)
            .Take(queryParams.PageSize)
            .ToListAsync(cancellationToken);

        return new PaginatedResult<Session>
        {
            Items = entities.Select(ToModel).ToList(),
            TotalCount = totalCount,
            PageNumber = queryParams.PageNumber,
            PageSize = queryParams.PageSize
        };
    }

    public async Task<Session?> UpdateSessionAsync(
        string sessionCode,
        UpdateSessionRequest request,
        CancellationToken cancellationToken = default)
    {
        var entity = await _context.Sessions
            .Include(s => s.Transcripts)
            .Include(s => s.ScriptureReferences)
            .FirstOrDefaultAsync(s => s.SessionCode == sessionCode, cancellationToken);

        if (entity == null)
            return null;

        if (!string.IsNullOrEmpty(request.Title))
            entity.Title = request.Title;

        if (request.Status.HasValue)
            entity.Status = request.Status.Value;

        if (request.IsRecording.HasValue)
            entity.IsRecording = request.IsRecording.Value;

        if (request.IsPaused.HasValue)
            entity.IsPaused = request.IsPaused.Value;

        if (request.Metadata != null)
            entity.Metadata = JsonSerializer.Serialize(request.Metadata);

        entity.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);

        return ToModel(entity);
    }

    public async Task<bool> DeleteSessionAsync(string id, CancellationToken cancellationToken = default)
    {
        var entity = await _context.Sessions
            .FirstOrDefaultAsync(s => s.Id == id, cancellationToken);

        if (entity == null)
            return false;

        _context.Sessions.Remove(entity);
        await _context.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Deleted session {SessionCode}", entity.SessionCode);
        return true;
    }

    public async Task<Session?> EndSessionAsync(string sessionCode, CancellationToken cancellationToken = default)
    {
        var entity = await _context.Sessions
            .Include(s => s.Transcripts)
            .Include(s => s.ScriptureReferences)
            .FirstOrDefaultAsync(s => s.SessionCode == sessionCode, cancellationToken);

        if (entity == null)
            return null;

        entity.Status = SessionStatus.Ended;
        entity.EndedAt = DateTime.UtcNow;
        entity.UpdatedAt = DateTime.UtcNow;
        entity.IsRecording = false;
        entity.IsPaused = false;
        entity.IsReadonly = true;

        await _context.SaveChangesAsync(cancellationToken);

        return ToModel(entity);
    }

    public async Task<Session?> GetCurrentSessionAsync(string userId, CancellationToken cancellationToken = default)
    {
        var entity = await _context.Sessions
            .Include(s => s.Transcripts)
            .Include(s => s.ScriptureReferences)
            .Where(s => s.UserName == userId && s.Status == SessionStatus.Active)
            .OrderByDescending(s => s.StartedAt)
            .FirstOrDefaultAsync(cancellationToken);

        return entity != null ? ToModel(entity) : null;
    }

    public async Task<TranscriptSegment?> AddTranscriptAsync(
        string sessionCode,
        AddTranscriptRequest request,
        CancellationToken cancellationToken = default)
    {
        var session = await _context.Sessions
            .FirstOrDefaultAsync(s => s.SessionCode == sessionCode, cancellationToken);

        if (session == null)
            return null;

        var entity = new TranscriptSegmentEntity
        {
            Id = $"seg-{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}",
            Text = request.Text,
            Timestamp = DateTime.UtcNow,
            Confidence = request.Confidence,
            SessionCode = sessionCode
        };

        _context.TranscriptSegments.Add(entity);
        session.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(cancellationToken);

        return new TranscriptSegment
        {
            Id = entity.Id,
            Text = entity.Text,
            Timestamp = entity.Timestamp,
            Confidence = entity.Confidence
        };
    }

    public async Task<List<TranscriptSegment>> GetTranscriptsAsync(
        string sessionCode,
        CancellationToken cancellationToken = default)
    {
        var entities = await _context.TranscriptSegments
            .Where(t => t.SessionCode == sessionCode)
            .OrderBy(t => t.Timestamp)
            .ToListAsync(cancellationToken);

        return entities.Select(e => new TranscriptSegment
        {
            Id = e.Id,
            Text = e.Text,
            Timestamp = e.Timestamp,
            Confidence = e.Confidence
        }).ToList();
    }

    public async Task<ScriptureReference?> AddScriptureAsync(
        string sessionCode,
        AddScriptureRequest request,
        CancellationToken cancellationToken = default)
    {
        var session = await _context.Sessions
            .FirstOrDefaultAsync(s => s.SessionCode == sessionCode, cancellationToken);

        if (session == null)
            return null;

        var entity = new ScriptureReferenceEntity
        {
            Id = $"ref-{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}",
            Book = request.Book,
            Chapter = request.Chapter,
            Verse = request.Verse,
            Version = request.Version,
            Text = request.Text,
            Confidence = request.Confidence,
            TranscriptSegmentId = request.TranscriptSegmentId,
            SessionCode = sessionCode
        };

        _context.ScriptureReferences.Add(entity);
        session.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(cancellationToken);

        return new ScriptureReference
        {
            Id = entity.Id,
            Book = entity.Book,
            Chapter = entity.Chapter,
            Verse = entity.Verse,
            Version = entity.Version,
            Text = entity.Text,
            Confidence = entity.Confidence,
            TranscriptSegmentId = entity.TranscriptSegmentId
        };
    }

    public async Task<List<ScriptureReference>> GetScripturesAsync(
        string sessionCode,
        CancellationToken cancellationToken = default)
    {
        var entities = await _context.ScriptureReferences
            .Where(r => r.SessionCode == sessionCode)
            .ToListAsync(cancellationToken);

        return entities.Select(e => new ScriptureReference
        {
            Id = e.Id,
            Book = e.Book,
            Chapter = e.Chapter,
            Verse = e.Verse,
            Version = e.Version,
            Text = e.Text,
            Confidence = e.Confidence,
            TranscriptSegmentId = e.TranscriptSegmentId
        }).ToList();
    }

    private static string GenerateSessionCode(string userName)
    {
        const string chars = "abcdefghijklmnopqrstuvwxyz0123456789";
        var random = new Random();
        var code = new string(Enumerable.Range(0, 4)
            .Select(_ => chars[random.Next(chars.Length)])
            .ToArray());

        var sanitizedUsername = new string(userName.ToLower()
            .Where(c => char.IsLetterOrDigit(c))
            .ToArray());

        return $"{code}-{sanitizedUsername}";
    }

    private static Session ToModel(SessionEntity entity)
    {
        return new Session
        {
            Id = entity.Id,
            SessionCode = entity.SessionCode,
            UserName = entity.UserName,
            Title = entity.Title,
            StartedAt = entity.StartedAt,
            EndedAt = entity.EndedAt,
            UpdatedAt = entity.UpdatedAt,
            Status = entity.Status,
            IsReadonly = entity.IsReadonly,
            IsRecording = entity.IsRecording,
            IsPaused = entity.IsPaused,
            Duration = entity.Duration,
            ActiveDuration = entity.ActiveDuration,
            Metadata = !string.IsNullOrEmpty(entity.Metadata)
                ? JsonSerializer.Deserialize<SessionMetadata>(entity.Metadata)
                : null,
            Transcripts = entity.Transcripts?.Select(t => new TranscriptSegment
            {
                Id = t.Id,
                Text = t.Text,
                Timestamp = t.Timestamp,
                Confidence = t.Confidence
            }).ToList() ?? new List<TranscriptSegment>(),
            ScriptureReferences = entity.ScriptureReferences?.Select(r => new ScriptureReference
            {
                Id = r.Id,
                Book = r.Book,
                Chapter = r.Chapter,
                Verse = r.Verse,
                Version = r.Version,
                Text = r.Text,
                Confidence = r.Confidence,
                TranscriptSegmentId = r.TranscriptSegmentId
            }).ToList() ?? new List<ScriptureReference>()
        };
    }
}
