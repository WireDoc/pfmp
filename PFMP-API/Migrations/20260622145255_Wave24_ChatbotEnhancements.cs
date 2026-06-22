using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace PFMP_API.Migrations
{
    /// <inheritdoc />
    public partial class Wave24_ChatbotEnhancements : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "Content",
                table: "AIMessages",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(5000)",
                oldMaxLength: 5000);

            migrationBuilder.AddColumn<int>(
                name: "CachedTokens",
                table: "AIMessages",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "InputTokens",
                table: "AIMessages",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "OutputTokens",
                table: "AIMessages",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ReasoningEffort",
                table: "AIMessages",
                type: "integer",
                nullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "ConversationSummary",
                table: "AIConversations",
                type: "text",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(1000)",
                oldMaxLength: 1000,
                oldNullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ArchivedAt",
                table: "AIConversations",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "LastMessageAt",
                table: "AIConversations",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<string>(
                name: "Title",
                table: "AIConversations",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "UserContextSnapshots",
                columns: table => new
                {
                    UserContextSnapshotId = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UserId = table.Column<int>(type: "integer", nullable: false),
                    SnapshotDate = table.Column<DateTime>(type: "date", nullable: false),
                    ContentHash = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    Content = table.Column<string>(type: "text", nullable: false),
                    EstimatedTokens = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserContextSnapshots", x => x.UserContextSnapshotId);
                });

            migrationBuilder.CreateIndex(
                name: "IX_UserContextSnapshots_UserId_SnapshotDate",
                table: "UserContextSnapshots",
                columns: new[] { "UserId", "SnapshotDate" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "UserContextSnapshots");

            migrationBuilder.DropColumn(
                name: "CachedTokens",
                table: "AIMessages");

            migrationBuilder.DropColumn(
                name: "InputTokens",
                table: "AIMessages");

            migrationBuilder.DropColumn(
                name: "OutputTokens",
                table: "AIMessages");

            migrationBuilder.DropColumn(
                name: "ReasoningEffort",
                table: "AIMessages");

            migrationBuilder.DropColumn(
                name: "ArchivedAt",
                table: "AIConversations");

            migrationBuilder.DropColumn(
                name: "LastMessageAt",
                table: "AIConversations");

            migrationBuilder.DropColumn(
                name: "Title",
                table: "AIConversations");

            migrationBuilder.AlterColumn<string>(
                name: "Content",
                table: "AIMessages",
                type: "character varying(5000)",
                maxLength: 5000,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AlterColumn<string>(
                name: "ConversationSummary",
                table: "AIConversations",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);
        }
    }
}
