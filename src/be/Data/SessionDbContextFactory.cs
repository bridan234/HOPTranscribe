using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace HOPTranscribe.Data;

/// <summary>
/// Design-time factory for creating SessionDbContext during EF Core migrations
/// </summary>
public class SessionDbContextFactory : IDesignTimeDbContextFactory<SessionDbContext>
{
    public SessionDbContext CreateDbContext(string[] args)
    {
        var optionsBuilder = new DbContextOptionsBuilder<SessionDbContext>();
        
        // Use a temporary SQLite database for migrations
        optionsBuilder.UseSqlite("Data Source=sessions.db");

        return new SessionDbContext(optionsBuilder.Options);
    }
}
