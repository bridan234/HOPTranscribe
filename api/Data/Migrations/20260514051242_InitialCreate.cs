using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HOPTranscribe.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(
                name: "hoptranscribe");

            migrationBuilder.CreateTable(
                name: "Sessions",
                schema: "hoptranscribe",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Code = table.Column<string>(type: "character varying(12)", maxLength: 12, nullable: false),
                    Title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    OwnerUsername = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    Status = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    Language = table.Column<string>(type: "character varying(8)", maxLength: 8, nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    EndedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Sessions", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "TranscriptSegments",
                schema: "hoptranscribe",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SessionId = table.Column<Guid>(type: "uuid", nullable: false),
                    Text = table.Column<string>(type: "text", nullable: false),
                    StartedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    EndedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TranscriptSegments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TranscriptSegments_Sessions_SessionId",
                        column: x => x.SessionId,
                        principalSchema: "hoptranscribe",
                        principalTable: "Sessions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ScriptureMatches",
                schema: "hoptranscribe",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SegmentId = table.Column<Guid>(type: "uuid", nullable: false),
                    Reference = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    Book = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    Chapter = table.Column<int>(type: "integer", nullable: false),
                    VerseStart = table.Column<int>(type: "integer", nullable: false),
                    VerseEnd = table.Column<int>(type: "integer", nullable: true),
                    Version = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    Quote = table.Column<string>(type: "text", nullable: false),
                    Confidence = table.Column<double>(type: "double precision", nullable: false),
                    Rank = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ScriptureMatches", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ScriptureMatches_TranscriptSegments_SegmentId",
                        column: x => x.SegmentId,
                        principalSchema: "hoptranscribe",
                        principalTable: "TranscriptSegments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ScriptureMatches_Book_Chapter_VerseStart",
                schema: "hoptranscribe",
                table: "ScriptureMatches",
                columns: new[] { "Book", "Chapter", "VerseStart" });

            migrationBuilder.CreateIndex(
                name: "IX_ScriptureMatches_SegmentId",
                schema: "hoptranscribe",
                table: "ScriptureMatches",
                column: "SegmentId");

            migrationBuilder.CreateIndex(
                name: "IX_Sessions_Code",
                schema: "hoptranscribe",
                table: "Sessions",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Sessions_OwnerUsername",
                schema: "hoptranscribe",
                table: "Sessions",
                column: "OwnerUsername");

            migrationBuilder.CreateIndex(
                name: "IX_TranscriptSegments_SessionId",
                schema: "hoptranscribe",
                table: "TranscriptSegments",
                column: "SessionId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ScriptureMatches",
                schema: "hoptranscribe");

            migrationBuilder.DropTable(
                name: "TranscriptSegments",
                schema: "hoptranscribe");

            migrationBuilder.DropTable(
                name: "Sessions",
                schema: "hoptranscribe");
        }
    }
}
