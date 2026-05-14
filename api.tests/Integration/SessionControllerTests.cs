using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using HOPTranscribe.Api.Models.Common;
using HOPTranscribe.Api.Models.Sessions;

namespace HOPTranscribe.Api.Tests.Integration;

public class SessionControllerTests : IClassFixture<HopApiFactory>
{
    private readonly HopApiFactory _factory;

    private static readonly JsonSerializerOptions Json = new() { PropertyNameCaseInsensitive = true };

    public SessionControllerTests(HopApiFactory factory)
    {
        _factory = factory;
        // Reset captured broadcasts between tests (xUnit reuses the fixture).
        _factory.Broadcaster.SessionUpdates.Clear();
        _factory.Broadcaster.Transcripts.Clear();
    }

    [Fact]
    public async Task Full_Session_Lifecycle_E2E()
    {
        var client = _factory.CreateClient();
        await TestAuthHelper.AuthenticateAsync(client, "alice");

        // 1. Create
        var createResp = await client.PostAsJsonAsync("/api/sessions", new CreateSessionRequest { Title = "Sunday Service" });
        createResp.StatusCode.Should().Be(HttpStatusCode.Created);
        var created = (await createResp.Content.ReadFromJsonAsync<ApiResponse<SessionDto>>(Json))!.Data!;
        created.Code.Should().HaveLength(6);
        created.OwnerUsername.Should().Be("alice");
        created.Status.Should().Be("active");

        // 2. Get
        var getResp = await client.GetAsync($"/api/sessions/{created.Code}");
        getResp.StatusCode.Should().Be(HttpStatusCode.OK);
        var fetched = (await getResp.Content.ReadFromJsonAsync<ApiResponse<SessionDto>>(Json))!.Data!;
        fetched.Code.Should().Be(created.Code);

        // 3. Append a transcript with matches
        var appendResp = await client.PostAsJsonAsync($"/api/sessions/{created.Code}/transcripts", new AppendTranscriptRequest
        {
            Text = "For God so loved the world",
            StartedAt = DateTimeOffset.UtcNow,
            EndedAt = DateTimeOffset.UtcNow.AddSeconds(2),
            Matches = new List<ScriptureMatchDto>
            {
                new()
                {
                    Reference = "John 3:16",
                    Book = "John",
                    Chapter = 3,
                    VerseStart = 16,
                    Version = "NKJV",
                    Quote = "For God so loved the world…",
                    Confidence = 0.95,
                },
            },
        });
        appendResp.StatusCode.Should().Be(HttpStatusCode.OK);
        var segment = (await appendResp.Content.ReadFromJsonAsync<ApiResponse<TranscriptSegmentDto>>(Json))!.Data!;
        segment.Matches.Should().HaveCount(1);
        segment.Matches[0].Reference.Should().Be("John 3:16");

        // Broadcaster should have observed the transcript event
        _factory.Broadcaster.Transcripts.Should().ContainSingle(t => t.Code == created.Code);

        // 4. List transcripts
        var listResp = await client.GetAsync($"/api/sessions/{created.Code}/transcripts");
        listResp.StatusCode.Should().Be(HttpStatusCode.OK);
        var segments = (await listResp.Content.ReadFromJsonAsync<ApiResponse<List<TranscriptSegmentDto>>>(Json))!.Data!;
        segments.Should().HaveCount(1);
        segments[0].Text.Should().Be("For God so loved the world");

        // 5. End session
        var endResp = await client.PatchAsync($"/api/sessions/{created.Code}/end", null);
        endResp.StatusCode.Should().Be(HttpStatusCode.OK);
        var ended = (await endResp.Content.ReadFromJsonAsync<ApiResponse<SessionDto>>(Json))!.Data!;
        ended.Status.Should().Be("ended");
        ended.EndedAt.Should().NotBeNull();

        _factory.Broadcaster.SessionUpdates.Should().ContainSingle(s => s.Code == created.Code);

        // 6. Delete
        var deleteResp = await client.DeleteAsync($"/api/sessions/{created.Code}");
        deleteResp.StatusCode.Should().Be(HttpStatusCode.NoContent);

        // 7. Get after delete → 404
        var afterDelete = await client.GetAsync($"/api/sessions/{created.Code}");
        afterDelete.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task List_Returns_Only_Sessions_Owned_By_Caller()
    {
        var aliceClient = _factory.CreateClient();
        await TestAuthHelper.AuthenticateAsync(aliceClient, "list-alice");
        await aliceClient.PostAsJsonAsync("/api/sessions", new CreateSessionRequest { Title = "Alice 1" });
        await aliceClient.PostAsJsonAsync("/api/sessions", new CreateSessionRequest { Title = "Alice 2" });

        var bobClient = _factory.CreateClient();
        await TestAuthHelper.AuthenticateAsync(bobClient, "list-bob");
        await bobClient.PostAsJsonAsync("/api/sessions", new CreateSessionRequest { Title = "Bob 1" });

        var aliceList = await aliceClient.GetFromJsonAsync<ApiResponse<PaginatedResult<SessionDto>>>("/api/sessions", Json);
        var bobList = await bobClient.GetFromJsonAsync<ApiResponse<PaginatedResult<SessionDto>>>("/api/sessions", Json);

        aliceList!.Data!.Items.Should().HaveCount(2);
        aliceList.Data.Items.Should().OnlyContain(s => s.OwnerUsername == "list-alice");

        bobList!.Data!.Items.Should().ContainSingle()
            .Which.OwnerUsername.Should().Be("list-bob");
    }

    [Fact]
    public async Task End_By_Non_Owner_Returns_403()
    {
        var aliceClient = _factory.CreateClient();
        await TestAuthHelper.AuthenticateAsync(aliceClient, "owner-alice");
        var createResp = await aliceClient.PostAsJsonAsync("/api/sessions", new CreateSessionRequest { Title = "Service" });
        var created = (await createResp.Content.ReadFromJsonAsync<ApiResponse<SessionDto>>(Json))!.Data!;

        var malloryClient = _factory.CreateClient();
        await TestAuthHelper.AuthenticateAsync(malloryClient, "mallory");

        var endResp = await malloryClient.PatchAsync($"/api/sessions/{created.Code}/end", null);

        endResp.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task Delete_By_Non_Owner_Returns_403()
    {
        var aliceClient = _factory.CreateClient();
        await TestAuthHelper.AuthenticateAsync(aliceClient, "del-alice");
        var createResp = await aliceClient.PostAsJsonAsync("/api/sessions", new CreateSessionRequest { Title = "Service" });
        var created = (await createResp.Content.ReadFromJsonAsync<ApiResponse<SessionDto>>(Json))!.Data!;

        var malloryClient = _factory.CreateClient();
        await TestAuthHelper.AuthenticateAsync(malloryClient, "del-mallory");

        var deleteResp = await malloryClient.DeleteAsync($"/api/sessions/{created.Code}");

        deleteResp.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task AppendTranscript_By_Non_Owner_Returns_403()
    {
        var aliceClient = _factory.CreateClient();
        await TestAuthHelper.AuthenticateAsync(aliceClient, "tx-alice");
        var createResp = await aliceClient.PostAsJsonAsync("/api/sessions", new CreateSessionRequest { Title = "Service" });
        var created = (await createResp.Content.ReadFromJsonAsync<ApiResponse<SessionDto>>(Json))!.Data!;

        var malloryClient = _factory.CreateClient();
        await TestAuthHelper.AuthenticateAsync(malloryClient, "tx-mallory");

        var appendResp = await malloryClient.PostAsJsonAsync($"/api/sessions/{created.Code}/transcripts", new AppendTranscriptRequest
        {
            Text = "shouldn't write",
        });

        appendResp.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task Get_Missing_Session_Returns_404()
    {
        var client = _factory.CreateClient();
        await TestAuthHelper.AuthenticateAsync(client, "alice-404");

        var resp = await client.GetAsync("/api/sessions/ZZZZZZ");

        resp.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Create_With_Invalid_Title_Returns_400()
    {
        var client = _factory.CreateClient();
        await TestAuthHelper.AuthenticateAsync(client, "alice-400");

        var resp = await client.PostAsJsonAsync("/api/sessions", new CreateSessionRequest { Title = "" });

        resp.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }
}
