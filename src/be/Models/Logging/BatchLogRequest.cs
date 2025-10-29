namespace HOPTranscribe.Models.Logging;

/// <summary>
/// Request model for batch logging
/// </summary>
public class BatchLogRequest
{
    /// <summary>
    /// Collection of log entries to process
    /// </summary>
    public required List<ClientLogEntry> Logs { get; set; }
}
