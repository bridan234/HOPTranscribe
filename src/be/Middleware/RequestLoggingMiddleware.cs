using System.Diagnostics;
using HOPTranscribe.Constants;

namespace HOPTranscribe.Middleware;

public class RequestLoggingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<RequestLoggingMiddleware> _logger;

    public RequestLoggingMiddleware(
        RequestDelegate next,
        ILogger<RequestLoggingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var stopwatch = Stopwatch.StartNew();
        var requestId = Guid.NewGuid().ToString();

        var trackingData = new RequestTrackingData
        {
            UserId = context.User?.Identity?.Name,
            IpAddress = GetClientIpAddress(context),
            UserAgent = context.Request.Headers["User-Agent"].ToString(),
            RequestId = requestId,
            Timestamp = DateTime.UtcNow,
            Method = context.Request.Method,
            Path = context.Request.Path,
            QueryString = context.Request.QueryString.ToString()
        };

        // Store in HttpContext.Items for access in controllers
        context.Items["RequestTracking"] = trackingData;

        context.Response.Headers[ApiConstants.Headers.RequestId] = requestId;

        _logger.LogInformation(
            ApiConstants.LogMessages.RequestStarted,
            context.Request.Method,
            context.Request.Path,
            requestId
        );

        _logger.LogDebug(
            "Request details - IP: {IpAddress}, User: {UserId}, UserAgent: {UserAgent}",
            trackingData.IpAddress,
            trackingData.UserId ?? "Anonymous",
            trackingData.UserAgent
        );

        try
        {
            await _next(context);
        }
        finally
        {
            stopwatch.Stop();

            _logger.LogInformation(
                "Request completed: {Method} {Path} - Status: {StatusCode} - Duration: {Duration}ms [RequestId: {RequestId}]",
                context.Request.Method,
                context.Request.Path,
                context.Response.StatusCode,
                stopwatch.ElapsedMilliseconds,
                requestId
            );
        }
    }

    private static string? GetClientIpAddress(HttpContext context)
    {
        var forwardedFor = context.Request.Headers["X-Forwarded-For"].FirstOrDefault();
        if (!string.IsNullOrEmpty(forwardedFor))
        {
            var ips = forwardedFor.Split(',', StringSplitOptions.RemoveEmptyEntries);
            return ips.FirstOrDefault()?.Trim();
        }

        var realIp = context.Request.Headers["X-Real-IP"].FirstOrDefault();
        if (!string.IsNullOrEmpty(realIp))
            return realIp;

        return context.Connection.RemoteIpAddress?.ToString();
    }
}

public class RequestTrackingData
{
    public string? UserId { get; set; }
    public string? IpAddress { get; set; }
    public string? UserAgent { get; set; }
    public string RequestId { get; set; } = null!;
    public DateTime Timestamp { get; set; }
    public string Method { get; set; } = null!;
    public string Path { get; set; } = null!;
    public string? QueryString { get; set; }
}

/// <summary>
/// Extension methods to easily access tracking data from HttpContext
/// </summary>
public static class RequestTrackingExtensions
{
    public static RequestTrackingData? GetTrackingData(this HttpContext context)
    {
        return context.Items.TryGetValue("RequestTracking", out var data) 
            ? data as RequestTrackingData 
            : null;
    }

    public static string? GetUserId(this HttpContext context)
    {
        return context.GetTrackingData()?.UserId;
    }

    public static string? GetIpAddress(this HttpContext context)
    {
        return context.GetTrackingData()?.IpAddress;
    }

    public static string? GetRequestId(this HttpContext context)
    {
        return context.GetTrackingData()?.RequestId;
    }
}
