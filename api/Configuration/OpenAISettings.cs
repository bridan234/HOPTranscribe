namespace HOPTranscribe.Api.Configuration;

public class OpenAISettings
{
    public string ApiKey { get; set; } = string.Empty;
    public string BaseUrl { get; set; } = "https://api.openai.com";
    public string TranscriptionModel { get; set; } = "gpt-realtime-whisper";
    public string MatchingModel { get; set; } = "gpt-5-mini";
    public string MatchingFallbackModel { get; set; } = "gpt-4o-mini";
    public double MatchingTemperature { get; set; } = 0.2;
    public int MatchingMaxOutputTokens { get; set; } = 1200;
    public int TimeoutSeconds { get; set; } = 30;
}
