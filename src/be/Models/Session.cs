namespace HOPTranscribe.Models;

public class Session
{
    public string Id { get; set; } = null!;
    public string SessionCode { get; set; } = null!;
    public string UserName { get; set; } = null!;
    public string Title { get; set; } = null!;
    public DateTime StartedAt { get; set; }
    public DateTime? EndedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public SessionStatus Status { get; set; }
    public bool IsReadonly { get; set; }
    public bool IsRecording { get; set; }
    public bool IsPaused { get; set; }
    
    // Duration tracking
    public int Duration { get; set; } // Total duration in seconds
    public int ActiveDuration { get; set; } // Seconds actually recording
    
    // Content
    public List<TranscriptSegment> Transcripts { get; set; } = new();
    public List<ScriptureReference> ScriptureReferences { get; set; } = new();
    
    // Metadata
    public SessionMetadata? Metadata { get; set; }
}

public class TranscriptSegment
{
    public string Id { get; set; } = null!;
    public string Text { get; set; } = null!;
    public DateTime Timestamp { get; set; }
    public double Confidence { get; set; }
}

public class ScriptureReference
{
    public string Id { get; set; } = null!;
    public string Book { get; set; } = null!;
    public int Chapter { get; set; }
    public int Verse { get; set; }
    public string Version { get; set; } = null!;
    public string Text { get; set; } = null!;
    public double Confidence { get; set; }
    public string TranscriptSegmentId { get; set; } = null!;
}

public class SessionMetadata
{
    public string? Speaker { get; set; }
    public string? Location { get; set; }
    public string? Notes { get; set; }
}

public enum SessionStatus
{
    Active,
    Completed,
    Ended,
    Error
}
