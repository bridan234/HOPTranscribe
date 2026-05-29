using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using HOPTranscribe.Api.Models.Auth;
using HOPTranscribe.Api.Models.Common;

namespace HOPTranscribe.Api.Tests.Integration;

public static class TestAuthHelper
{
    private static readonly JsonSerializerOptions Json = new()
    {
        PropertyNameCaseInsensitive = true,
    };

    /// <summary>Claim a username via the real /api/auth/claim endpoint and apply the bearer token to the client.</summary>
    public static async Task<string> AuthenticateAsync(HttpClient client, string username)
    {
        var resp = await client.PostAsJsonAsync("/api/auth/claim", new ClaimRequest { Username = username });
        resp.EnsureSuccessStatusCode();

        var envelope = await resp.Content.ReadFromJsonAsync<ApiResponse<AuthResponse>>(Json);
        var token = envelope?.Data?.Token ?? throw new InvalidOperationException("No token in claim response.");

        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return token;
    }
}
