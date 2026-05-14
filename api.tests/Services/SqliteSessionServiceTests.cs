using HOPTranscribe.Api.Data;
using HOPTranscribe.Api.Models.Sessions;
using HOPTranscribe.Api.Services.Sessions;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

namespace HOPTranscribe.Api.Tests.Services;

/// <summary>
/// Integration tests against an in-memory SQLite database. The shared
/// <see cref="SqliteConnection"/> is the canonical way to use ":memory:" with
/// EF Core — closing the connection drops the data.
/// </summary>
public class SqliteSessionServiceTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly DbContextOptions<HopDbContext> _options;

    public SqliteSessionServiceTests()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();

        _options = new DbContextOptionsBuilder<HopDbContext>()
            .UseSqlite(_connection)
            .Options;

        using var db = new HopDbContext(_options);
        db.Database.EnsureCreated();
    }

    private HopDbContext NewContext() => new(_options);

    private SqliteSessionService NewService(HopDbContext db) =>
        new(db, NullLogger<SqliteSessionService>.Instance);

    public void Dispose() => _connection.Dispose();

    [Fact]
    public async Task CreateAsync_Persists_Session_And_Returns_Dto()
    {
        await using var db = NewContext();
        var svc = NewService(db);

        var dto = await svc.CreateAsync("alice", new CreateSessionRequest { Title = "Sunday Service" });

        dto.Code.Should().NotBeNullOrEmpty();
        dto.Code.Should().HaveLength(6);
        dto.Title.Should().Be("Sunday Service");
        dto.OwnerUsername.Should().Be("alice");
        dto.Status.Should().Be("active");
        dto.Language.Should().Be("en");
        dto.SegmentCount.Should().Be(0);

        var persisted = await db.Sessions.SingleAsync();
        persisted.Code.Should().Be(dto.Code);
    }

    [Fact]
    public async Task CreateAsync_Generates_Unique_Codes_Across_Calls()
    {
        await using var db = NewContext();
        var svc = NewService(db);

        var codes = new HashSet<string>();
        for (int i = 0; i < 25; i++)
        {
            var dto = await svc.CreateAsync("alice", new CreateSessionRequest { Title = $"Session {i}" });
            codes.Add(dto.Code).Should().BeTrue($"code {dto.Code} should not duplicate");
        }

        codes.Should().HaveCount(25);
    }

    [Fact]
    public async Task CreateAsync_Trims_Title_And_Defaults_Language_When_Empty()
    {
        await using var db = NewContext();
        var svc = NewService(db);

        var dto = await svc.CreateAsync("alice", new CreateSessionRequest
        {
            Title = "  Test Service  ",
            Language = "",
        });

        dto.Title.Should().Be("Test Service");
        dto.Language.Should().Be("en");
    }

    [Fact]
    public async Task GetByCodeAsync_Returns_Null_For_Missing_Session()
    {
        await using var db = NewContext();
        var svc = NewService(db);

        var dto = await svc.GetByCodeAsync("NOPE12");
        dto.Should().BeNull();
    }

    [Fact]
    public async Task GetByCodeAsync_Returns_Session_With_Segment_Count()
    {
        await using var db = NewContext();
        var svc = NewService(db);

        var created = await svc.CreateAsync("alice", new CreateSessionRequest { Title = "Service" });
        await svc.AppendSegmentAsync(created.Code, new AppendTranscriptRequest { Text = "first" }, null);
        await svc.AppendSegmentAsync(created.Code, new AppendTranscriptRequest { Text = "second" }, null);

        var dto = await svc.GetByCodeAsync(created.Code);
        dto.Should().NotBeNull();
        dto!.SegmentCount.Should().Be(2);
    }

    [Fact]
    public async Task ListForUserAsync_Returns_Only_Sessions_For_The_User_Ordered_By_Most_Recent()
    {
        await using var db = NewContext();
        var svc = NewService(db);

        var first = await svc.CreateAsync("alice", new CreateSessionRequest { Title = "First" });
        // Ensure ordering is deterministic by spacing CreatedAt
        await Task.Delay(10);
        var second = await svc.CreateAsync("alice", new CreateSessionRequest { Title = "Second" });
        await Task.Delay(10);
        var third = await svc.CreateAsync("alice", new CreateSessionRequest { Title = "Third" });
        await svc.CreateAsync("bob", new CreateSessionRequest { Title = "Bob's only session" });

        var result = await svc.ListForUserAsync("alice", page: 1, pageSize: 10);

        result.TotalCount.Should().Be(3);
        result.Items.Should().HaveCount(3);
        result.Items[0].Code.Should().Be(third.Code);
        result.Items[1].Code.Should().Be(second.Code);
        result.Items[2].Code.Should().Be(first.Code);
    }

    [Fact]
    public async Task ListForUserAsync_Paginates_Correctly()
    {
        await using var db = NewContext();
        var svc = NewService(db);

        for (int i = 0; i < 7; i++)
        {
            await svc.CreateAsync("alice", new CreateSessionRequest { Title = $"S{i}" });
            await Task.Delay(2);
        }

        var page1 = await svc.ListForUserAsync("alice", page: 1, pageSize: 3);
        var page2 = await svc.ListForUserAsync("alice", page: 2, pageSize: 3);
        var page3 = await svc.ListForUserAsync("alice", page: 3, pageSize: 3);

        page1.TotalCount.Should().Be(7);
        page1.Items.Should().HaveCount(3);
        page2.Items.Should().HaveCount(3);
        page3.Items.Should().HaveCount(1);
    }

    [Fact]
    public async Task ListForUserAsync_Clamps_PageSize_To_Range()
    {
        await using var db = NewContext();
        var svc = NewService(db);
        await svc.CreateAsync("alice", new CreateSessionRequest { Title = "S" });

        var negative = await svc.ListForUserAsync("alice", page: -5, pageSize: 0);
        negative.Page.Should().Be(1);
        negative.PageSize.Should().Be(1);

        var huge = await svc.ListForUserAsync("alice", page: 1, pageSize: 9999);
        huge.PageSize.Should().Be(100);
    }

    [Fact]
    public async Task EndAsync_Marks_Session_Ended_For_Owner()
    {
        await using var db = NewContext();
        var svc = NewService(db);
        var session = await svc.CreateAsync("alice", new CreateSessionRequest { Title = "Service" });

        var ended = await svc.EndAsync(session.Code, "alice");

        ended.Should().NotBeNull();
        ended!.Status.Should().Be("ended");
        ended.EndedAt.Should().NotBeNull();
    }

    [Fact]
    public async Task EndAsync_Throws_When_Requesting_User_Is_Not_Owner()
    {
        await using var db = NewContext();
        var svc = NewService(db);
        var session = await svc.CreateAsync("alice", new CreateSessionRequest { Title = "Service" });

        var act = () => svc.EndAsync(session.Code, "mallory");

        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task EndAsync_Is_Case_Insensitive_On_Owner_Name()
    {
        await using var db = NewContext();
        var svc = NewService(db);
        var session = await svc.CreateAsync("Alice", new CreateSessionRequest { Title = "Service" });

        var ended = await svc.EndAsync(session.Code, "ALICE");

        ended.Should().NotBeNull();
        ended!.Status.Should().Be("ended");
    }

    [Fact]
    public async Task EndAsync_Returns_Null_For_Missing_Session()
    {
        await using var db = NewContext();
        var svc = NewService(db);

        var dto = await svc.EndAsync("ZZZZZZ", "alice");
        dto.Should().BeNull();
    }

    [Fact]
    public async Task DeleteAsync_Removes_Session_For_Owner_And_Cascades_Segments()
    {
        await using var db = NewContext();
        var svc = NewService(db);
        var session = await svc.CreateAsync("alice", new CreateSessionRequest { Title = "Service" });
        await svc.AppendSegmentAsync(session.Code, new AppendTranscriptRequest { Text = "first" }, null);

        var deleted = await svc.DeleteAsync(session.Code, "alice");

        deleted.Should().BeTrue();
        (await db.Sessions.AnyAsync()).Should().BeFalse();
        (await db.TranscriptSegments.AnyAsync()).Should().BeFalse();
    }

    [Fact]
    public async Task DeleteAsync_Throws_When_Requesting_User_Is_Not_Owner()
    {
        await using var db = NewContext();
        var svc = NewService(db);
        var session = await svc.CreateAsync("alice", new CreateSessionRequest { Title = "Service" });

        var act = () => svc.DeleteAsync(session.Code, "mallory");

        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task DeleteAsync_Returns_False_For_Missing_Session()
    {
        await using var db = NewContext();
        var svc = NewService(db);

        var deleted = await svc.DeleteAsync("ZZZZZZ", "alice");
        deleted.Should().BeFalse();
    }

    [Fact]
    public async Task AppendSegmentAsync_Persists_Segment_With_Matches_Ordered_By_Rank()
    {
        await using var db = NewContext();
        var svc = NewService(db);
        var session = await svc.CreateAsync("alice", new CreateSessionRequest { Title = "Service" });

        var matches = new List<ScriptureMatchDto>
        {
            new() { Reference = "John 3:16", Book = "John", Chapter = 3, VerseStart = 16, Version = "NKJV", Quote = "q1", Confidence = 0.9 },
            new() { Reference = "Romans 8:28", Book = "Romans", Chapter = 8, VerseStart = 28, Version = "NKJV", Quote = "q2", Confidence = 0.7 },
        };

        var segment = await svc.AppendSegmentAsync(
            session.Code,
            new AppendTranscriptRequest { Text = "For God so loved the world" },
            matches);

        segment.Text.Should().Be("For God so loved the world");
        segment.Matches.Should().HaveCount(2);
        segment.Matches[0].Reference.Should().Be("John 3:16");
        segment.Matches[0].Rank.Should().Be(0);
        segment.Matches[1].Reference.Should().Be("Romans 8:28");
        segment.Matches[1].Rank.Should().Be(1);
    }

    [Fact]
    public async Task AppendSegmentAsync_Throws_When_Session_Does_Not_Exist()
    {
        await using var db = NewContext();
        var svc = NewService(db);

        var act = () => svc.AppendSegmentAsync("ZZZZZZ", new AppendTranscriptRequest { Text = "x" }, null);

        await act.Should().ThrowAsync<KeyNotFoundException>();
    }

    [Fact]
    public async Task ListSegmentsAsync_Returns_Segments_Ordered_By_StartedAt()
    {
        await using var db = NewContext();
        var svc = NewService(db);
        var session = await svc.CreateAsync("alice", new CreateSessionRequest { Title = "Service" });

        var t0 = DateTimeOffset.UtcNow;
        // Insert out-of-order to confirm ordering
        await svc.AppendSegmentAsync(session.Code, new AppendTranscriptRequest
        {
            Text = "third",
            StartedAt = t0.AddMinutes(2),
            EndedAt = t0.AddMinutes(3),
        }, null);
        await svc.AppendSegmentAsync(session.Code, new AppendTranscriptRequest
        {
            Text = "first",
            StartedAt = t0,
            EndedAt = t0.AddMinutes(1),
        }, null);
        await svc.AppendSegmentAsync(session.Code, new AppendTranscriptRequest
        {
            Text = "second",
            StartedAt = t0.AddMinutes(1),
            EndedAt = t0.AddMinutes(2),
        }, null);

        var segments = await svc.ListSegmentsAsync(session.Code);

        segments.Select(s => s.Text).Should().Equal("first", "second", "third");
    }

    [Fact]
    public async Task ListSegmentsAsync_Returns_Empty_List_For_Missing_Session()
    {
        await using var db = NewContext();
        var svc = NewService(db);

        var segments = await svc.ListSegmentsAsync("ZZZZZZ");
        segments.Should().BeEmpty();
    }
}
