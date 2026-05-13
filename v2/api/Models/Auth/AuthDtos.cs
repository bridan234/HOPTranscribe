using System.ComponentModel.DataAnnotations;

namespace HOPTranscribe.Api.Models.Auth;

public class ClaimRequest
{
    [Required]
    [StringLength(64, MinimumLength = 2)]
    [RegularExpression(@"^[a-zA-Z0-9_\- ]+$", ErrorMessage = "Username may only contain letters, numbers, spaces, hyphens, and underscores.")]
    public string Username { get; set; } = string.Empty;
}

public class AuthResponse
{
    public string Token { get; set; } = string.Empty;
    public DateTimeOffset ExpiresAt { get; set; }
    public string Username { get; set; } = string.Empty;
}
