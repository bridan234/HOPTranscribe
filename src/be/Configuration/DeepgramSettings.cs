namespace HOPTranscribe.Configuration;

public class DeepgramSettings
{
    public string ApiKey { get; set; } = string.Empty;
    public string Model { get; set; } = "nova-2";
    public string Language { get; set; } = "en-US";
    public bool InterimResults { get; set; } = true;
    public bool Punctuate { get; set; } = true;
    public int SampleRate { get; set; } = 16000;
}
