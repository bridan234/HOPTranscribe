# Development Standards

Standards and patterns for building production-ready applications.

---

# Backend (.NET API)

## 🎯 Core Principles

### 1. No Magic Strings
- Define all strings as constants in dedicated files
- Externalize: endpoints, error messages, log messages, literals
- Store configuration in `appsettings.json`

```csharp
// ❌ BAD
var response = await _httpClient.PostAsync("/api/endpoint", content);

// ✅ GOOD
var response = await _httpClient.PostAsync(ApiConstants.Endpoints.MyEndpoint, content);
```

### 2. Dependency Injection
- Use constructor injection for all dependencies
- Validate non-null in constructor
- Register with appropriate lifetime (Scoped/Singleton/Transient)

```csharp
public class MyService : IMyService
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<MyService> _logger;
    
    public MyService(HttpClient httpClient, ILogger<MyService> logger)
    {
        _httpClient = httpClient ?? throw new ArgumentNullException(nameof(httpClient));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }
}
```

### 3. Options Pattern for Configuration
- Create strongly-typed configuration classes
- Inject via `IOptions<T>`
- Validate on startup

```csharp
public class MySettings
{
    public string ApiKey { get; set; } = string.Empty;
    public int TimeoutSeconds { get; set; } = 30;
}

// Registration
builder.Services.Configure<MySettings>(
    builder.Configuration.GetSection("MySettings")
);
```

---

## 🔧 Implementation Patterns

### Constants Organization
```csharp
public static class ApiConstants
{
    public static class Endpoints
    {
        public const string BaseUrl = "https://api.example.com";
        public const string MyEndpoint = "/v1/resource";
    }
    
    public static class ErrorMessages
    {
        public const string InvalidResponse = "Invalid response from API";
    }
}
```

### Service Pattern
```csharp
// Interface
public interface IMyService
{
    Task<MyResponse> DoWorkAsync(CancellationToken ct = default);
}

// Implementation
public class MyService : IMyService
{
    // Constructor injection + validation
    // Structured logging
    // Exception handling
    // Return strongly-typed models
}

// Registration
builder.Services.AddHttpClient<IMyService, MyService>();
```

### Controller Pattern
```csharp
[ApiController]
[Route("api/[controller]")]
public class MyController : ControllerBase
{
    /// <summary>XML docs for endpoints</summary>
    [HttpPost]
    [ProducesResponseType(typeof(ApiResponse<MyData>), 200)]
    [ProducesResponseType(500)]
    public async Task<IActionResult> Post(CancellationToken ct)
    {
        try
        {
            var result = await _service.DoWorkAsync(ct);
            return Ok(ApiResponse<MyData>.Ok(result));
        }
        catch (HttpRequestException ex)
        {
            return StatusCode(502, ApiResponse<MyData>.Fail("External API error"));
        }
    }
}
```

### Generic API Response
```csharp
public class ApiResponse<T>
{
    public bool Success { get; set; }
    public T? Data { get; set; }
    public string? Error { get; set; }
    
    public static ApiResponse<T> Ok(T data) => new() { Success = true, Data = data };
    public static ApiResponse<T> Fail(string error) => new() { Success = false, Error = error };
}
```

---

## 📝 Logging (Serilog)

### Configuration
```json
{
  "Serilog": {
    "MinimumLevel": {
      "Default": "Information",
      "Override": { "Microsoft": "Warning" }
    },
    "WriteTo": [
      { "Name": "Console" },
      {
        "Name": "File",
        "Args": {
          "path": "logs/app-.log",
          "rollingInterval": "Day"
        }
      }
    ]
  }
}
```

### Best Practices
```csharp
// ❌ BAD - String interpolation
_logger.LogInformation($"Created {item.Id}");

// ✅ GOOD - Structured logging
_logger.LogInformation("Created item {ItemId}", item.Id);
```

**Log Levels:**
- `Information`: Normal operations
- `Warning`: Unexpected but handled
- `Error`: Failures with exceptions
- `Debug`: Detailed diagnostics

