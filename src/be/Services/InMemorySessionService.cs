using HOPTranscribe.Models;
using HOPTranscribe.Constants;
using Microsoft.Extensions.Caching.Memory;

namespace HOPTranscribe.Services;

/// <summary>
/// In-memory implementation of ISessionService with automatic expiration using IMemoryCache
/// Replace with database implementation later
/// </summary>
public class InMemorySessionService : ISessionService
{
    private readonly IMemoryCache _cache;
    private readonly ILogger<InMemorySessionService> _logger;
    private readonly IConfiguration _configuration;
    private readonly TimeSpan _expirationTime;
    private const string SessionListKey = "session-list";

    public InMemorySessionService(
        IMemoryCache cache,
        ILogger<InMemorySessionService> logger,
        IConfiguration configuration)
    {
        _cache = cache;
        _logger = logger;
        _configuration = configuration;
        
        var expirationDays = _configuration.GetValue<int>(
            ApiConstants.SessionStorage.ExpirationDaysConfigKey, 
            ApiConstants.SessionStorage.DefaultExpirationDays);
        _expirationTime = TimeSpan.FromDays(expirationDays);

        _logger.LogInformation(
            "InMemorySessionService initialized with {ExpirationDays}-day expiration", 
            expirationDays);
    }

    public Task<Session> CreateSessionAsync(CreateSessionRequest request, CancellationToken cancellationToken = default)
    {
        var sessionCode = GenerateSessionCode(request.UserName);
        var session = new Session
        {
            Id = $"session-{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}",
            SessionCode = sessionCode,
            UserName = request.UserName,
            Title = request.Title,
            StartedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            Status = SessionStatus.Active,
            IsReadonly = false,
            IsRecording = false,
            IsPaused = false,
            Duration = 0,
            ActiveDuration = 0,
            Metadata = request.Metadata
        };

        // Store with sliding expiration
        var cacheOptions = new MemoryCacheEntryOptions()
            .SetSlidingExpiration(_expirationTime);

        _cache.Set(GetSessionKey(sessionCode), session, cacheOptions);
        AddToSessionList(sessionCode);
        
        _logger.LogInformation("Created session {SessionCode} for user {UserName}", sessionCode, request.UserName);
        
        return Task.FromResult(session);
    }

    public Task<Session?> GetSessionAsync(string sessionCode, CancellationToken cancellationToken = default)
    {
        var session = _cache.Get<Session>(GetSessionKey(sessionCode));
        return Task.FromResult(session);
    }

    public Task<PaginatedResult<Session>> GetSessionsAsync(SessionQueryParams queryParams, CancellationToken cancellationToken = default)
    {
        var sessionCodes = GetSessionList();
        var sessions = sessionCodes
            .Select(code => _cache.Get<Session>(GetSessionKey(code)))
            .Where(s => s != null)
            .ToList();

        var query = sessions.AsEnumerable();

        // Apply filters
        if (!string.IsNullOrEmpty(queryParams.UserName))
            query = query.Where(s => s.UserName.Equals(queryParams.UserName, StringComparison.OrdinalIgnoreCase));

        if (queryParams.Status.HasValue)
            query = query.Where(s => s.Status == queryParams.Status.Value);

        if (queryParams.StartDate.HasValue)
            query = query.Where(s => s.StartedAt >= queryParams.StartDate.Value);

        if (queryParams.EndDate.HasValue)
            query = query.Where(s => s.StartedAt <= queryParams.EndDate.Value);

        if (!string.IsNullOrEmpty(queryParams.SearchTerm))
            query = query.Where(s => s.Title.Contains(queryParams.SearchTerm, StringComparison.OrdinalIgnoreCase));

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

        var totalCount = query.Count();
        var items = query.Skip(queryParams.Skip).Take(queryParams.PageSize).ToList();

        return Task.FromResult(new PaginatedResult<Session>
        {
            Items = items,
            TotalCount = totalCount,
            PageNumber = queryParams.PageNumber,
            PageSize = queryParams.PageSize
        });
    }

    public Task<Session?> UpdateSessionAsync(string sessionCode, UpdateSessionRequest request, CancellationToken cancellationToken = default)
    {
        var session = _cache.Get<Session>(GetSessionKey(sessionCode));
        if (session == null)
            return Task.FromResult<Session?>(null);

        if (!string.IsNullOrEmpty(request.Title))
            session.Title = request.Title;

        if (request.Status.HasValue)
            session.Status = request.Status.Value;

        if (request.IsRecording.HasValue)
            session.IsRecording = request.IsRecording.Value;

        if (request.IsPaused.HasValue)
            session.IsPaused = request.IsPaused.Value;

        if (request.Metadata != null)
            session.Metadata = request.Metadata;

        session.UpdatedAt = DateTime.UtcNow;

        // Update cache with sliding expiration
        var cacheOptions = new MemoryCacheEntryOptions()
            .SetSlidingExpiration(_expirationTime);
        _cache.Set(GetSessionKey(sessionCode), session, cacheOptions);

        return Task.FromResult<Session?>(session);
    }

