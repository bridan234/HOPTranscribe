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
        configurationBuilder
            .Properties<DateTimeOffset>()
            .HaveConversion<DateTimeOffsetToBinaryConverter>();
        configurationBuilder
            .Properties<DateTimeOffset?>()
            .HaveConversion<DateTimeOffsetToBinaryConverter>();
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
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
