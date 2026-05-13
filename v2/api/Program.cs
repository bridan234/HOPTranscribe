using System.Text;
using System.Threading.RateLimiting;
using HOPTranscribe.Api.Configuration;
using HOPTranscribe.Api.Data;
using HOPTranscribe.Api.Hubs;
using HOPTranscribe.Api.Middleware;
using HOPTranscribe.Api.Services.Auth;
using HOPTranscribe.Api.Services.Broadcast;
using HOPTranscribe.Api.Services.Matching;
using HOPTranscribe.Api.Services.OpenAI;
using HOPTranscribe.Api.Services.Sessions;
using HOPTranscribe.Api.Validation;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
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
builder.Services.AddDbContext<HopDbContext>(opts => opts.UseSqlite(connectionString));

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

var jwtSection = builder.Configuration.GetSection("Jwt").Get<JwtSettings>() ?? new JwtSettings();
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtSection.Issuer,
            ValidAudience = jwtSection.Audience,
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(string.IsNullOrWhiteSpace(jwtSection.SigningKey)
                    ? new string('0', 32)
                    : jwtSection.SigningKey)),
            ClockSkew = TimeSpan.FromSeconds(30),
        };
        // SignalR WebSockets cannot send the Authorization header — accept ?access_token=...
        options.Events = new JwtBearerEvents
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
builder.Services.AddHealthChecks();

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
        var dataSource = SqliteDataSourcePath(connectionString);
        if (!string.IsNullOrWhiteSpace(dataSource))
        {
            var dir = Path.GetDirectoryName(dataSource);
            if (!string.IsNullOrWhiteSpace(dir) && !Directory.Exists(dir))
            {
                Directory.CreateDirectory(dir);
            }
        }
        db.Database.Migrate();
        Log.Information("Database migrations applied to {ConnectionString}", connectionString);
    }
    catch (Exception ex)
    {
        Log.Error(ex, "Failed to apply database migrations");
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
app.MapHealthChecks("/health/status");
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
