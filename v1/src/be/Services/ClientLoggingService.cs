using HOPTranscribe.Constants;
using HOPTranscribe.Models.Logging;
using Microsoft.Extensions.Logging;

namespace HOPTranscribe.Services;

/// <summary>
/// Service for processing client-side logs
/// </summary>
public class ClientLoggingService : IClientLoggingService
{
    private readonly ILogger<ClientLoggingService> _logger;

    public ClientLoggingService(ILogger<ClientLoggingService> logger)
    {
        _logger = logger ?? throw new ArgumentNullException(nameof(logger), ApiConstants.ErrorMessages.ArgumentNullLogger);
    }

    /// <summary>
    /// Process a single client log entry
    /// </summary>
    public async Task ProcessLogAsync(ClientLogEntry logEntry, string? clientIp)
    {
        try
        {
            // Validate log entry
            if (string.IsNullOrWhiteSpace(logEntry.Message))
            {
                _logger.LogWarning("Received client log with empty message");
                return;
            }

            // Map client log level to server log level and write to structured logging
            var logLevel = MapLogLevel(logEntry.Level);
            var logMessage = FormatLogMessage(logEntry, clientIp);

            // Create structured log with all context
            using (_logger.BeginScope(new Dictionary<string, object?>
            {
                ["ClientLog"] = true,
                ["ClientTimestamp"] = logEntry.Timestamp,
                ["Source"] = logEntry.Source,
                ["SessionId"] = logEntry.SessionId,
                ["UserId"] = logEntry.UserId,
                ["ClientIp"] = clientIp,
                ["UserAgent"] = logEntry.UserAgent,
                ["PageUrl"] = logEntry.PageUrl,
                ["Environment"] = logEntry.Environment,
                ["AppVersion"] = logEntry.AppVersion,
                ["Context"] = logEntry.Context
            }))
            {
                _logger.Log(logLevel, "{LogMessage}", logMessage);

                // If there's a stack trace, log it separately for better visibility
                if (!string.IsNullOrWhiteSpace(logEntry.StackTrace))
                {
                    _logger.Log(logLevel, "Client Stack Trace: {StackTrace}", logEntry.StackTrace);
                }
            }

            await Task.CompletedTask;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, ApiConstants.LogMessages.ErrorProcessingClientLog);
        }
    }

    /// <summary>
    /// Process a batch of client log entries
    /// </summary>
    public async Task ProcessBatchLogsAsync(List<ClientLogEntry> logEntries, string? clientIp)
    {
        try
        {
            _logger.LogInformation(ApiConstants.LogMessages.ReceivedBatchLogs, logEntries.Count);

            // Process each log entry
            foreach (var logEntry in logEntries)
            {
                await ProcessLogAsync(logEntry, clientIp);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, ApiConstants.LogMessages.ErrorProcessingClientLog);
        }
    }

    /// <summary>
    /// Map client log level string to LogLevel enum
    /// </summary>
    private LogLevel MapLogLevel(string level)
    {
        return level?.ToLowerInvariant() switch
        {
            "debug" => LogLevel.Debug,
            "info" => LogLevel.Information,
            "warn" => LogLevel.Warning,
            "error" => LogLevel.Error,
            _ => LogLevel.Information
        };
    }

    /// <summary>
    /// Format log message with enriched context
    /// </summary>
    private string FormatLogMessage(ClientLogEntry logEntry, string? clientIp)
    {
        var source = string.IsNullOrWhiteSpace(logEntry.Source) ? "Client" : logEntry.Source;
        var sessionInfo = string.IsNullOrWhiteSpace(logEntry.SessionId) ? "" : $" [Session: {logEntry.SessionId}]";
        var ipInfo = string.IsNullOrWhiteSpace(clientIp) ? "" : $" [IP: {clientIp}]";
        
        return $"[CLIENT LOG] [{source}]{sessionInfo}{ipInfo} {logEntry.Message}";
    }
}