    public Task<bool> DeleteSessionAsync(string id, CancellationToken cancellationToken = default)
    {
        var sessionCodes = GetSessionList();
        var session = sessionCodes
            .Select(code => _cache.Get<Session>(GetSessionKey(code)))
            .FirstOrDefault(s => s?.Id == id);
        
        if (session == null)
            return Task.FromResult(false);

        _cache.Remove(GetSessionKey(session.SessionCode));
        RemoveFromSessionList(session.SessionCode);
        _logger.LogInformation("Deleted session {SessionCode}", session.SessionCode);
        return Task.FromResult(true);
    }

    public Task<Session?> EndSessionAsync(string sessionCode, CancellationToken cancellationToken = default)
    {
        var session = _cache.Get<Session>(GetSessionKey(sessionCode));
        if (session == null)
            return Task.FromResult<Session?>(null);

        session.Status = SessionStatus.Ended;
        session.EndedAt = DateTime.UtcNow;
        session.UpdatedAt = DateTime.UtcNow;
        session.IsRecording = false;
        session.IsPaused = false;
        session.IsReadonly = true;

        // Update cache with sliding expiration
        var cacheOptions = new MemoryCacheEntryOptions()
            .SetSlidingExpiration(_expirationTime);
        _cache.Set(GetSessionKey(sessionCode), session, cacheOptions);

        return Task.FromResult<Session?>(session);
    }

    public Task<Session?> GetCurrentSessionAsync(string userId, CancellationToken cancellationToken = default)
    {
        var sessionCodes = GetSessionList();
        var session = sessionCodes
            .Select(code => _cache.Get<Session>(GetSessionKey(code)))
            .Where(s => s != null && s.UserName == userId && s.Status == SessionStatus.Active)
            .OrderByDescending(s => s!.StartedAt)
            .FirstOrDefault();

        return Task.FromResult(session);
    }

    public Task<TranscriptSegment?> AddTranscriptAsync(string sessionCode, AddTranscriptRequest request, CancellationToken cancellationToken = default)
    {
        var session = _cache.Get<Session>(GetSessionKey(sessionCode));
        if (session == null)
            return Task.FromResult<TranscriptSegment?>(null);

        var segment = new TranscriptSegment
        {
            Id = $"seg-{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}",
            Text = request.Text,
            Timestamp = DateTime.UtcNow,
            Confidence = request.Confidence
        };

        session.Transcripts.Add(segment);
        session.UpdatedAt = DateTime.UtcNow;

        // Update cache with sliding expiration
        var cacheOptions = new MemoryCacheEntryOptions()
            .SetSlidingExpiration(_expirationTime);
        _cache.Set(GetSessionKey(sessionCode), session, cacheOptions);

        return Task.FromResult<TranscriptSegment?>(segment);
    }

    public Task<List<TranscriptSegment>> GetTranscriptsAsync(string sessionCode, CancellationToken cancellationToken = default)
    {
        var session = _cache.Get<Session>(GetSessionKey(sessionCode));
        if (session == null)
            return Task.FromResult(new List<TranscriptSegment>());

        return Task.FromResult(session.Transcripts);
    }

    public Task<ScriptureReference?> AddScriptureAsync(string sessionCode, AddScriptureRequest request, CancellationToken cancellationToken = default)
    {
        var session = _cache.Get<Session>(GetSessionKey(sessionCode));
        if (session == null)
            return Task.FromResult<ScriptureReference?>(null);

        var reference = new ScriptureReference
        {
            Id = $"ref-{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}",
            Book = request.Book,
            Chapter = request.Chapter,
            Verse = request.Verse,
            Version = request.Version,
            Text = request.Text,
            Confidence = request.Confidence,
            TranscriptSegmentId = request.TranscriptSegmentId
        };

        session.ScriptureReferences.Add(reference);
        session.UpdatedAt = DateTime.UtcNow;

        // Update cache with sliding expiration
        var cacheOptions = new MemoryCacheEntryOptions()
            .SetSlidingExpiration(_expirationTime);
        _cache.Set(GetSessionKey(sessionCode), session, cacheOptions);

        return Task.FromResult<ScriptureReference?>(reference);
    }

    public Task<List<ScriptureReference>> GetScripturesAsync(string sessionCode, CancellationToken cancellationToken = default)
    {
        var session = _cache.Get<Session>(GetSessionKey(sessionCode));
        if (session == null)
            return Task.FromResult(new List<ScriptureReference>());

        return Task.FromResult(session.ScriptureReferences);
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

    private static string GetSessionKey(string sessionCode) => $"session:{sessionCode}";

    private List<string> GetSessionList()
    {
        return _cache.GetOrCreate(SessionListKey, entry =>
        {
            entry.SetPriority(CacheItemPriority.NeverRemove);
            return new List<string>();
        }) ?? new List<string>();
    }

    private void AddToSessionList(string sessionCode)
    {
        var list = GetSessionList();
        if (!list.Contains(sessionCode))
        {
            list.Add(sessionCode);
            _cache.Set(SessionListKey, list, new MemoryCacheEntryOptions()
                .SetPriority(CacheItemPriority.NeverRemove));
        }
    }

    private void RemoveFromSessionList(string sessionCode)
    {
        var list = GetSessionList();
        if (list.Remove(sessionCode))
        {
            _cache.Set(SessionListKey, list, new MemoryCacheEntryOptions()
                .SetPriority(CacheItemPriority.NeverRemove));
        }
    }
}