---

## 🛡️ Middleware

### Request Logging
```csharp
public class RequestLoggingMiddleware
{
    private readonly RequestDelegate _next;
    
    public async Task InvokeAsync(HttpContext context)
    {
        var sw = Stopwatch.StartNew();
        await _next(context);
        _logger.LogInformation(
            "{Method} {Path} - {Status} - {Duration}ms",
            context.Request.Method,
            context.Request.Path,
            context.Response.StatusCode,
            sw.ElapsedMilliseconds
        );
    }
}
```

### Global Exception Handler
```csharp
public class ExceptionHandlingMiddleware
{
    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unhandled exception");
            context.Response.StatusCode = 500;
            await context.Response.WriteAsJsonAsync(
                ApiResponse<object>.Fail("Internal error")
            );
        }
    }
}
```

### Registration Order
```csharp
app.UseMiddleware<ExceptionHandlingMiddleware>();
app.UseMiddleware<RequestLoggingMiddleware>();
app.UseCors();
app.UseAuthorization();
app.MapControllers();
```

---

## ⚙️ Configuration

### appsettings.json
```json
{
  "AllowedOrigins": ["http://localhost:3000"],
  "MySettings": {
    "ApiKey": "your-key",
    "TimeoutSeconds": 30
  }
}
```

### Environment Variables (Production)
```bash
export MySettings__ApiKey="production-key"
```

---

## 🚨 Error Handling

**Service Layer:** Catch specific exceptions, log with context, throw meaningful errors

**Controller Layer:** Catch exceptions, return appropriate status codes, use standard response format

**Middleware:** Catch unhandled exceptions, log with request context, return generic error

---

## 🎓 Key Principles

1. **Consistency** - Use patterns uniformly
2. **Clarity** - Self-documenting code
3. **Configuration** - Externalize all settings
4. **Observability** - Log comprehensively
5. **Maintainability** - Separation of concerns
6. **Security** - Never commit secrets

---

# Frontend (React + TypeScript)

## 🎯 Core Principles

### 1. Separation of Concerns
- Services handle API calls (no React)
- Hooks manage state and React lifecycle
- Components focus on rendering

```typescript
// ❌ BAD - API logic in component
function MyComponent() {
  const [data, setData] = useState(null);
  useEffect(() => { fetch('/api/data').then(/* ... */) }, []);
}

// ✅ GOOD - Separated layers
function MyComponent() {
  const { data } = useMyData(); // Hook
  return <div>{data}</div>;     // Component renders
}
```

### 2. Type Everything
- No `any` types
- Define interfaces for props and API responses

```typescript
interface MyComponentProps {
  data: UserData;
  onUpdate: (id: string) => void;
}
```

### 3. Project Structure
```
src/
├── components/     # Reusable UI
├── pages/         # Page components
├── services/      # API calls
├── hooks/         # Custom hooks
├── types/         # TypeScript types
└── utils/         # Helper functions
```

---

## 🔧 Patterns

### Services
```typescript
// services/apiService.ts
export const apiService = {
  async get<T>(endpoint: string): Promise<T> {
    const res = await fetch(endpoint);
    if (!res.ok) throw new Error('Request failed');
    return res.json();
  }
};
```

### Hooks
```typescript
// hooks/useApi.ts
export function useApi<T>(endpoint: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    apiService.get<T>(endpoint)
      .then(setData)
      .finally(() => setLoading(false));
  }, [endpoint]);

  return { data, loading };
}
```

### Components
```typescript
interface ButtonProps {
  label: string;
  onClick: () => void;
}

export function Button({ label, onClick }: ButtonProps) {
  return <button onClick={onClick}>{label}</button>;
}
```

---

## 🎓 Key Principles

1. **Type Safety** - Strict TypeScript
2. **Separation** - Services, hooks, components
3. **Simplicity** - Small, focused modules
4. **Reusability** - Extract common patterns
