using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using HOPTranscribe.Configuration;
using Microsoft.Extensions.Options;

namespace HOPTranscribe.Services;

public interface IDeepgramService
{
    Task<IDeepgramSession> CreateSessionAsync(CancellationToken cancellationToken = default);
}

public interface IDeepgramSession : IAsyncDisposable
{
    event Action<DeepgramTranscript>? OnTranscript;
    event Action<string>? OnError;
    Task SendAudioAsync(byte[] audioData, CancellationToken cancellationToken = default);
    Task CloseAsync(CancellationToken cancellationToken = default);
}

public record DeepgramTranscript(
    string Transcript,
    bool IsFinal,
    double Confidence,
    double Start,
    double Duration,
    string[] Words
);

public class DeepgramService : IDeepgramService
{
    private readonly DeepgramSettings _settings;
    private readonly ILogger<DeepgramService> _logger;

    public DeepgramService(IOptions<DeepgramSettings> settings, ILogger<DeepgramService> logger)
    {
        _settings = settings.Value;
        _logger = logger;
    }

    public async Task<IDeepgramSession> CreateSessionAsync(CancellationToken cancellationToken = default)
    {
        var session = new DeepgramSession(_settings, _logger);
        await session.ConnectAsync(cancellationToken);
        return session;
    }
}

internal class DeepgramSession : IDeepgramSession
{
    private readonly DeepgramSettings _settings;
    private readonly ILogger _logger;
    private readonly ClientWebSocket _webSocket;
    private CancellationTokenSource? _receiveCts;
    private Task? _receiveTask;

    public event Action<DeepgramTranscript>? OnTranscript;
    public event Action<string>? OnError;

    public DeepgramSession(DeepgramSettings settings, ILogger logger)
    {
        _settings = settings;
        _logger = logger;
        _webSocket = new ClientWebSocket();
    }

    public async Task ConnectAsync(CancellationToken cancellationToken)
    {
        var queryParams = new Dictionary<string, string>
        {
            ["model"] = _settings.Model,
            ["language"] = _settings.Language,
            ["punctuate"] = _settings.Punctuate.ToString().ToLower(),
            ["interim_results"] = _settings.InterimResults.ToString().ToLower(),
            ["sample_rate"] = _settings.SampleRate.ToString(),
            ["encoding"] = "linear16",
            ["channels"] = "1"
        };

        var queryString = string.Join("&", queryParams.Select(kvp => $"{kvp.Key}={kvp.Value}"));
        var uri = new Uri($"wss://api.deepgram.com/v1/listen?{queryString}");

        _webSocket.Options.SetRequestHeader("Authorization", $"Token {_settings.ApiKey}");

        _logger.LogInformation("Connecting to Deepgram WebSocket...");
        await _webSocket.ConnectAsync(uri, cancellationToken);
        _logger.LogInformation("Connected to Deepgram WebSocket");

        _receiveCts = new CancellationTokenSource();
        _receiveTask = ReceiveLoopAsync(_receiveCts.Token);
        _ = KeepAliveLoopAsync(_receiveCts.Token);
    }

    public async Task SendAudioAsync(byte[] audioData, CancellationToken cancellationToken = default)
    {
        if (_webSocket.State != WebSocketState.Open)
        {
            _logger.LogWarning("Cannot send audio - WebSocket not open");
            return;
        }

        await _webSocket.SendAsync(
            new ArraySegment<byte>(audioData),
            WebSocketMessageType.Binary,
            endOfMessage: true,
            cancellationToken);
    }

    public async Task CloseAsync(CancellationToken cancellationToken = default)
    {
        if (_webSocket.State == WebSocketState.Open)
        {
            // Send close message to Deepgram
            var closeMessage = Encoding.UTF8.GetBytes("{\"type\":\"CloseStream\"}");
            await _webSocket.SendAsync(
                new ArraySegment<byte>(closeMessage),
                WebSocketMessageType.Text,
                endOfMessage: true,
                cancellationToken);

            await _webSocket.CloseAsync(WebSocketCloseStatus.NormalClosure, "Session ended", cancellationToken);
        }

        _receiveCts?.Cancel();
        if (_receiveTask != null)
        {
            try
            {
                await _receiveTask;
            }
            catch (OperationCanceledException)
            {
                // Expected
            }
        }
    }

