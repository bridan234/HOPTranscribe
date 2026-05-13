using HOPTranscribe.Api.Models.Matching;

namespace HOPTranscribe.Api.Services.Matching;

public interface IScriptureMatchService
{
    Task<MatchResponse> MatchAsync(MatchRequest request, CancellationToken ct = default);
}
