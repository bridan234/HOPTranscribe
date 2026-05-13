using System.Text.Json.Serialization;

namespace HOPTranscribe.Models.OpenAI;

/// <summary>
/// Response from OpenAI /v1/realtime/client_secrets endpoint
/// The API returns the ephemeral key at the root level, not nested in a session object
/// </summary>
public class RealtimeSessionResponse
{
    /// <summary>
    /// The ephemeral key value (starts with "ek_")
    /// </summary>
    [JsonPropertyName("value")]
    public string Value { get; set; } = string.Empty;

    /// <summary>
    /// Unix timestamp when the ephemeral key expires (typically 60 seconds)
    /// </summary>
    [JsonPropertyName("expires_at")]
    public long ExpiresAt { get; set; }

    /// <summary>
    /// The session configuration returned by OpenAI
    /// </summary>
    [JsonPropertyName("session")]
    public SessionDetails? Session { get; set; }
}

/// <summary>
/// Detailed session configuration returned by OpenAI
/// </summary>
public class SessionDetails
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("model")]
    public string Model { get; set; } = string.Empty;

    [JsonPropertyName("type")]
    public string Type { get; set; } = string.Empty;

    [JsonPropertyName("object")]
    public string Object { get; set; } = string.Empty;

    [JsonPropertyName("output_modalities")]
    public List<string> OutputModalities { get; set; } = new();

    [JsonPropertyName("instructions")]
    public string Instructions { get; set; } = string.Empty;

    [JsonPropertyName("audio")]
    public object? Audio { get; set; }
}
