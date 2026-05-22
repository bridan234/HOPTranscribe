using System.Text.Json;
using System.Text;
using System.Threading.RateLimiting;
using HOPTranscribe.Api.Configuration;
using HOPTranscribe.Api.Data;
using HOPTranscribe.Api.HealthChecks;
using HOPTranscribe.Api.Hubs;
using HOPTranscribe.Api.Middleware;
using HOPTranscribe.Api.Services.Auth;
using HOPTranscribe.Api.Services.Broadcast;
using HOPTranscribe.Api.Services.Matching;
using HOPTranscribe.Api.Services.OpenAI;
using HOPTranscribe.Api.Services.Sessions;
using HOPTranscribe.Api.Validation;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

builder.Host.UseSerilog((ctx, services, cfg) => cfg
    .ReadFrom.Configuration(ctx.Configuration)
    .ReadFrom.Services(services)
    .Enrich.FromLogContext());

builder.Services.Configure<JwtSettings>(builder.Configuration.GetSection("Jwt"));
builder.Services.Configure<OpenAISettings>(builder.Configuration.GetSection("OpenAI"));
builder.Services.Configure<RateLimitSettings>(builder.Configuration.GetSection("RateLimits"));

var connectionString = builder.Configuration.GetConnectionString("SessionDb")
    ?? "Data Source=data/sessions.db";

// Provider sniffing: Npgsql connection strings start with "Host=" (Supabase /
// any standard Postgres). SQLite uses "Data Source=". Tests replace the
// DbContext registration outright, so they're unaffected.
var isPostgres = connectionString.Contains("Host=", StringComparison.OrdinalIgnoreCase);

builder.Services.AddDbContext<HopDbContext>(opts =>
{
    if (isPostgres)
    {
        opts.UseNpgsql(connectionString, npg =>
        {
            npg.MigrationsHistoryTable("__EFMigrationsHistory", "hoptranscribe");
        });
    }
    else
    {
        opts.UseSqlite(connectionString);
    }
});

builder.Services.AddSingleton<IJwtService, JwtService>();
builder.Services.AddSingleton<BibleBookCatalog>();
builder.Services.AddScoped<ScriptureValidator>();
builder.Services.AddScoped<ISessionService, SqliteSessionService>();
builder.Services.AddSingleton<ISessionBroadcaster, SignalRSessionBroadcaster>();
builder.Services.AddHttpClient<IOpenAIRealtimeService, OpenAIRealtimeService>();
builder.Services.AddHttpClient<IScriptureMatchService, ScriptureMatchService>();

builder.Services.AddSignalR(options =>
{
    options.EnableDetailedErrors = builder.Environment.IsDevelopment();
});

var rateLimits = builder.Configuration.GetSection("RateLimits").Get<RateLimitSettings>() ?? new RateLimitSettings();
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddPolicy("match", httpContext =>
    {
        var sessionKey = httpContext.User.Identity?.Name ?? "anonymous";
        var ip = httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        return RateLimitPartition.GetSlidingWindowLimiter(
            partitionKey: $"{sessionKey}|{ip}",
            factory: _ => new SlidingWindowRateLimiterOptions
            {
                Window = TimeSpan.FromMinutes(1),
                PermitLimit = rateLimits.MatchPerSessionPerMinute,
                SegmentsPerWindow = 6,
                QueueLimit = 0,
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
            });
    });
});

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer();

// Bind JwtBearerOptions from IOptions<JwtSettings> at resolve time so test
// hosts can override the binding via ConfigureAppConfiguration without the
// validator capturing a stale snapshot at host-build time.
builder.Services
    .AddOptions<JwtBearerOptions>(JwtBearerDefaults.AuthenticationScheme)
    .Configure<IOptions<JwtSettings>>((bearer, jwt) =>
    {
        var settings = jwt.Value;
        var keyMaterial = string.IsNullOrWhiteSpace(settings.SigningKey)
            ? new string('0', 32)
            : settings.SigningKey;

        bearer.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = settings.Issuer,
            ValidAudience = settings.Audience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(keyMaterial)),
            ClockSkew = TimeSpan.FromSeconds(30),
        };

        // SignalR WebSockets cannot send the Authorization header — accept ?access_token=...
        bearer.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var accessToken = context.Request.Query["access_token"];
                var path = context.HttpContext.Request.Path;
                if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/sessionHub"))
                {
                    context.Token = accessToken;
                }
                return Task.CompletedTask;
            }
        };
    });

builder.Services.AddAuthorization();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        var origins = builder.Configuration.GetSection("AllowedOrigins").Get<string[]>()
            ?? new[] { "http://localhost:3000", "http://localhost:5173" };
        policy.WithOrigins(origins)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddOpenApi();
