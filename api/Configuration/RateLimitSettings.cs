namespace HOPTranscribe.Api.Configuration;

public class RateLimitSettings
{
    public int MatchPerSessionPerMinute { get; set; } = 30;
    public int MatchPerIpPerMinute { get; set; } = 120;
}
