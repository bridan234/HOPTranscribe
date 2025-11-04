using Microsoft.AspNetCore.SignalR;

namespace HOPTranscribe.Hubs;

public class SessionHub : Hub
{
    private readonly ILogger<SessionHub> _logger;

    public SessionHub(ILogger<SessionHub> logger)
    {
        _logger = logger;
    }

    public async Task JoinSession(string sessionCode)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, sessionCode);
        _logger.LogInformation("Client {ConnectionId} joined session {SessionCode}", Context.ConnectionId, sessionCode);
        
        // Notify others in the session
        await Clients.OthersInGroup(sessionCode).SendAsync("UserJoined", new
        {
            connectionId = Context.ConnectionId,
            timestamp = DateTime.UtcNow
        });
    }

    public async Task LeaveSession(string sessionCode)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, sessionCode);
        _logger.LogInformation("Client {ConnectionId} left session {SessionCode}", Context.ConnectionId, sessionCode);
        
        // Notify others in the session
        await Clients.OthersInGroup(sessionCode).SendAsync("UserLeft", new
        {
            connectionId = Context.ConnectionId,
            timestamp = DateTime.UtcNow
        });
    }

    public async Task BroadcastTranscript(string sessionCode, object segment)
    {
        _logger.LogDebug("Broadcasting transcript to session {SessionCode}", sessionCode);
        await Clients.OthersInGroup(sessionCode).SendAsync("ReceiveTranscript", segment);
    }

    public async Task BroadcastScripture(string sessionCode, object reference)
    {
        _logger.LogDebug("Broadcasting scripture to session {SessionCode}", sessionCode);
        await Clients.OthersInGroup(sessionCode).SendAsync("ReceiveScripture", reference);
    }

    public async Task BroadcastSessionUpdate(string sessionCode, object session)
    {
        _logger.LogDebug("Broadcasting session update to {SessionCode}", sessionCode);
        await Clients.OthersInGroup(sessionCode).SendAsync("ReceiveSessionUpdate", session);
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        _logger.LogInformation("Client {ConnectionId} disconnected", Context.ConnectionId);
        await base.OnDisconnectedAsync(exception);
    }
}
