using System.ComponentModel.DataAnnotations;

namespace HOPTranscribe.Api.Data.Entities;

public class ScriptureMatchEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid SegmentId { get; set; }
    public TranscriptSegmentEntity? Segment { get; set; }

    [MaxLength(64)]
    public string Reference { get; set; } = string.Empty;

    [MaxLength(32)]
    public string Book { get; set; } = string.Empty;

    public int Chapter { get; set; }

    public int VerseStart { get; set; }

    public int? VerseEnd { get; set; }

    [MaxLength(16)]
    public string Version { get; set; } = string.Empty;

    public string Quote { get; set; } = string.Empty;

    public double Confidence { get; set; }

    public int Rank { get; set; }
}
