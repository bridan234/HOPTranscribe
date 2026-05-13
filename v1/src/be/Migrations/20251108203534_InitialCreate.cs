using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HOPTranscribe.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Sessions",
                columns: table => new
                {
                    Id = table.Column<string>(type: "TEXT", nullable: false),
                    SessionCode = table.Column<string>(type: "TEXT", maxLength: 50, nullable: false),
                    UserName = table.Column<string>(type: "TEXT", maxLength: 100, nullable: false),
                    Title = table.Column<string>(type: "TEXT", maxLength: 200, nullable: false),
                    StartedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    EndedAt = table.Column<DateTime>(type: "TEXT", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    Status = table.Column<int>(type: "INTEGER", nullable: false),
                    IsReadonly = table.Column<bool>(type: "INTEGER", nullable: false),
                    IsRecording = table.Column<bool>(type: "INTEGER", nullable: false),
                    IsPaused = table.Column<bool>(type: "INTEGER", nullable: false),
                    Duration = table.Column<int>(type: "INTEGER", nullable: false),
                    ActiveDuration = table.Column<int>(type: "INTEGER", nullable: false),
                    Metadata = table.Column<string>(type: "TEXT", nullable: true),
                    RowVersion = table.Column<byte[]>(type: "BLOB", rowVersion: true, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Sessions", x => x.Id);
                    table.UniqueConstraint("AK_Sessions_SessionCode", x => x.SessionCode);
                });

            migrationBuilder.CreateTable(
                name: "ScriptureReferences",
                columns: table => new
                {
                    Id = table.Column<string>(type: "TEXT", maxLength: 100, nullable: false),
                    Book = table.Column<string>(type: "TEXT", maxLength: 50, nullable: false),
                    Chapter = table.Column<int>(type: "INTEGER", nullable: false),
                    Verse = table.Column<int>(type: "INTEGER", nullable: false),
                    Version = table.Column<string>(type: "TEXT", maxLength: 10, nullable: false),
                    Text = table.Column<string>(type: "TEXT", nullable: false),
                    Confidence = table.Column<double>(type: "REAL", nullable: false),
                    TranscriptSegmentId = table.Column<string>(type: "TEXT", maxLength: 100, nullable: true),
                    SessionCode = table.Column<string>(type: "TEXT", maxLength: 50, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ScriptureReferences", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ScriptureReferences_Sessions_SessionCode",
                        column: x => x.SessionCode,
                        principalTable: "Sessions",
                        principalColumn: "SessionCode",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "TranscriptSegments",
                columns: table => new
                {
                    Id = table.Column<string>(type: "TEXT", maxLength: 100, nullable: false),
                    Text = table.Column<string>(type: "TEXT", nullable: false),
                    Timestamp = table.Column<DateTime>(type: "TEXT", nullable: false),
                    Confidence = table.Column<double>(type: "REAL", nullable: false),
                    SessionCode = table.Column<string>(type: "TEXT", maxLength: 50, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TranscriptSegments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TranscriptSegments_Sessions_SessionCode",
                        column: x => x.SessionCode,
                        principalTable: "Sessions",
                        principalColumn: "SessionCode",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ScriptureReferences_Book_Chapter_Verse",
                table: "ScriptureReferences",
                columns: new[] { "Book", "Chapter", "Verse" });

            migrationBuilder.CreateIndex(
                name: "IX_ScriptureReferences_SessionCode",
                table: "ScriptureReferences",
                column: "SessionCode");

            migrationBuilder.CreateIndex(
                name: "IX_ScriptureReferences_TranscriptSegmentId",
                table: "ScriptureReferences",
                column: "TranscriptSegmentId");

            migrationBuilder.CreateIndex(
                name: "IX_Sessions_SessionCode",
                table: "Sessions",
                column: "SessionCode",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Sessions_StartedAt",
                table: "Sessions",
                column: "StartedAt");

            migrationBuilder.CreateIndex(
                name: "IX_Sessions_Status",
                table: "Sessions",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_Sessions_UserName",
                table: "Sessions",
                column: "UserName");

            migrationBuilder.CreateIndex(
                name: "IX_TranscriptSegments_SessionCode",
                table: "TranscriptSegments",
                column: "SessionCode");

            migrationBuilder.CreateIndex(
                name: "IX_TranscriptSegments_Timestamp",
                table: "TranscriptSegments",
                column: "Timestamp");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ScriptureReferences");

            migrationBuilder.DropTable(
                name: "TranscriptSegments");

            migrationBuilder.DropTable(
                name: "Sessions");
        }
    }
}
