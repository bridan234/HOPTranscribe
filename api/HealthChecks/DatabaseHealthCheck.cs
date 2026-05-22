using HOPTranscribe.Api.Data;
using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace HOPTranscribe.Api.HealthChecks;

public class DatabaseHealthCheck : IHealthCheck
{
    private readonly HopDbContext _db;

    public DatabaseHealthCheck(HopDbContext db)
    {
        _db = db;
    }

    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var canConnect = await _db.Database.CanConnectAsync(cancellationToken);
            return canConnect
                ? HealthCheckResult.Healthy("Database is reachable.")
                : HealthCheckResult.Unhealthy("Database is not reachable.");
        }
        catch (Exception ex)
        {
            return HealthCheckResult.Unhealthy("Database connectivity check failed.", ex);
        }
    }
}
