using System.Text.Json.Serialization;

namespace HOPTranscribe.Models.OpenAI;

public class RealtimeSessionRequest
{
    [JsonPropertyName("session")]
    public SessionConfig Session { get; set; } = new();
}

public class SessionConfig
{
    [JsonPropertyName("type")]
    public string Type { get; set; } = string.Empty;

    [JsonPropertyName("model")]
    public string Model { get; set; } = string.Empty;

    [JsonPropertyName("instructions")]
    public string? Instructions { get; set; }

    [JsonPropertyName("tools")]
    public List<ToolDefinition>? Tools { get; set; }

    [JsonPropertyName("audio")]
    public AudioConfig? Audio { get; set; }
}

public class AudioConfig
{
    [JsonPropertyName("output")]
    public AudioOutput? Output { get; set; }
}

public class AudioOutput
{
    [JsonPropertyName("voice")]
    public string? Voice { get; set; }
}

public class InputAudioTranscriptionConfig
{
    [JsonPropertyName("model")]
    public string Model { get; set; } = string.Empty;
}

public class ToolDefinition
{
    [JsonPropertyName("type")]
    public string Type { get; set; } = "function";

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("description")]
    public string? Description { get; set; }

    [JsonPropertyName("parameters")]
    public object Parameters { get; set; } = new();
}
