using System.Text;
using System.Text.Json;
using HOPTranscribe.Configuration;
using HOPTranscribe.Models;
using Microsoft.Extensions.Options;

namespace HOPTranscribe.Services;

public interface IOllamaService
{
    Task<List<ScriptureReference>> DetectScriptureReferencesAsync(
        string transcriptText,
        string transcriptSegmentId,
        string preferredVersion = "NIV",
        CancellationToken cancellationToken = default);
}

public class OllamaService : IOllamaService
{
    private readonly HttpClient _httpClient;
    private readonly OllamaSettings _settings;
    private readonly ILogger<OllamaService> _logger;

    private const string ScriptureDetectionPrompt = @"Detect Bible verses. Return ONLY JSON array:

EXAMPLES:
Input: ""The story of David and Goliath""
Output: [{{""book"":""1 Samuel"",""chapter"":17,""verse"":1,""confidence"":0.85,""quote"":""Now the Philistines gathered their forces for war and assembled at Sokoh in Judah. They pitched camp at Ephes Dammim, between Sokoh and Azekah."", ""Transcript"":""The story of David and Goliath""}}]

Input: ""John 3:16 says God loved the world""
Output: [{{""book"":""John"",""chapter"":3,""verse"":16,""confidence"":0.95,""quote"":""For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life."", ""Transcript"":""John 3:16 says God loved the world""}}]

RULES:
- book must be FULL Bible book name: ""1 Samuel"", ""John"", ""Genesis"", ""Psalm"", etc
- Never use just numbers like ""1"" or ""2"" for book  
- Return [] if no verses
- No markdown, no code fences
- Return valid JSON ONLY
- Retutrn up to 4 references per input with confidence score >= 0.7 if any found else []

Text: {0}";

    public OllamaService(
        HttpClient httpClient,
        IOptions<OllamaSettings> settings,
        ILogger<OllamaService> logger)
    {
        _httpClient = httpClient;
        _settings = settings.Value;
        _logger = logger;

        _httpClient.BaseAddress = new Uri(_settings.BaseUrl);
        _httpClient.Timeout = TimeSpan.FromSeconds(_settings.TimeoutSeconds);
    }

    public async Task<List<ScriptureReference>> DetectScriptureReferencesAsync(
        string transcriptText,
        string transcriptSegmentId,
        string preferredVersion = "NIV",
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(transcriptText))
        {
            return new List<ScriptureReference>();
        }

        try
        {
            _logger.LogDebug("Detecting scripture references in transcript segment {SegmentId}", transcriptSegmentId);

            var prompt = string.Format(ScriptureDetectionPrompt, transcriptText);

            var request = new
            {
                model = _settings.Model,
                prompt = prompt,
                stream = false,
                options = new
                {
                    temperature = _settings.Temperature,
                    num_predict = _settings.MaxTokens
                }
            };

            var jsonContent = JsonSerializer.Serialize(request);
            var httpContent = new StringContent(jsonContent, Encoding.UTF8, "application/json");

            var response = await _httpClient.PostAsync("/api/generate", httpContent, cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                var errorContent = await response.Content.ReadAsStringAsync(cancellationToken);
                _logger.LogError("Ollama API error. Status: {StatusCode}, Content: {Content}",
                    response.StatusCode, errorContent);
                return new List<ScriptureReference>();
            }

            var responseContent = await response.Content.ReadAsStringAsync(cancellationToken);
            
            // Temporary debug log to see raw response
            _logger.LogInformation("Ollama Raw Response: {Response}", responseContent);

            var ollamaResponse = JsonSerializer.Deserialize<OllamaGenerateResponse>(responseContent);

            if (ollamaResponse?.Response == null)
            {
                _logger.LogWarning("Empty response from Ollama");
                return new List<ScriptureReference>();
            }

            return ParseScriptureReferences(ollamaResponse.Response, transcriptSegmentId, preferredVersion);
        }
        catch (TaskCanceledException)
        {
            _logger.LogDebug("Scripture detection cancelled for segment {SegmentId}", transcriptSegmentId);
            return new List<ScriptureReference>();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error detecting scripture references in segment {SegmentId}", transcriptSegmentId);
            return new List<ScriptureReference>();
        }
    }

    private List<ScriptureReference> ParseScriptureReferences(
        string response,
        string transcriptSegmentId,
        string preferredVersion)
    {
        var references = new List<ScriptureReference>();

        try
        {
            // Try to extract JSON from the response (handle cases where model adds extra text)
            var jsonStart = response.IndexOf('[');
            var jsonEnd = response.LastIndexOf(']');

            if (jsonStart == -1 || jsonEnd == -1 || jsonEnd <= jsonStart)
            {
                _logger.LogWarning("No JSON array found in Ollama response: {Response}", response.Substring(0, Math.Min(100, response.Length)));
                return references;
            }

            var jsonString = response.Substring(jsonStart, jsonEnd - jsonStart + 1);
            _logger.LogDebug("Extracted JSON: {Json}", jsonString);
            
            var detectedRefs = JsonSerializer.Deserialize<List<DetectedScriptureRef>>(jsonString);

            if (detectedRefs == null || detectedRefs.Count == 0)
            {
                _logger.LogWarning("Deserialized JSON resulted in null or empty list");
                return references;
            }
            
            _logger.LogInformation("Successfully deserialized {Count} scripture references", detectedRefs.Count);

            foreach (var detected in detectedRefs)
            {
                if (string.IsNullOrWhiteSpace(detected.Book) || detected.Chapter <= 0 || detected.Verse <= 0)
                {
                    _logger.LogWarning("Skipping invalid reference: Book={Book}, Chapter={Chapter}, Verse={Verse}", 
                        detected.Book, detected.Chapter, detected.Verse);
                    continue;
                }

                var reference = new ScriptureReference
                {
                    Id = Guid.NewGuid().ToString(),
                    Book = detected.Book,
                    Chapter = detected.Chapter,
                    Verse = detected.Verse,
                    Version = preferredVersion,
                    Text = detected.Quote ?? "",
                    Confidence = Math.Clamp(detected.Confidence, 0.0, 1.0),
                    TranscriptSegmentId = transcriptSegmentId
                };

                references.Add(reference);
                _logger.LogInformation("Detected scripture: {Book} {Chapter}:{Verse} (confidence: {Confidence})",
                    reference.Book, reference.Chapter, reference.Verse, reference.Confidence);
            }
        }
        catch (JsonException ex)
        {
            _logger.LogError(ex, "Failed to parse Ollama response as JSON: {Response}", response.Substring(0, Math.Min(500, response.Length)));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error parsing scripture references");
        }

        return references;
    }

    private class OllamaGenerateResponse
    {
        [System.Text.Json.Serialization.JsonPropertyName("response")]
        public string? Response { get; set; }
        
        [System.Text.Json.Serialization.JsonPropertyName("done")]
        public bool Done { get; set; }
    }

    private class DetectedScriptureRef
    {
        public string Book { get; set; } = "";
        public int Chapter { get; set; }
        public int Verse { get; set; }
        public double Confidence { get; set; }
        public string? Quote { get; set; }
    }
}
