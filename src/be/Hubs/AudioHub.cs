using System.Collections.Concurrent;
using HOPTranscribe.Models;
using HOPTranscribe.Services;
using Microsoft.AspNetCore.SignalR;

namespace HOPTranscribe.Hubs;

public class AudioHub : Hub
{
    private readonly ILogger<AudioHub> _logger;
    private readonly IDeepgramService _deepgramService;
    private readonly IOllamaService _ollamaService;
    private readonly IHubContext<AudioHub> _hubContext;

    // Track active Deepgram sessions per connection
    private static readonly ConcurrentDictionary<string, AudioStreamContext> _activeStreams = new();

    public AudioHub(
        ILogger<AudioHub> logger,
        IDeepgramService deepgramService,
        IOllamaService ollamaService,
        IHubContext<AudioHub> hubContext)
    {
        _logger = logger;
        _deepgramService = deepgramService;
        _ollamaService = ollamaService;
        _hubContext = hubContext;
    }

    public async Task StartStreaming(string sessionCode, string preferredVersion = "NIV")
    {
        var connectionId = Context.ConnectionId;
        _logger.LogInformation("Starting audio streaming for connection {ConnectionId} in session {SessionCode}",
            connectionId, sessionCode);

        try
        {
            // Join the session group
            await Groups.AddToGroupAsync(connectionId, sessionCode);

            // Create Deepgram session
            var deepgramSession = await _deepgramService.CreateSessionAsync();

            var streamContext = new AudioStreamContext
            {
                SessionCode = sessionCode,
                DeepgramSession = deepgramSession,
                PreferredVersion = preferredVersion,
                ConnectionId = connectionId,
                HubContext = _hubContext,
                OllamaService = _ollamaService,
                Logger = _logger
            };

            // Wire up transcript handler - use static method to avoid capturing 'this'
            deepgramSession.OnTranscript += async (transcript) =>
            {
                await HandleTranscriptStaticAsync(streamContext, transcript);
            };

            deepgramSession.OnError += (error) =>
            {
                _logger.LogError("Deepgram error for connection {ConnectionId}: {Error}", connectionId, error);
                _ = Clients.Client(connectionId).SendAsync("StreamError", error);
            };

            _activeStreams[connectionId] = streamContext;

            await Clients.Client(connectionId).SendAsync("StreamStarted", new
            {
                sessionCode,
                timestamp = DateTime.UtcNow
            });

            _logger.LogInformation("Audio streaming started for connection {ConnectionId}", connectionId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to start audio streaming for connection {ConnectionId}", connectionId);
            await Clients.Client(connectionId).SendAsync("StreamError", "Failed to start streaming");
            throw;
        }
    }

    public async Task SendAudio(string audioDataBase64)
    {
        var connectionId = Context.ConnectionId;

        if (!_activeStreams.TryGetValue(connectionId, out var context))
        {
            _logger.LogWarning("No active stream for connection {ConnectionId}", connectionId);
            return;
        }

        try
        {
            var audioData = Convert.FromBase64String(audioDataBase64);
            await context.DeepgramSession.SendAudioAsync(audioData);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending audio for connection {ConnectionId}", connectionId);
        }
    }

    public async Task StopStreaming()
    {
        var connectionId = Context.ConnectionId;
        _logger.LogInformation("Stopping audio streaming for connection {ConnectionId}", connectionId);

        if (_activeStreams.TryRemove(connectionId, out var context))
        {
            try
            {
                await context.DeepgramSession.CloseAsync();
                await context.DeepgramSession.DisposeAsync();

                await Clients.Client(connectionId).SendAsync("StreamStopped", new
                {
                    sessionCode = context.SessionCode,
                    timestamp = DateTime.UtcNow
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error closing stream for connection {ConnectionId}", connectionId);
            }
        }
    }

    private static async Task HandleTranscriptStaticAsync(AudioStreamContext context, DeepgramTranscript transcript)
    {
        try
        {
            var segmentId = Guid.NewGuid().ToString();
            var segment = new TranscriptSegment
            {
                Id = segmentId,
                Text = transcript.Transcript,
                Timestamp = DateTime.UtcNow,
                Confidence = transcript.Confidence
            };

            // Broadcast transcript immediately using hubContext from context
            await context.HubContext.Clients.Group(context.SessionCode).SendAsync("ReceiveTranscript", new
            {
                segment,
                isFinal = transcript.IsFinal,
                start = transcript.Start,
                duration = transcript.Duration,
                words = transcript.Words
            });

            context.Logger.LogDebug("Sent transcript to session {SessionCode}: {Text} (final: {IsFinal})",
                context.SessionCode,
                transcript.Transcript.Length > 50 ? transcript.Transcript[..50] + "..." : transcript.Transcript,
                transcript.IsFinal);

            // Only process final transcripts for scripture detection
            if (transcript.IsFinal && !string.IsNullOrWhiteSpace(transcript.Transcript))
            {
                context.Logger.LogDebug("Processing final transcript for scripture detection: {Transcript}",
                    transcript.Transcript.Length > 100 ? transcript.Transcript[..100] + "..." : transcript.Transcript);

                // Run scripture detection in background to avoid blocking transcript display
                _ = Task.Run(async () =>
                {
                    try
                    {
                        // Detect scripture references using Ollama
                        var references = await context.OllamaService.DetectScriptureReferencesAsync(
                            transcript.Transcript,
                            segmentId,
                            context.PreferredVersion);

                        if (references.Count > 0)
                        {
                            context.Logger.LogInformation("Detected {Count} scripture references in segment {SegmentId}",
                                references.Count, segmentId);

                            foreach (var reference in references)
                            {
                                await context.HubContext.Clients.Group(context.SessionCode).SendAsync("ReceiveScripture", reference);
                            }
                        }
                    }
                    catch (Exception ex)
                    {
                        context.Logger.LogError(ex, "Background scripture detection failed for segment {SegmentId}", segmentId);
                    }
                });
            }
        }
        catch (ObjectDisposedException)
        {
            // Ignore ObjectDisposedException as it likely means the connection is closing
            context.Logger.LogDebug("Connection disposed while handling transcript for session {SessionCode}", context.SessionCode);
        }
        catch (Exception ex)
        {
            context.Logger.LogError(ex, "Error handling transcript for session {SessionCode}", context.SessionCode);
        }
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var connectionId = Context.ConnectionId;
        _logger.LogInformation("Client {ConnectionId} disconnected from AudioHub", connectionId);

        if (_activeStreams.TryRemove(connectionId, out var context))
        {
            try
            {
                await context.DeepgramSession.CloseAsync();
                await context.DeepgramSession.DisposeAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error cleaning up stream for disconnected client {ConnectionId}", connectionId);
            }
        }

        await base.OnDisconnectedAsync(exception);
    }

    private class AudioStreamContext
    {
        public required string SessionCode { get; init; }
        public required string ConnectionId { get; init; }
        public required IDeepgramSession DeepgramSession { get; init; }
        public string PreferredVersion { get; init; } = "NIV";
        public required IHubContext<AudioHub> HubContext { get; init; }
        public required IOllamaService OllamaService { get; init; }
        public required ILogger Logger { get; init; }
    }
}
