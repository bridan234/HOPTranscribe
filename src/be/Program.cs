using HOPTranscribe.Configuration;
using HOPTranscribe.Constants;
using HOPTranscribe.Middleware;
using HOPTranscribe.Models;
using HOPTranscribe.Services;
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

    builder.Services.AddControllers();
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
                // Development: allow any origin
                policy.AllowAnyOrigin()
                      .AllowAnyMethod()
                      .AllowAnyHeader();
            }
        });
    });

    builder.Services.AddHttpClient<IOpenAIService, OpenAIService>(client =>
    {
        client.Timeout = TimeSpan.FromSeconds(30);
    });

    builder.Services.AddOpenApi();
    builder.Services.AddHealthChecks();

    var app = builder.Build();

    app.UseMiddleware<ExceptionHandlingMiddleware>();
    app.UseMiddleware<RequestLoggingMiddleware>();

    if (app.Environment.IsDevelopment())
    {
        app.MapOpenApi();
    }

    app.UseSerilogRequestLogging();
    app.UseCors(ApiConstants.PolicyNames.CorsPolicy);
    app.UseHttpsRedirection();
    app.MapControllers();

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