    private async Task ReceiveLoopAsync(CancellationToken cancellationToken)
    {
        var buffer = new byte[8192];
        var messageBuffer = new List<byte>();

        try
        {
            while (!cancellationToken.IsCancellationRequested && _webSocket.State == WebSocketState.Open)
            {
                var result = await _webSocket.ReceiveAsync(new ArraySegment<byte>(buffer), cancellationToken);

                if (result.MessageType == WebSocketMessageType.Close)
                {
                    _logger.LogInformation("Deepgram WebSocket closed by server. Status: {Status}, Description: {Description}", 
                        result.CloseStatus, 
                        result.CloseStatusDescription);
                    break;
                }

                messageBuffer.AddRange(buffer.Take(result.Count));

                if (result.EndOfMessage)
                {
                    var message = Encoding.UTF8.GetString(messageBuffer.ToArray());
                    messageBuffer.Clear();
                    ProcessMessage(message);
                }
            }
        }
        catch (OperationCanceledException)
        {
            // Expected when closing
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in Deepgram receive loop");
            OnError?.Invoke(ex.Message);
        }
    }

    private void ProcessMessage(string message)
    {
        try
        {
            using var doc = JsonDocument.Parse(message);
            var root = doc.RootElement;

            if (!root.TryGetProperty("type", out var typeElement))
                return;

            var type = typeElement.GetString();

            if (type == "Results")
            {
                var channel = root.GetProperty("channel");
                var alternatives = channel.GetProperty("alternatives");

                if (alternatives.GetArrayLength() > 0)
                {
                    var alt = alternatives[0];
                    var transcript = alt.GetProperty("transcript").GetString() ?? "";

                    if (!string.IsNullOrWhiteSpace(transcript))
                    {
                        var isFinal = root.GetProperty("is_final").GetBoolean();
                        var confidence = alt.GetProperty("confidence").GetDouble();
                        var start = root.GetProperty("start").GetDouble();
                        var duration = root.GetProperty("duration").GetDouble();

                        var words = new List<string>();
                        if (alt.TryGetProperty("words", out var wordsArray))
                        {
                            foreach (var word in wordsArray.EnumerateArray())
                            {
                                var w = word.GetProperty("word").GetString();
                                if (!string.IsNullOrEmpty(w))
                                    words.Add(w);
                            }
                        }

                        var transcriptResult = new DeepgramTranscript(
                            transcript,
                            isFinal,
                            confidence,
                            start,
                            duration,
                            words.ToArray()
                        );

                        _logger.LogInformation("Transcript: {Transcript} (final: {IsFinal})", transcript, isFinal);
                        OnTranscript?.Invoke(transcriptResult);
                    }
                }
            }
            else if (type == "Metadata")
            {
                _logger.LogDebug("Received Deepgram metadata");
            }
            else if (type == "Error")
            {
                var errorMessage = root.TryGetProperty("message", out var msg)
                    ? msg.GetString() ?? "Unknown error"
                    : "Unknown error";
                _logger.LogError("Deepgram error: {Error}", errorMessage);
                OnError?.Invoke(errorMessage);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to parse Deepgram message: {Message}", message);
        }
    }

    private async Task KeepAliveLoopAsync(CancellationToken cancellationToken)
    {
        var keepAliveMessage = Encoding.UTF8.GetBytes("{\"type\":\"KeepAlive\"}");
        var segment = new ArraySegment<byte>(keepAliveMessage);

        try
        {
            while (!cancellationToken.IsCancellationRequested && _webSocket.State == WebSocketState.Open)
            {
                await Task.Delay(3000, cancellationToken); // Send every 3 seconds
                
                if (_webSocket.State == WebSocketState.Open)
                {
                    await _webSocket.SendAsync(
                        segment,
                        WebSocketMessageType.Text,
                        endOfMessage: true,
                        cancellationToken);
                }
            }
        }
        catch (OperationCanceledException)
        {
            // Expected
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error in KeepAlive loop");
        }
    }

    public async ValueTask DisposeAsync()
    {
        await CloseAsync();
        _webSocket.Dispose();
        _receiveCts?.Dispose();
    }
}
