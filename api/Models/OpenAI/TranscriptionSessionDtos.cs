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

internal class OpenAITranscriptionSessionPayload
{
    [JsonPropertyName("input_audio_format")]
    public string InputAudioFormat { get; set; } = "pcm16";

    [JsonPropertyName("input_audio_transcription")]
    public OpenAIInputAudioTranscription InputAudioTranscription { get; set; } = new();

    [JsonPropertyName("turn_detection")]
    public OpenAITurnDetection TurnDetection { get; set; } = new();
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

internal class OpenAITranscriptionSessionResponse
{
    [JsonPropertyName("id")]
    public string? Id { get; set; }

    [JsonPropertyName("client_secret")]
    public OpenAIClientSecret? ClientSecret { get; set; }
}

internal class OpenAIClientSecret
{
    [JsonPropertyName("value")]
    public string? Value { get; set; }

    [JsonPropertyName("expires_at")]
    public long ExpiresAt { get; set; }
}
