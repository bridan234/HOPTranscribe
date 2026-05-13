using System.ComponentModel.DataAnnotations;

namespace HOPTranscribe.Models;

public class CreateSessionRequest
{
    [Required(ErrorMessage = "UserName is required")]
    [StringLength(50, MinimumLength = 2, ErrorMessage = "UserName must be between 2 and 50 characters")]
    public string UserName { get; set; } = null!;
    
    [Required(ErrorMessage = "Title is required")]
    [StringLength(200, MinimumLength = 3, ErrorMessage = "Title must be between 3 and 200 characters")]
    public string Title { get; set; } = null!;
    
    public SessionMetadata? Metadata { get; set; }
}

public class UpdateSessionRequest
{
    public string? Title { get; set; }
    public SessionStatus? Status { get; set; }
    public bool? IsRecording { get; set; }
    public bool? IsPaused { get; set; }
    public SessionMetadata? Metadata { get; set; }
}

public class AddTranscriptRequest
{
    [Required]
    public string Text { get; set; } = null!;
    
    [Range(0, 1)]
    public double Confidence { get; set; }
}

public class AddScriptureRequest
{
    [Required]
    public string Book { get; set; } = null!;
    
    [Range(1, 150)]
    public int Chapter { get; set; }
    
    [Range(1, 176)]
    public int Verse { get; set; }
    
    [Required]
    public string Version { get; set; } = null!;
    
    [Required]
    public string Text { get; set; } = null!;
    
    [Range(0, 1)]
    public double Confidence { get; set; }
    
    [Required]
    public string TranscriptSegmentId { get; set; } = null!;
}
