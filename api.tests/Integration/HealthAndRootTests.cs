using System.Net;

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
