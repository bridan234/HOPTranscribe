using HOPTranscribe.Constants;
using HOPTranscribe.Models;
using HOPTranscribe.Models.Logging;
using HOPTranscribe.Services;
using Microsoft.AspNetCore.Mvc;

namespace HOPTranscribe.Controllers;

/// <summary>
/// Controller for handling client-side logging
/// </summary>
[ApiController]
[Route($"{ApiConstants.Routes.ApiPrefix}/{ApiConstants.Routes.LoggingPrefix}")]
public class LoggingController : ControllerBase
{
    private readonly ILogger<LoggingController> _logger;
    private readonly IClientLoggingService _loggingService;

    public LoggingController(
        ILogger<LoggingController> logger,
        IClientLoggingService loggingService)
    {
        _logger = logger ?? throw new ArgumentNullException(nameof(logger), ApiConstants.ErrorMessages.ArgumentNullLogger);
        _loggingService = loggingService ?? throw new ArgumentNullException(nameof(loggingService), ApiConstants.ErrorMessages.ArgumentNullLoggingService);
    }

    /// <summary>
    /// Receive a single log entry from the client
    /// </summary>
    /// <param name="logEntry">The log entry to process</param>
    /// <returns>Success response</returns>
    [HttpPost(ApiConstants.Routes.LogEndpoint)]
    public async Task<IActionResult> LogAsync([FromBody] ClientLogEntry logEntry)
    {
        try
        {
            if (logEntry == null || string.IsNullOrWhiteSpace(logEntry.Message))
            {
                return BadRequest(new ApiResponse<object>
                {
                    Success = false,
                    Data = null,
                    Error = ApiConstants.ErrorMessages.InvalidLogRequest,
                    Message = ApiConstants.ErrorMessages.InvalidLogRequest
                });
            }

            var clientIp = GetClientIpAddress();

            _logger.LogInformation(
                ApiConstants.LogMessages.ReceivedClientLog,
                logEntry.Level,
                logEntry.Source ?? "Unknown",
                logEntry.Message
            );

            await _loggingService.ProcessLogAsync(logEntry, clientIp);

            return Ok(new ApiResponse<object>
            {
                Success = true,
                Data = null,
                Error = null,
                Message = ApiConstants.ResponseMessages.LogReceivedSuccessfully
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, ApiConstants.LogMessages.ErrorProcessingClientLog);
            return StatusCode(500, new ApiResponse<object>
            {
                Success = false,
                Data = null,
                Error = ApiConstants.ResponseMessages.InternalServerError,
                Message = ApiConstants.ResponseMessages.UnexpectedError
            });
        }
    }

    /// <summary>
    /// Receive a batch of log entries from the client
    /// </summary>
    /// <param name="request">Batch log request containing multiple log entries</param>
    /// <returns>Success response</returns>
    [HttpPost(ApiConstants.Routes.BatchLogEndpoint)]
    public async Task<IActionResult> BatchLogAsync([FromBody] BatchLogRequest request)
    {
        try
        {
            if (request == null || request.Logs == null || request.Logs.Count == 0)
            {
                return BadRequest(new ApiResponse<object>
                {
                    Success = false,
                    Data = null,
                    Error = ApiConstants.ErrorMessages.LogEntryRequired,
                    Message = ApiConstants.ErrorMessages.LogEntryRequired
                });
            }

            var clientIp = GetClientIpAddress();

            _logger.LogInformation(
                ApiConstants.LogMessages.ReceivedBatchLogs,
                request.Logs.Count
            );

            await _loggingService.ProcessBatchLogsAsync(request.Logs, clientIp);

            return Ok(new ApiResponse<object>
            {
                Success = true,
                Data = new { ProcessedCount = request.Logs.Count },
                Error = null,
                Message = ApiConstants.ResponseMessages.BatchLogsReceivedSuccessfully
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, ApiConstants.LogMessages.ErrorProcessingClientLog);
            return StatusCode(500, new ApiResponse<object>
            {
                Success = false,
                Data = null,
                Error = ApiConstants.ResponseMessages.InternalServerError,
                Message = ApiConstants.ResponseMessages.UnexpectedError
            });
        }
    }

    /// <summary>
    /// Get client IP address from request
    /// </summary>
    private string? GetClientIpAddress()
    {
        // Check for forwarded IP first (in case of proxy/load balancer)
        var forwardedFor = Request.Headers["X-Forwarded-For"].FirstOrDefault();
        if (!string.IsNullOrWhiteSpace(forwardedFor))
        {
            return forwardedFor.Split(',')[0].Trim();
        }

        // Fall back to direct connection IP
        return HttpContext.Connection.RemoteIpAddress?.ToString();
    }
}
