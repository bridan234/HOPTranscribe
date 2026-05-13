using HOPTranscribe.Models.OpenAI;

namespace HOPTranscribe.Services;

public interface IOpenAIService
{
    Task<RealtimeSessionResponse> CreateRealtimeSessionAsync(CancellationToken cancellationToken = default);
    Task<string> GetChatCompletionAsync(string systemPrompt, string userPrompt, CancellationToken cancellationToken = default);
}
