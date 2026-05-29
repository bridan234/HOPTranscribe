using System.Text.Json.Serialization;

namespace HOPTranscribe.Api.Models.OpenAI;

public class CreateTranscriptionSessionRequest
{
    public string SessionCode { get; set; } = string.Empty;
}

public class TranscriptionSessionResponse
{
    public string ClientSecret { get; set; } = string.Empty;
    public DateTimeOffset ExpiresAt { get; set; }
    public string Model { get; set; } = string.Empty;
    public string SdpUrl { get; set; } = string.Empty;
    public string SessionId { get; set; } = string.Empty;
    public string Language { get; set; } = "en";
}

internal class OpenAIRealtimeClientSecretRequest
{
    [JsonPropertyName("expires_after")]
    public OpenAIClientSecretExpiry ExpiresAfter { get; set; } = new();

    [JsonPropertyName("session")]
    public OpenAIRealtimeTranscriptionSession Session { get; set; } = new();
}

internal class OpenAIClientSecretExpiry
{
    [JsonPropertyName("anchor")]
    public string Anchor { get; set; } = "created_at";

    [JsonPropertyName("seconds")]
    public int Seconds { get; set; } = 600;
}

internal class OpenAIRealtimeTranscriptionSession
{
    [JsonPropertyName("type")]
    public string Type { get; set; } = "transcription";

    [JsonPropertyName("audio")]
    public OpenAIRealtimeTranscriptionAudio Audio { get; set; } = new();
}

internal class OpenAIRealtimeTranscriptionAudio
{
    [JsonPropertyName("input")]
    public OpenAIRealtimeTranscriptionAudioInput Input { get; set; } = new();
}

internal class OpenAIRealtimeTranscriptionAudioInput
{
    [JsonPropertyName("format")]
    public OpenAIPcmAudioFormat Format { get; set; } = new();

    [JsonPropertyName("transcription")]
    public OpenAIInputAudioTranscription Transcription { get; set; } = new();

    [JsonPropertyName("turn_detection")]
    public OpenAITurnDetection? TurnDetection { get; set; }
}

internal class OpenAIPcmAudioFormat
{
    [JsonPropertyName("type")]
    public string Type { get; set; } = "audio/pcm";

    [JsonPropertyName("rate")]
    public int Rate { get; set; } = 24000;
}

internal class OpenAIInputAudioTranscription
{
    [JsonPropertyName("model")]
    public string Model { get; set; } = "gpt-realtime-whisper";

    [JsonPropertyName("language")]
    public string Language { get; set; } = "en";
}

internal class OpenAITurnDetection
{
    [JsonPropertyName("type")]
    public string Type { get; set; } = "server_vad";

    [JsonPropertyName("threshold")]
    public double Threshold { get; set; } = 0.5;

    [JsonPropertyName("prefix_padding_ms")]
    public int PrefixPaddingMs { get; set; } = 300;

    [JsonPropertyName("silence_duration_ms")]
    public int SilenceDurationMs { get; set; } = 500;
}

internal class OpenAIRealtimeClientSecretResponse
{
    [JsonPropertyName("value")]
    public string? Value { get; set; }

    [JsonPropertyName("expires_at")]
    public long ExpiresAt { get; set; }

    [JsonPropertyName("session")]
    public OpenAIRealtimeClientSecretSession? Session { get; set; }
}

internal class OpenAIRealtimeClientSecretSession
{
    [JsonPropertyName("id")]
    public string? Id { get; set; }
}
