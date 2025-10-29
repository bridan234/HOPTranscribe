namespace HOPTranscribe.Constants;

public static class ApiConstants
{
    public static class OpenAI
    {
        public const string BaseUrl = "https://api.openai.com";
        public const string RealtimeClientSecretsEndpoint = "/v1/realtime/client_secrets";
        public const string ChatCompletionsEndpoint = "/v1/chat/completions";
        public const string RealtimeModel = "gpt-4o-realtime-preview";
        public const string ChatModel = "gpt-4o-mini";
        public const string BearerScheme = "Bearer";
        public const string SessionType = "realtime";
        public const string TranscriptionModel = "gpt-4o-transcribe";
        public const double JsonRepairTemperature = 0.1;
        public const int JsonRepairMaxTokens = 2000;
        public const string JsonResponseFormat = "json_object";
    }

    public static class Routes
    {
        public const string ApiPrefix = "api";
        public const string OpenAIPrefix = "openai";
        public const string LoggingPrefix = "logging";
        public const string SessionEndpoint = "session";
        public const string SanitizeJsonEndpoint = "sanitize-json";
        public const string HealthEndpoint = "health";
        public const string LogEndpoint = "log";
        public const string BatchLogEndpoint = "batch";
    }

    public static class ErrorMessages
    {
        public const string OpenAIConfigMissing = "OpenAI API key is not configured";
        public const string SessionCreationFailed = "Failed to create OpenAI realtime session";
        public const string InvalidResponse = "Invalid response from OpenAI API";
        public const string MalformedJsonRequired = "Malformed JSON is required";
        public const string JsonSanitizationFailed = "Failed to sanitize JSON";
        public const string SanitizationProducedInvalidJson = "Sanitization produced invalid JSON";
        public const string InternalServerErrorDuringJsonSanitization = "Internal server error during JSON sanitization";
        public const string ArgumentNullHttpClient = "httpClient cannot be null";
        public const string ArgumentNullSettings = "settings cannot be null";
        public const string ArgumentNullLogger = "logger cannot be null";
        public const string ArgumentNullOpenAIService = "openAIService cannot be null";
        public const string ArgumentNullLoggingService = "loggingService cannot be null";
        public const string InvalidLogRequest = "Invalid log request";
        public const string LogEntryRequired = "At least one log entry is required";
    }

    public static class LogMessages
    {
        public const string ApplicationStarting = "Starting HOPTranscribe API";
        public const string ApplicationTerminated = "Application terminated unexpectedly";
        public const string CreatingOpenAISession = "Creating OpenAI realtime session";
        public const string OpenAISessionCreated = "Successfully created OpenAI session. ID: {SessionId}, Expires at: {ExpiresAt}";
        public const string OpenAIApiError = "OpenAI API returned error. Status: {StatusCode}, Content: {Content}";
        public const string InvalidSessionResponse = "Invalid session response: {Response}";
        public const string UnexpectedErrorCreatingSession = "Unexpected error creating OpenAI realtime session";
        public const string ReceivedSessionRequest = "Received request to create OpenAI realtime session";
        public const string HttpErrorCreatingSession = "HTTP error creating OpenAI session";
        public const string UnexpectedErrorInController = "Unexpected error creating OpenAI session";
        public const string UnhandledExceptionOccurred = "Unhandled exception occurred";
        public const string RequestStarted = "Request started: {Method} {Path} [RequestId: {RequestId}]";
        public const string RequestCompleted = "Request completed: {Method} {Path} - Status: {StatusCode} - Duration: {Duration}ms [RequestId: {RequestId}]";
        public const string AttemptingJsonSanitization = "Attempting to sanitize malformed JSON via LLM";
        public const string SuccessfullySanitizedJson = "Successfully sanitized JSON";
        public const string LLMReturnedInvalidJson = "LLM returned invalid JSON after sanitization attempt";
        public const string ErrorSanitizingJson = "Error sanitizing JSON";
        public const string RequestingChatCompletion = "Requesting chat completion from OpenAI";
        public const string ChatCompletionSuccess = "Successfully received chat completion";
        public const string ChatApiError = "OpenAI Chat API returned error. Status: {StatusCode}, Content: {Content}";
        public const string ErrorGettingChatCompletion = "Error getting chat completion from OpenAI";
        public const string ReceivedClientLog = "Received client log: [{Level}] {Source} - {Message}";
        public const string ReceivedBatchLogs = "Received batch of {Count} client logs";
        public const string ProcessedClientLog = "Processed client log from {Source}";
        public const string InvalidLogLevel = "Invalid log level received: {Level}";
        public const string ErrorProcessingClientLog = "Error processing client log";
    }

    public static class ResponseMessages
    {
        public const string SessionCreatedSuccessfully = "Session created successfully";
        public const string JsonSanitizedSuccessfully = "JSON sanitized successfully";
        public const string OpenAIApiError = "OpenAI API error";
        public const string InternalServerError = "Internal server error";
        public const string UnexpectedError = "An unexpected error occurred";
        public const string ApiRunning = "HOPTranscribe API is running";
        public const string HealthyStatus = "healthy";
        public const string LogReceivedSuccessfully = "Log received successfully";
        public const string BatchLogsReceivedSuccessfully = "Batch logs received successfully";
    }

    public static class ConfigKeys
    {
        public const string OpenAISection = "OpenAI";
        public const string ApiKey = "ApiKey";
        public const string AllowedOriginsSection = "AllowedOrigins";
    }

    public static class PolicyNames
    {
        public const string CorsPolicy = "AllowFrontend";
    }

    public static class Headers
    {
        public const string RequestId = "X-Request-Id";
    }

    public static class Prompts
    {
        public const string JsonSanitizerSystemPrompt = @"You are a JSON repair specialist. Your task is to fix malformed JSON and return only valid, parseable JSON.

CRITICAL: You MUST return the EXACT structure that was intended. The expected format is:
{
  ""transcript"": ""the spoken text"",
  ""matches"": [
    {
      ""reference"": ""John 3:16"",
      ""quote"": ""For God so loved the world..."",
      ""version"": ""NKJV"",
      ""confidence"": 0.95
    }
  ]
}

Rules:
1. Fix unterminated strings by adding closing quotes
2. Add missing commas between array elements or object properties
3. Close unclosed brackets and braces
4. Remove trailing commas
5. Fix improperly escaped characters
6. Ensure all property names are in double quotes
7. Return ONLY the fixed JSON, no explanations, no markdown code blocks, no extra text
8. Preserve the original structure and data as much as possible
9. The ""matches"" array must contain objects with: reference, quote, version, confidence
10. The ""transcript"" field must be a string

Example of what you should return:
{""transcript"": ""John 3:16 says"", ""matches"": [{""reference"": ""John 3:16"", ""quote"": ""For God so loved the world..."", ""version"": ""NKJV"", ""confidence"": 0.95}]}";

        public const string JsonSanitizerUserPromptTemplate = "Fix this malformed JSON and return ONLY the fixed JSON:\n\n{0}";
    }
}
