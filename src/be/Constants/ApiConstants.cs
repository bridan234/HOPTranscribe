namespace HOPTranscribe.Constants;

public static class ApiConstants
{
    public static class OpenAI
    {
        public const string BaseUrl = "https://api.openai.com";
        public const string RealtimeClientSecretsEndpoint = "/v1/realtime/client_secrets";
        public const string RealtimeModel = "gpt-4o-realtime-preview-2024-12-17";
        public const string BearerScheme = "Bearer";
        public const string SessionType = "realtime";
        public const string TranscriptionModel = "whisper-1";
    }

    public static class Routes
    {
        public const string ApiPrefix = "api";
        public const string OpenAIPrefix = "openai";
        public const string SessionEndpoint = "session";
        public const string HealthEndpoint = "health";
    }

    public static class ErrorMessages
    {
        public const string OpenAIConfigMissing = "OpenAI API key is not configured";
        public const string SessionCreationFailed = "Failed to create OpenAI realtime session";
        public const string InvalidResponse = "Invalid response from OpenAI API";
        public const string ArgumentNullHttpClient = "httpClient cannot be null";
        public const string ArgumentNullSettings = "settings cannot be null";
        public const string ArgumentNullLogger = "logger cannot be null";
        public const string ArgumentNullOpenAIService = "openAIService cannot be null";
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
    }

    public static class ResponseMessages
    {
        public const string SessionCreatedSuccessfully = "Session created successfully";
        public const string OpenAIApiError = "OpenAI API error";
        public const string InternalServerError = "Internal server error";
        public const string UnexpectedError = "An unexpected error occurred";
        public const string ApiRunning = "HOPTranscribe API is running";
        public const string HealthyStatus = "healthy";
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
}
