using HOPTranscribe.Api.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace HOPTranscribe.Api.HealthChecks;

public class SqliteStorageHealthCheck : IHealthCheck
{
    private readonly HopDbContext _db;

    public SqliteStorageHealthCheck(HopDbContext db)
    {
        _db = db;
    }

    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        if (!_db.Database.IsSqlite())
        {
            return HealthCheckResult.Healthy("Local SQLite storage is not used by this database provider.");
        }

        var connectionString = _db.Database.GetConnectionString() ?? string.Empty;
        var dataSource = GetDataSource(connectionString);
        if (string.IsNullOrWhiteSpace(dataSource))
        {
            return HealthCheckResult.Unhealthy("SQLite Data Source is not configured.");
        }

        if (dataSource.Contains(":memory:", StringComparison.OrdinalIgnoreCase))
        {
            return HealthCheckResult.Healthy("SQLite in-memory storage is available.");
        }

        var directory = Path.GetDirectoryName(dataSource);
        if (string.IsNullOrWhiteSpace(directory))
        {
            directory = Directory.GetCurrentDirectory();
        }

        try
        {
            Directory.CreateDirectory(directory);

            var probePath = Path.Combine(directory, $".hoptranscribe-health-{Guid.NewGuid():N}.tmp");
            await File.WriteAllTextAsync(probePath, "ok", cancellationToken);
            File.Delete(probePath);

            return HealthCheckResult.Healthy("SQLite storage directory is writable.");
        }
        catch (Exception ex)
        {
            return HealthCheckResult.Unhealthy($"SQLite storage directory is not writable: {directory}", ex);
        }
    }

    private static string GetDataSource(string connectionString)
    {
        foreach (var part in connectionString.Split(';', StringSplitOptions.RemoveEmptyEntries))
        {
            var kv = part.Split('=', 2);
            if (kv.Length == 2 &&
                (kv[0].Trim().Equals("Data Source", StringComparison.OrdinalIgnoreCase) ||
                 kv[0].Trim().Equals("DataSource", StringComparison.OrdinalIgnoreCase)))
            {
                return kv[1].Trim();
            }
        }

        return string.Empty;
    }
}
