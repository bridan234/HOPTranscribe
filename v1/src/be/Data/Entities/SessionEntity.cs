using System.ComponentModel.DataAnnotations;
using HOPTranscribe.Models;

namespace HOPTranscribe.Data.Entities;

/// <summary>
/// Database entity for Session
/// Separate from API model to allow independent schema evolution
/// </summary>
public class SessionEntity
{
    [Key]
    public string Id { get; set; } = null!;
    
    [Required]
    [MaxLength(50)]
    public string SessionCode { get; set; } = null!;
    
    [Required]
    [MaxLength(100)]
    public string UserName { get; set; } = null!;
    
    [Required]
    [MaxLength(200)]
    public string Title { get; set; } = null!;
    
    public DateTime StartedAt { get; set; }
    public DateTime? EndedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    
    public SessionStatus Status { get; set; }
    public bool IsReadonly { get; set; }
    public bool IsRecording { get; set; }
    public bool IsPaused { get; set; }
    
    public int Duration { get; set; }
    public int ActiveDuration { get; set; }
    
    public string? Metadata { get; set; } // JSON string
    
    // Optimistic concurrency token
    [Timestamp]
    public byte[]? RowVersion { get; set; }
    
    // Navigation properties
    public ICollection<TranscriptSegmentEntity> Transcripts { get; set; } = new List<TranscriptSegmentEntity>();
    public ICollection<ScriptureReferenceEntity> ScriptureReferences { get; set; } = new List<ScriptureReferenceEntity>();
}
