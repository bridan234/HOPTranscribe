using HOPTranscribe.Api.Data.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace HOPTranscribe.Api.Data;

public class HopDbContext : DbContext
{
    public HopDbContext(DbContextOptions<HopDbContext> options) : base(options) { }

    public DbSet<SessionEntity> Sessions => Set<SessionEntity>();
    public DbSet<TranscriptSegmentEntity> TranscriptSegments => Set<TranscriptSegmentEntity>();
    public DbSet<ScriptureMatchEntity> ScriptureMatches => Set<ScriptureMatchEntity>();

    protected override void ConfigureConventions(ModelConfigurationBuilder configurationBuilder)
    {
        // Npgsql has native DateTimeOffset (timestamp with time zone) support, so the
        // binary conversion would actively get in the way. Only apply it for SQLite,
        // which has no native DateTimeOffset type.
        if (Database.IsSqlite())
        {
            configurationBuilder
                .Properties<DateTimeOffset>()
                .HaveConversion<DateTimeOffsetToBinaryConverter>();
            configurationBuilder
                .Properties<DateTimeOffset?>()
                .HaveConversion<DateTimeOffsetToBinaryConverter>();
        }
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Postgres-only: keep our tables in their own schema so the Supabase project
        // can host multiple apps side by side. SQLite has no real schema concept,
        // so we leave the default for tests/local dev.
        if (Database.IsNpgsql())
        {
            modelBuilder.HasDefaultSchema("hoptranscribe");
        }

        modelBuilder.Entity<SessionEntity>(b =>
        {
            b.HasKey(x => x.Id);
            b.HasIndex(x => x.Code).IsUnique();
            b.HasIndex(x => x.OwnerUsername);

            b.HasMany(x => x.Segments)
             .WithOne(x => x.Session!)
             .HasForeignKey(x => x.SessionId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<TranscriptSegmentEntity>(b =>
        {
            b.HasKey(x => x.Id);
            b.HasIndex(x => x.SessionId);

            b.HasMany(x => x.Matches)
             .WithOne(x => x.Segment!)
             .HasForeignKey(x => x.SegmentId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ScriptureMatchEntity>(b =>
        {
            b.HasKey(x => x.Id);
            b.HasIndex(x => x.SegmentId);
            b.HasIndex(x => new { x.Book, x.Chapter, x.VerseStart });
        });
    }
}
