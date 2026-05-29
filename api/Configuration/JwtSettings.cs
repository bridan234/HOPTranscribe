namespace HOPTranscribe.Api.Configuration;

public class JwtSettings
{
    public string Issuer { get; set; } = "hoptranscribe-api";
    public string Audience { get; set; } = "hoptranscribe-web";
    public string SigningKey { get; set; } = string.Empty;
    public int ExpiryMinutes { get; set; } = 720;
}
