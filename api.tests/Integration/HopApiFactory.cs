using HOPTranscribe.Api.Data;
using HOPTranscribe.Api.Models.Sessions;
using HOPTranscribe.Api.Services.Broadcast;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace HOPTranscribe.Api.Tests.Integration;

/// <summary>
/// Boots the real <c>HOPTranscribe.Api</c> host with an in-memory SQLite
/// database and a no-op session broadcaster (the real one calls SignalR,
/// which would need a live hub). Disposing the factory releases the
/// connection and drops the data.
/// </summary>
public class HopApiFactory : WebApplicationFactory<Program>
{
    public const string SigningKey = "integration-test-signing-key-very-long-and-secret-32+";
    public const string Issuer = "test-issuer";
    public const string Audience = "test-audience";

    public RecordingSessionBroadcaster Broadcaster { get; } = new();

    private readonly SqliteConnection _connection;

    public HopApiFactory()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment(Environments.Production);

        builder.ConfigureAppConfiguration((_, config) =>
        {
            config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Jwt:Issuer"] = Issuer,
                ["Jwt:Audience"] = Audience,
                ["Jwt:SigningKey"] = SigningKey,
                ["Jwt:ExpiryMinutes"] = "60",
                ["OpenAI:ApiKey"] = "sk-fake",
                ["OpenAI:RealtimeModel"] = "gpt-realtime-whisper",
                ["OpenAI:MatchingModel"] = "gpt-5-mini",
                ["OpenAI:MatchingFallbackModel"] = "gpt-4o-mini",
                ["HealthChecks:OpenAI:Enabled"] = "false",
                ["RateLimits:MatchPerSessionPerMinute"] = "1000",
                ["ConnectionStrings:SessionDb"] = "DataSource=:memory:",
                ["AllowedOrigins:0"] = "http://localhost",
            });
        });

        builder.ConfigureServices(services =>
        {
            // Replace the DbContext registration with one bound to our shared connection.
            var dbContextDescriptor = services.SingleOrDefault(
                d => d.ServiceType == typeof(DbContextOptions<HopDbContext>));
            if (dbContextDescriptor is not null) services.Remove(dbContextDescriptor);

            services.AddDbContext<HopDbContext>(opts => opts.UseSqlite(_connection));

            // Replace the SignalR broadcaster with a recording stand-in.
            var broadcasterDescriptor = services.SingleOrDefault(
                d => d.ServiceType == typeof(ISessionBroadcaster));
            if (broadcasterDescriptor is not null) services.Remove(broadcasterDescriptor);

            services.AddSingleton<ISessionBroadcaster>(Broadcaster);
        });
    }

    protected override IHost CreateHost(IHostBuilder builder)
    {
        var host = base.CreateHost(builder);

        // Program.cs calls db.Database.Migrate() during startup. With SQLite
        // ":memory:" + a shared open connection, EF Core's relational migrator
        // can fail in subtle ways (its connection-management semantics differ
        // from EnsureCreated). Force schema creation here so tests have a
        // clean baseline regardless of what Migrate did or didn't do.
        using var scope = host.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<HopDbContext>();
        db.Database.EnsureCreated();

        return host;
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
        if (disposing)
        {
            _connection.Dispose();
        }
    }
}

public class RecordingSessionBroadcaster : ISessionBroadcaster
{
    public List<(string Code, TranscriptSegmentDto Segment)> Transcripts { get; } = new();
    public List<(string Code, SessionDto Session)> SessionUpdates { get; } = new();

    public Task TranscriptAppendedAsync(string sessionCode, TranscriptSegmentDto segment)
    {
        Transcripts.Add((sessionCode, segment));
        return Task.CompletedTask;
    }

    public Task SessionUpdatedAsync(string sessionCode, SessionDto session)
    {
        SessionUpdates.Add((sessionCode, session));
        return Task.CompletedTask;
    }
}
