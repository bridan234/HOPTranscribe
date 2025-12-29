namespace HOPTranscribe.Configuration;

public class OllamaSettings
{
    public string BaseUrl { get; set; } = "http://localhost:11434";
    public string Model { get; set; } = "llama3.2:1b";
    public int TimeoutSeconds { get; set; } = 30;
    public float Temperature { get; set; } = 0.1f;
    public int MaxTokens { get; set; } = 256;
}
