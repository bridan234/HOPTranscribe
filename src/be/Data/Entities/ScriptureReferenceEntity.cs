using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HOPTranscribe.Data.Entities;

/// <summary>
/// Database entity for ScriptureReference
/// </summary>
public class ScriptureReferenceEntity
{
    [Key]
    [MaxLength(100)]
    public string Id { get; set; } = null!;
    
    [Required]
    [MaxLength(50)]
    public string Book { get; set; } = null!;
    
    public int Chapter { get; set; }
    public int Verse { get; set; }
    
    [Required]
    [MaxLength(10)]
    public string Version { get; set; } = null!;
    
    [Required]
    public string Text { get; set; } = null!;
    
    [Range(0.0, 1.0)]
    public double Confidence { get; set; }
    
    [MaxLength(100)]
    public string? TranscriptSegmentId { get; set; }
    
    // Foreign key
    [Required]
    [MaxLength(50)]
    public string SessionCode { get; set; } = null!;
    
    // Navigation property
    [ForeignKey(nameof(SessionCode))]
    public SessionEntity Session { get; set; } = null!;
}
