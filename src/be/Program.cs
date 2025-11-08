using HOPTranscribe.Configuration;
using HOPTranscribe.Constants;
using HOPTranscribe.Data;
using HOPTranscribe.Hubs;
using HOPTranscribe.Middleware;
using HOPTranscribe.Models;
using HOPTranscribe.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(builder.Configuration)
    .CreateLogger();

builder.Host.UseSerilog();

try
{
    Log.Information("Starting HOPTranscribe API");

    builder.Services.Configure<OpenAISettings>(
        builder.Configuration.GetSection(ApiConstants.ConfigKeys.OpenAISection)
    );
    builder.Services.Configure<ApplicationSettings>(
        builder.Configuration.GetSection(nameof(ApplicationSettings))
    );

    builder.Services.AddControllers()
        .AddJsonOptions(options =>
        {
            options.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());
        });
    builder.Services.AddApplicationInsightsTelemetry(options =>
    {
        options.EnableAdaptiveSampling = true;
        options.ConnectionString = builder.Configuration["APPLICATIONINSIGHTS_CONNECTION_STRING"];
    });

    var allowedOrigins = builder.Configuration
        .GetSection("AllowedOrigins")
        .Get<string[]>() ?? Array.Empty<string>();
    builder.Services.AddCors(options =>
    {
        options.AddPolicy(ApiConstants.PolicyNames.CorsPolicy, policy =>
        {
            if (builder.Environment.IsProduction())
            {
                policy.SetIsOriginAllowed(origin =>
                      {
                          if (Uri.TryCreate(origin, UriKind.Absolute, out var uri))
                          {
                              return uri.Host.EndsWith(".azurecontainerapps.io", StringComparison.OrdinalIgnoreCase);
                          }
                          return false;
                      })
                      .AllowAnyMethod()
                      .AllowAnyHeader()
                      .AllowCredentials();
            }
            else
            {
                // Development: allow specific origin with credentials for SignalR
                policy.WithOrigins("http://localhost:5173", "http://localhost:5174", "http://localhost:3000")
                      .AllowAnyMethod()
                      .AllowAnyHeader()
                      .AllowCredentials();
            }
        });
    });

    builder.Services.AddSignalR(options =>
    {
        options.EnableDetailedErrors = !builder.Environment.IsProduction();
        options.KeepAliveInterval = TimeSpan.FromSeconds(50);
        options.ClientTimeoutInterval = TimeSpan.FromSeconds(120);
    });

    builder.Services.AddMemoryCache();

    // SQLite in production, InMemory in development
    if (builder.Environment.IsDevelopment())
    {
        builder.Services.AddSingleton<ISessionService, InMemorySessionService>();
        Log.Information("Development: Using InMemorySessionService");
    }
    else
    {
        var connectionString = builder.Configuration["SessionStorage:ConnectionString"] 
            ?? "Data Source=/data/sessions.db;Cache=Shared;Mode=ReadWriteCreate";

        builder.Services.AddDbContext<SessionDbContext>(options =>
        {
            options.UseSqlite(connectionString);
        });

        builder.Services.AddScoped<ISessionService, DatabaseSessionService>();
        Log.Information("Production: Using DatabaseSessionService with SQLite at {ConnectionString}", connectionString);
    }

    builder.Services.AddHttpClient<IOpenAIService, OpenAIService>(client =>
    {
        client.Timeout = TimeSpan.FromSeconds(30);
    });

    builder.Services.AddScoped<IClientLoggingService, ClientLoggingService>();

    builder.Services.AddOpenApi();
    builder.Services.AddHealthChecks();

    var app = builder.Build();

    if (!app.Environment.IsDevelopment())
    {
        using var scope = app.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetService<SessionDbContext>();
        if (dbContext != null)
        {
            Log.Information("Applying database migrations...");
            dbContext.Database.Migrate();
            Log.Information("Database migrations applied successfully");
        }
    }

    app.UseMiddleware<ExceptionHandlingMiddleware>();
    app.UseMiddleware<RequestLoggingMiddleware>();

    if (app.Environment.IsDevelopment())
    {
        app.MapOpenApi();
    }

    app.UseSerilogRequestLogging();
    app.UseCors(ApiConstants.PolicyNames.CorsPolicy);
    
    app.UseWebSockets();
    
    app.UseHttpsRedirection();
    app.MapControllers();
    app.MapHub<SessionHub>("/sessionHub");

    app.MapHealthChecks($"/{ApiConstants.Routes.HealthEndpoint}");
    app.MapGet($"/{ApiConstants.Routes.HealthEndpoint}/status", (IOptions<ApplicationSettings> appSettings) =>
    {
        var settings = appSettings.Value;
        return ApiResponse<object>.Ok(new
        {
            status = ApiConstants.ResponseMessages.HealthyStatus,
            timestamp = DateTime.UtcNow,
            environment = app.Environment.EnvironmentName,
            version = settings.Version,
            applicationName = settings.ApplicationName
        }, ApiConstants.ResponseMessages.ApiRunning);
    }).WithName("HealthCheckStatus");

    app.Run();
}
catch (Exception ex)
{
    Log.Fatal(ex, "Application terminated unexpectedly");
}
finally
{
    Log.CloseAndFlush();
}
