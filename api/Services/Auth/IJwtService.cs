namespace HOPTranscribe.Api.Services.Auth;

public interface IJwtService
{
    (string token, DateTimeOffset expiresAt) IssueToken(string username);
}
