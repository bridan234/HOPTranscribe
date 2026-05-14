using System.ComponentModel.DataAnnotations;

namespace HOPTranscribe.Api.Models.Sessions;

public class CreateSessionRequest
{
    [Required]
    [StringLength(200, MinimumLength = 1)]
    public string Title { get; set; } = string.Empty;

    [StringLength(8)]
    public string Language { get; set; } = "en";
}

public class UpdateSessionRequest
{
    [StringLength(200, MinimumLength = 1)]
    public string? Title { get; set; }
}

public class SessionDto
{
    public Guid Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string OwnerUsername { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string Language { get; set; } = "en";
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset? EndedAt { get; set; }
    public int SegmentCount { get; set; }
}

public class TranscriptSegmentDto
{
    public Guid Id { get; set; }
    public string Text { get; set; } = string.Empty;
    public DateTimeOffset StartedAt { get; set; }
    public DateTimeOffset EndedAt { get; set; }
    public List<ScriptureMatchDto> Matches { get; set; } = new();
}

public class ScriptureMatchDto
{
    public Guid Id { get; set; }
    public string Reference { get; set; } = string.Empty;
    public string Book { get; set; } = string.Empty;
    public int Chapter { get; set; }
    public int VerseStart { get; set; }
    public int? VerseEnd { get; set; }
    public string Version { get; set; } = string.Empty;
    public string Quote { get; set; } = string.Empty;
    public double Confidence { get; set; }
    public int Rank { get; set; }
}

public class AppendTranscriptRequest
{
    [Required]
    public string Text { get; set; } = string.Empty;

    public DateTimeOffset StartedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset EndedAt { get; set; } = DateTimeOffset.UtcNow;

    public List<ScriptureMatchDto>? Matches { get; set; }
}