builder.Services.AddHttpClient("openai-health");
builder.Services.AddHealthChecks()
    .AddCheck<DatabaseHealthCheck>("database", failureStatus: HealthStatus.Unhealthy, tags: new[] { "ready" })
    .AddCheck<SqliteStorageHealthCheck>("storage", failureStatus: HealthStatus.Unhealthy, tags: new[] { "ready" })
    .AddCheck<OpenAIHealthCheck>("openai", failureStatus: HealthStatus.Unhealthy, tags: new[] { "external" });

var aiConn = builder.Configuration["APPLICATIONINSIGHTS_CONNECTION_STRING"];
if (!string.IsNullOrWhiteSpace(aiConn))
{
    builder.Services.AddApplicationInsightsTelemetry(options => options.ConnectionString = aiConn);
}

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<HopDbContext>();
    try
    {
        // Read the connection string off the actual DbContext rather than the captured
        // top-level variable: tests (WebApplicationFactory) override the DbContext after
        // Program.cs has already evaluated `connectionString`, so the variable can lie.
        var activeCs = db.Database.GetConnectionString() ?? string.Empty;

        if (db.Database.IsSqlite())
        {
            var dataSource = SqliteDataSourcePath(activeCs);
            var isInMemory = dataSource.Contains(":memory:", StringComparison.OrdinalIgnoreCase);
            if (!string.IsNullOrWhiteSpace(dataSource) && !isInMemory)
            {
                var dir = Path.GetDirectoryName(dataSource);
                if (!string.IsNullOrWhiteSpace(dir) && !Directory.Exists(dir))
                {
                    Directory.CreateDirectory(dir);
                }
            }
            // SQLite (dev/local/tests) — no Sqlite migration set ships with the app,
            // so create the schema in-place. Idempotent.
            db.Database.EnsureCreated();
            Log.Information("SQLite schema ensured at {ConnectionString}", activeCs);
        }
        else
        {
            db.Database.Migrate();
            Log.Information("Postgres migrations applied");
        }
    }
    catch (Exception ex)
    {
        Log.Fatal(ex, "Failed to initialize database. Aborting startup so the orchestrator can retry.");
        throw;
    }
}

static string SqliteDataSourcePath(string cs)
{
    foreach (var part in cs.Split(';', StringSplitOptions.RemoveEmptyEntries))
    {
        var kv = part.Split('=', 2);
        if (kv.Length == 2 && kv[0].Trim().Equals("Data Source", StringComparison.OrdinalIgnoreCase))
        {
            return kv[1].Trim();
        }
    }
    return string.Empty;
}

static Task WriteHealthReport(HttpContext context, HealthReport report)
{
    context.Response.ContentType = "application/json";
    var environment = context.RequestServices.GetRequiredService<IHostEnvironment>();
    var includeDetails = environment.IsDevelopment();

    var payload = new
    {
        status = report.Status.ToString(),
        durationMs = report.TotalDuration.TotalMilliseconds,
        checks = report.Entries.Select(entry => new
        {
            name = entry.Key,
            status = entry.Value.Status.ToString(),
            description = includeDetails
                ? entry.Value.Description
                : entry.Value.Status == HealthStatus.Healthy ? "Check passed." : "Check failed.",
            durationMs = entry.Value.Duration.TotalMilliseconds,
            error = includeDetails ? entry.Value.Exception?.Message : null,
            data = includeDetails ? entry.Value.Data : null,
        }),
    };

    return JsonSerializer.SerializeAsync(
        context.Response.Body,
        payload,
        new JsonSerializerOptions { WriteIndented = true });
}

app.UseMiddleware<ExceptionHandlingMiddleware>();
app.UseSerilogRequestLogging();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseCors("AllowFrontend");
app.UseWebSockets();
app.UseAuthentication();
app.UseAuthorization();
app.UseRateLimiter();

app.MapControllers();
app.MapHub<SessionHub>("/sessionHub");
app.MapHealthChecks("/health/status", new HealthCheckOptions
{
    Predicate = check => check.Tags.Contains("ready"),
    ResponseWriter = WriteHealthReport,
});
app.MapHealthChecks("/health/dependencies", new HealthCheckOptions
{
    ResponseWriter = WriteHealthReport,
});
app.MapGet("/", () => Results.Ok(new { service = "HOPTranscribe.Api", version = "v2.0.0" }));

try
{
    Log.Information("HOPTranscribe.Api v2 starting up");
    app.Run();
}
catch (Exception ex)
{
    Log.Fatal(ex, "HOPTranscribe.Api v2 terminated unexpectedly");
}
finally
{
    Log.CloseAndFlush();
}

// Required by WebApplicationFactory<Program> in HOPTranscribe.Api.Tests.
// Top-level statements emit an internal Program class by default.
public partial class Program { }
