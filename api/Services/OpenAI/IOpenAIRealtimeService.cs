using HOPTranscribe.Api.Models.OpenAI;

namespace HOPTranscribe.Api.Services.OpenAI;

public interface IOpenAIRealtimeService
{
    Task<TranscriptionSessionResponse> CreateTranscriptionSessionAsync(string language, CancellationToken ct = default);
}
