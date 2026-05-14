namespace HOPTranscribe.Api.Data.Entities;

public class TranscriptSegmentEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid SessionId { get; set; }
    public SessionEntity? Session { get; set; }

    public string Text { get; set; } = string.Empty;

    public DateTimeOffset StartedAt { get; set; }

    public DateTimeOffset EndedAt { get; set; }

    public List<ScriptureMatchEntity> Matches { get; set; } = new();
}
