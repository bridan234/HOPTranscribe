namespace HOPTranscribe.Configuration;

public class OpenAISettings
{
    public string ApiKey { get; set; } = string.Empty;
    public int TimeoutSeconds { get; set; } = 30;
    public string Voice { get; set; } = "alloy";
}

public class ApplicationSettings
{
    public string Version { get; set; } = "1.0.0";
    public string ApplicationName { get; set; } = "HOPTranscribe API";
}
