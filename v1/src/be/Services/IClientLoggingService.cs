using HOPTranscribe.Models.Logging;

namespace HOPTranscribe.Services;

/// <summary>
/// Interface for client logging service
/// </summary>
public interface IClientLoggingService
{
    /// <summary>
    /// Process a single client log entry
    /// </summary>
    /// <param name="logEntry">The log entry to process</param>
    /// <param name="clientIp">Client IP address</param>
    Task ProcessLogAsync(ClientLogEntry logEntry, string? clientIp);

    /// <summary>
    /// Process a batch of client log entries
    /// </summary>
    /// <param name="logEntries">Collection of log entries to process</param>
    /// <param name="clientIp">Client IP address</param>
    Task ProcessBatchLogsAsync(List<ClientLogEntry> logEntries, string? clientIp);
}
