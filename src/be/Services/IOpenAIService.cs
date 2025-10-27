using HOPTranscribe.Models.OpenAI;

namespace HOPTranscribe.Services;

public interface IOpenAIService
{
    Task<RealtimeSessionResponse> CreateRealtimeSessionAsync(CancellationToken cancellationToken = default);
}
