using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace PFMP_API.Migrations
{
    /// <inheritdoc />
    public partial class Wave23_NewsTables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "NewsArticles",
                columns: table => new
                {
                    NewsArticleId = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Source = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Title = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    Url = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    Summary = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: true),
                    PublishedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    FetchedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Category = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: true),
                    Tags = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NewsArticles", x => x.NewsArticleId);
                });

            migrationBuilder.CreateTable(
                name: "NewsDigests",
                columns: table => new
                {
                    NewsDigestId = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UserId = table.Column<int>(type: "integer", nullable: false),
                    GeneratedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    PeriodStart = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    PeriodEnd = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    RawJson = table.Column<string>(type: "text", nullable: true),
                    MacroSummary = table.Column<string>(type: "text", nullable: true),
                    FederalSummary = table.Column<string>(type: "text", nullable: true),
                    HoldingsSummary = table.Column<string>(type: "text", nullable: true),
                    WeatherSummary = table.Column<string>(type: "text", nullable: true),
                    RegulatorySummary = table.Column<string>(type: "text", nullable: true),
                    CryptoSummary = table.Column<string>(type: "text", nullable: true),
                    GeopoliticalSummary = table.Column<string>(type: "text", nullable: true),
                    OverallSentiment = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: true),
                    Confidence = table.Column<decimal>(type: "numeric(4,3)", nullable: true),
                    Headline = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    ArticleCount = table.Column<int>(type: "integer", nullable: false),
                    PromptTokens = table.Column<int>(type: "integer", nullable: false),
                    CompletionTokens = table.Column<int>(type: "integer", nullable: false),
                    LlmCostUsd = table.Column<decimal>(type: "numeric(10,6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NewsDigests", x => x.NewsDigestId);
                });

            migrationBuilder.CreateIndex(
                name: "IX_NewsArticles_Category",
                table: "NewsArticles",
                column: "Category");

            migrationBuilder.CreateIndex(
                name: "IX_NewsArticles_PublishedAt",
                table: "NewsArticles",
                column: "PublishedAt");

            migrationBuilder.CreateIndex(
                name: "IX_NewsArticles_Url",
                table: "NewsArticles",
                column: "Url",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_NewsDigests_UserId_GeneratedAt",
                table: "NewsDigests",
                columns: new[] { "UserId", "GeneratedAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "NewsArticles");

            migrationBuilder.DropTable(
                name: "NewsDigests");
        }
    }
}
