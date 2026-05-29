using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using HOPTranscribe.Api.Models.Auth;
using HOPTranscribe.Api.Models.Common;

namespace HOPTranscribe.Api.Tests.Integration;

public class AuthControllerTests : IClassFixture<HopApiFactory>
{
    private readonly HopApiFactory _factory;

    private static readonly JsonSerializerOptions Json = new() { PropertyNameCaseInsensitive = true };

    public AuthControllerTests(HopApiFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Claim_Returns_Token_For_Valid_Username()
    {
        var client = _factory.CreateClient();

        var resp = await client.PostAsJsonAsync("/api/auth/claim", new ClaimRequest { Username = "alice" });

        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await resp.Content.ReadFromJsonAsync<ApiResponse<AuthResponse>>(Json);
        body.Should().NotBeNull();
        body!.Success.Should().BeTrue();
        body.Data!.Token.Should().NotBeNullOrWhiteSpace();
        body.Data.Username.Should().Be("alice");
        body.Data.ExpiresAt.Should().BeAfter(DateTimeOffset.UtcNow);
    }

    [Fact]
    public async Task Claim_Trims_Whitespace_From_Username()
    {
        var client = _factory.CreateClient();

        var resp = await client.PostAsJsonAsync("/api/auth/claim", new ClaimRequest { Username = "  alice  " });

        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await resp.Content.ReadFromJsonAsync<ApiResponse<AuthResponse>>(Json);
        body!.Data!.Username.Should().Be("alice");
    }

    [Theory]
    [InlineData("")]
    [InlineData("a")] // too short
    [InlineData("!!!!")] // invalid characters
    [InlineData("name@with#chars")] // invalid characters
    public async Task Claim_Rejects_Invalid_Username(string username)
    {
        var client = _factory.CreateClient();

        var resp = await client.PostAsJsonAsync("/api/auth/claim", new ClaimRequest { Username = username });

        resp.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Anonymous_Request_To_Sessions_Endpoint_Returns_401()
    {
        var client = _factory.CreateClient();

        var resp = await client.GetAsync("/api/sessions");

        resp.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }
}
