using System.ComponentModel.DataAnnotations;

namespace HOPTranscribe.Api.Data.Entities;

public class SessionEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();

    [MaxLength(12)]
    public string Code { get; set; } = string.Empty;

    [MaxLength(200)]
    public string Title { get; set; } = string.Empty;

    [MaxLength(64)]
    public string OwnerUsername { get; set; } = string.Empty;

    [MaxLength(16)]
    public string Status { get; set; } = "active";

    [MaxLength(8)]
    public string Language { get; set; } = "en";

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public DateTimeOffset? EndedAt { get; set; }

    public List<TranscriptSegmentEntity> Segments { get; set; } = new();
}
