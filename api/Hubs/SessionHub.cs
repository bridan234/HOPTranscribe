using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace HOPTranscribe.Api.Hubs;

[Authorize]
public class SessionHub : Hub
{
    private readonly ILogger<SessionHub> _logger;

    public SessionHub(ILogger<SessionHub> logger)
    {
        _logger = logger;
    }

    private string CurrentUser =>
        Context.User?.FindFirstValue(ClaimTypes.Name)
        ?? Context.User?.FindFirstValue("sub")
        ?? "unknown";

    public async Task JoinSession(string sessionCode)
    {
        if (string.IsNullOrWhiteSpace(sessionCode)) return;
        var group = NormalizeGroup(sessionCode);
        await Groups.AddToGroupAsync(Context.ConnectionId, group);
        _logger.LogInformation("{User} joined session group {Group}", CurrentUser, group);
        await Clients.OthersInGroup(group).SendAsync("ViewerJoined", new { username = CurrentUser });
    }

    public async Task LeaveSession(string sessionCode)
    {
        if (string.IsNullOrWhiteSpace(sessionCode)) return;
        var group = NormalizeGroup(sessionCode);
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, group);
        await Clients.OthersInGroup(group).SendAsync("ViewerLeft", new { username = CurrentUser });
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        _logger.LogDebug("Connection {ConnectionId} disconnected", Context.ConnectionId);
        await base.OnDisconnectedAsync(exception);
    }

    internal static string NormalizeGroup(string sessionCode) => $"session:{sessionCode.Trim().ToUpperInvariant()}";
}
