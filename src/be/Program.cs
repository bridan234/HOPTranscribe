using HOPTranscribe.Configuration;
using HOPTranscribe.Constants;
using HOPTranscribe.Middleware;
using HOPTranscribe.Models;
using HOPTranscribe.Services;
using Microsoft.Extensions.Options;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

// Configure Serilog
Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(builder.Configuration)
    .CreateLogger();

builder.Host.UseSerilog();

try
{
    Log.Information("Starting HOPTranscribe API");

    // Add configuration
    builder.Services.Configure<OpenAISettings>(
        builder.Configuration.GetSection(ApiConstants.ConfigKeys.OpenAISection)
    );
    builder.Services.Configure<ApplicationSettings>(
        builder.Configuration.GetSection(nameof(ApplicationSettings))
    );

    // Add controllers
    builder.Services.AddControllers();

    // Configure CORS
    var allowedOrigins = builder.Configuration
        .GetSection(ApiConstants.ConfigKeys.AllowedOriginsSection)
        .Get<string[]>() ?? Array.Empty<string>();

    builder.Services.AddCors(options =>
    {
        options.AddPolicy(ApiConstants.PolicyNames.CorsPolicy, policy =>
        {
            policy.WithOrigins(allowedOrigins)
                  .AllowAnyMethod()
                  .AllowAnyHeader()
                  .AllowCredentials();
        });
    });

    // Add HttpClient with typed client for OpenAI
    builder.Services.AddHttpClient<IOpenAIService, OpenAIService>(client =>
    {
        client.Timeout = TimeSpan.FromSeconds(30);
    });

    // Add OpenAPI/Swagger
    builder.Services.AddOpenApi();

    // Add health checks
    builder.Services.AddHealthChecks();

    var app = builder.Build();

    // Configure middleware pipeline
    app.UseMiddleware<ExceptionHandlingMiddleware>();
    app.UseMiddleware<RequestLoggingMiddleware>();

    // Configure the HTTP request pipeline
    if (app.Environment.IsDevelopment())
    {
        app.MapOpenApi();
    }

    app.UseSerilogRequestLogging();
    app.UseCors(ApiConstants.PolicyNames.CorsPolicy);
    app.UseHttpsRedirection();
    app.MapControllers();

    // Health check endpoint
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
