using HOPTranscribe.Api.Hubs;
using HOPTranscribe.Api.Models.Sessions;
using Microsoft.AspNetCore.SignalR;

namespace HOPTranscribe.Api.Services.Broadcast;

public class SignalRSessionBroadcaster : ISessionBroadcaster
{
    private readonly IHubContext<SessionHub> _hub;
    private readonly ILogger<SignalRSessionBroadcaster> _logger;

    public SignalRSessionBroadcaster(IHubContext<SessionHub> hub, ILogger<SignalRSessionBroadcaster> logger)
    {
        _hub = hub;
        _logger = logger;
    }

    public Task TranscriptAppendedAsync(string sessionCode, TranscriptSegmentDto segment)
    {
        var group = SessionHub.NormalizeGroup(sessionCode);
        _logger.LogDebug("Broadcasting TranscriptAppended to {Group} (segment {SegmentId})", group, segment.Id);
        return _hub.Clients.Group(group).SendAsync("TranscriptAppended", new
        {
            sessionCode,
            segment,
        });
    }

    public Task SessionUpdatedAsync(string sessionCode, SessionDto session)
    {
        var group = SessionHub.NormalizeGroup(sessionCode);
        return _hub.Clients.Group(group).SendAsync("SessionUpdated", new
        {
            sessionCode,
            session,
        });
    }
}
