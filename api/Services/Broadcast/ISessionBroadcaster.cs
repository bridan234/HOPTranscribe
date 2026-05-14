using HOPTranscribe.Api.Models.Sessions;

namespace HOPTranscribe.Api.Services.Broadcast;

public interface ISessionBroadcaster
{
    Task TranscriptAppendedAsync(string sessionCode, TranscriptSegmentDto segment);
    Task SessionUpdatedAsync(string sessionCode, SessionDto session);
}
