using HOPTranscribe.Api.Models.Auth;
using HOPTranscribe.Api.Models.Common;
using HOPTranscribe.Api.Services.Auth;
using Microsoft.AspNetCore.Mvc;

namespace HOPTranscribe.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly IJwtService _jwt;

    public AuthController(IJwtService jwt)
    {
        _jwt = jwt;
    }

    [HttpPost("claim")]
    public ActionResult<ApiResponse<AuthResponse>> Claim([FromBody] ClaimRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ApiResponse<AuthResponse>.Fail("Invalid username."));

        var username = request.Username.Trim();
        var (token, expiresAt) = _jwt.IssueToken(username);
        return Ok(ApiResponse<AuthResponse>.Ok(new AuthResponse
        {
            Token = token,
            ExpiresAt = expiresAt,
            Username = username,
        }));
    }
}
