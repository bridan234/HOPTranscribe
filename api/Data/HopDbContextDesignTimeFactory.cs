using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace HOPTranscribe.Api.Data;

/// <summary>
/// Used only by <c>dotnet ef migrations</c> at design time. The connection string
/// here doesn't need to point at a real database — Npgsql just needs to parse it
/// to know which provider to model. At runtime Program.cs picks the provider
/// based on the actual ConnectionStrings:SessionDb value, so this factory has
/// no effect outside the EF CLI.
/// </summary>
public class HopDbContextDesignTimeFactory : IDesignTimeDbContextFactory<HopDbContext>
{
    public HopDbContext CreateDbContext(string[] args)
    {
        var options = new DbContextOptionsBuilder<HopDbContext>()
            .UseNpgsql(
                "Host=localhost;Port=5432;Database=postgres;Username=postgres;Password=postgres",
                npg => npg.MigrationsHistoryTable("__EFMigrationsHistory", "hoptranscribe"))
            .Options;
        return new HopDbContext(options);
    }
}
