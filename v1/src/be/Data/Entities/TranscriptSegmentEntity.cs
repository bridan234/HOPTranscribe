using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HOPTranscribe.Data.Entities;

/// <summary>
/// Database entity for TranscriptSegment
/// </summary>
public class TranscriptSegmentEntity
{
    [Key]
    [MaxLength(100)]
    public string Id { get; set; } = null!;
    
    [Required]
    public string Text { get; set; } = null!;
    
    public DateTime Timestamp { get; set; }
    
    [Range(0.0, 1.0)]
    public double Confidence { get; set; }
    
    // Foreign key
    [Required]
    [MaxLength(50)]
    public string SessionCode { get; set; } = null!;
    
    // Navigation property
    [ForeignKey(nameof(SessionCode))]
    public SessionEntity Session { get; set; } = null!;
}
