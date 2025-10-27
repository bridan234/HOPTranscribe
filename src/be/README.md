# HOPTranscribe Backend API

## Environment Setup

### Required Configuration

1. Copy `appsettings.Development.json` and update the OpenAI API key:

```json
{
  "OpenAI": {
    "ApiKey": "sk-proj-your-actual-openai-key-here"
  }
}
```

**IMPORTANT**: Never commit your actual API key to version control.

### Running the Application

```bash
# Restore dependencies
dotnet restore

# Run the application
dotnet run

# Or use watch mode for development
dotnet watch run
```

The API will be available at:
- HTTP: `http://localhost:5000`
- HTTPS: `https://localhost:5001`

### Testing the Endpoint

```bash
# Health check
curl http://localhost:5000/health/status

# Create OpenAI session (requires valid API key)
curl -X POST http://localhost:5000/api/openai/session
```

### Project Structure

```
src/be/
├── Configuration/          # Settings classes
│   └── OpenAISettings.cs
├── Constants/             # Application constants
│   └── ApiConstants.cs
├── Controllers/           # API controllers
│   └── OpenAIController.cs
├── Middleware/            # Custom middleware
│   ├── ExceptionHandlingMiddleware.cs
│   └── RequestLoggingMiddleware.cs
├── Models/                # Data models
│   ├── ApiResponse.cs
│   └── OpenAI/
│       ├── RealtimeSessionRequest.cs
│       └── RealtimeSessionResponse.cs
├── Services/              # Business logic
│   ├── IOpenAIService.cs
│   └── OpenAIService.cs
├── logs/                  # Application logs
├── appsettings.json       # Configuration
└── Program.cs             # Application entry point
```

## Endpoints

### POST /api/openai/session
Creates an ephemeral OpenAI Realtime API session token.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "sess_abc123",
    "client_secret": {
      "value": "eph_sk_xyz789",
      "expiresAt": 1729548000,
      "expires_at_utc": "2025-10-21T12:00:00Z"
    },
    "model": "gpt-4o-realtime-preview-2024-10-01"
  },
  "message": "Session created successfully"
}
```

**Note**: The `client_secret.value` expires in 60 seconds and should be used immediately by the frontend for WebRTC connection.

## Logging

Logs are written to:
- **Console**: For development monitoring
- **File**: `logs/hoptranscribe-{Date}.log` (retained for 30 days)

Log levels:
- **Development**: Debug and above
- **Production**: Information and above
