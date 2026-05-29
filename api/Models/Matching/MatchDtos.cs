using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace HOPTranscribe.Api.Models.Matching;

public class MatchRequest
{
    [Required]
    public string SessionCode { get; set; } = string.Empty;

    [Required]
    [StringLength(4000, MinimumLength = 1)]
    public string Utterance { get; set; } = string.Empty;

    public string PreferredVersion { get; set; } = "NKJV";

    [Range(1, 5)]
    public int N { get; set; } = 3;
}

public class MatchResponse
{
    public List<ScriptureMatch> Matches { get; set; } = new();
}

public class ScriptureMatch
{
    public string Reference { get; set; } = string.Empty;
    public string Book { get; set; } = string.Empty;
    public int Chapter { get; set; }

    [JsonPropertyName("verseStart")]
    public int VerseStart { get; set; }

    [JsonPropertyName("verseEnd")]
    public int? VerseEnd { get; set; }

    public string Version { get; set; } = string.Empty;
    public string Quote { get; set; } = string.Empty;
    public double Confidence { get; set; }
}
