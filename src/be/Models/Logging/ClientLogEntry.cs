namespace HOPTranscribe.Models.Logging;

/// <summary>
/// Represents a log entry from the client
/// </summary>
public class ClientLogEntry
{
    /// <summary>
    /// Timestamp when the log was created on the client (ISO 8601)
    /// </summary>
    public required string Timestamp { get; set; }

    /// <summary>
    /// Log level: debug, info, warn, error
    /// </summary>
    public required string Level { get; set; }

    /// <summary>
    /// Log message
    /// </summary>
    public required string Message { get; set; }

    /// <summary>
    /// Source of the log (component, file, or module name)
    /// </summary>
    public string? Source { get; set; }

    /// <summary>
    /// Additional context data as JSON string
    /// </summary>
    public string? Context { get; set; }

    /// <summary>
    /// Error stack trace if available
    /// </summary>
    public string? StackTrace { get; set; }

    /// <summary>
    /// Session ID to correlate logs from the same user session
    /// </summary>
    public string? SessionId { get; set; }

    /// <summary>
    /// User ID if authenticated
    /// </summary>
    public string? UserId { get; set; }

    /// <summary>
    /// Browser user agent
    /// </summary>
    public string? UserAgent { get; set; }

    /// <summary>
    /// Page URL where the log originated
    /// </summary>
    public string? PageUrl { get; set; }

    /// <summary>
    /// Client environment: development, staging, production
    /// </summary>
    public string? Environment { get; set; }

    /// <summary>
    /// Application version
    /// </summary>
    public string? AppVersion { get; set; }
}
