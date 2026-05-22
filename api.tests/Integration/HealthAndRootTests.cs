using System.Net;
using System.Text.Json;

namespace HOPTranscribe.Api.Tests.Integration;

public class HealthAndRootTests : IClassFixture<HopApiFactory>
{
    private readonly HopApiFactory _factory;

    public HealthAndRootTests(HopApiFactory factory) => _factory = factory;

    [Fact]
    public async Task Health_Endpoint_Returns_200()
    {
        var client = _factory.CreateClient();
        var resp = await client.GetAsync("/health/status");
        resp.StatusCode.Should().Be(HttpStatusCode.OK);

        var body = await resp.Content.ReadAsStringAsync();
        using var json = JsonDocument.Parse(body);

        json.RootElement.GetProperty("status").GetString().Should().Be("Healthy");
        var checks = json.RootElement.GetProperty("checks").EnumerateArray().ToList();
        checks.Select(x => x.GetProperty("name").GetString())
            .Should()
            .Contain(new[] { "database", "storage", "openai" });
    }

    [Fact]
    public async Task Root_Endpoint_Reports_Service_Name_And_Version()
    {
        var client = _factory.CreateClient();
        var resp = await client.GetAsync("/");
        resp.StatusCode.Should().Be(HttpStatusCode.OK);

        var body = await resp.Content.ReadAsStringAsync();
        body.Should().Contain("HOPTranscribe.Api");
        body.Should().Contain("v2");
    }
}
