using HOPTranscribe.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace HOPTranscribe.Data;

/// <summary>
/// Database context for session storage
/// Provider-agnostic: works with SQLite, PostgreSQL, SQL Server, etc.
/// </summary>
public class SessionDbContext : DbContext
{
    public SessionDbContext(DbContextOptions<SessionDbContext> options) : base(options)
    {
    }

    public DbSet<SessionEntity> Sessions { get; set; } = null!;
    public DbSet<TranscriptSegmentEntity> TranscriptSegments { get; set; } = null!;
    public DbSet<ScriptureReferenceEntity> ScriptureReferences { get; set; } = null!;

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Session entity configuration
        modelBuilder.Entity<SessionEntity>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.SessionCode).IsUnique();
            entity.HasIndex(e => e.UserName);
            entity.HasIndex(e => e.Status);
            entity.HasIndex(e => e.StartedAt);
            
            // Relationships
            entity.HasMany(e => e.Transcripts)
                .WithOne(t => t.Session)
                .HasForeignKey(t => t.SessionCode)
                .HasPrincipalKey(e => e.SessionCode)
                .OnDelete(DeleteBehavior.Cascade);
            
            entity.HasMany(e => e.ScriptureReferences)
                .WithOne(s => s.Session)
                .HasForeignKey(s => s.SessionCode)
                .HasPrincipalKey(e => e.SessionCode)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // TranscriptSegment entity configuration
        modelBuilder.Entity<TranscriptSegmentEntity>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.SessionCode);
            entity.HasIndex(e => e.Timestamp);
        });

        // ScriptureReference entity configuration
        modelBuilder.Entity<ScriptureReferenceEntity>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.SessionCode);
            entity.HasIndex(e => new { e.Book, e.Chapter, e.Verse });
            entity.HasIndex(e => e.TranscriptSegmentId);
        });
    }
}
