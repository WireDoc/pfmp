using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace PFMP_API.Migrations
{
    /// <inheritdoc />
    public partial class Wave7AIMemoryAndNews : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "AIAnalyzed",
                table: "Alerts",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "AIAnalyzedAt",
                table: "Alerts",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "AIContext",
                table: "Alerts",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "MarketContextId",
                table: "Alerts",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "AIGenerationCost",
                table: "Advice",
                type: "numeric(10,6)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "AggressiveRecommendation",
                table: "Advice",
                type: "character varying(2000)",
                maxLength: 2000,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "AgreementScore",
                table: "Advice",
                type: "numeric(5,2)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ConservativeRecommendation",
                table: "Advice",
                type: "character varying(2000)",
                maxLength: 2000,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "HasConsensus",
                table: "Advice",
                type: "boolean",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "MarketContextId",
                table: "Advice",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ModelsUsed",
                table: "Advice",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "TotalTokensUsed",
                table: "Advice",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "AIActionMemories",
                columns: table => new
                {
                    ActionMemoryId = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UserId = table.Column<int>(type: "integer", nullable: false),
                    ActionDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ActionType = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    ActionSummary = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    SourceAdviceId = table.Column<int>(type: "integer", nullable: true),
                    SourceAlertId = table.Column<int>(type: "integer", nullable: true),
                    AccountsAffected = table.Column<string>(type: "jsonb", nullable: true),
                    AmountMoved = table.Column<decimal>(type: "numeric(18,2)", nullable: true),
                    AssetClass = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    ExpiresAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    IsSignificant = table.Column<bool>(type: "boolean", nullable: false),
                    Referenced = table.Column<bool>(type: "boolean", nullable: false),
                    ReferenceCount = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AIActionMemories", x => x.ActionMemoryId);
                    table.ForeignKey(
                        name: "FK_AIActionMemories_Advice_SourceAdviceId",
                        column: x => x.SourceAdviceId,
                        principalTable: "Advice",
                        principalColumn: "AdviceId");
                    table.ForeignKey(
                        name: "FK_AIActionMemories_Alerts_SourceAlertId",
                        column: x => x.SourceAlertId,
                        principalTable: "Alerts",
                        principalColumn: "AlertId");
                    table.ForeignKey(
                        name: "FK_AIActionMemories_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AIConversations",
                columns: table => new
                {
                    ConversationId = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UserId = table.Column<int>(type: "integer", nullable: false),
                    StartedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    EndedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ConversationType = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    ConversationSummary = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    TotalTokensUsed = table.Column<int>(type: "integer", nullable: false),
                    TotalCost = table.Column<decimal>(type: "numeric(10,6)", nullable: false),
                    MessageCount = table.Column<int>(type: "integer", nullable: false),
                    GeneratedAdvice = table.Column<bool>(type: "boolean", nullable: false),
                    RelatedAdviceId = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AIConversations", x => x.ConversationId);
                    table.ForeignKey(
                        name: "FK_AIConversations_Advice_RelatedAdviceId",
                        column: x => x.RelatedAdviceId,
                        principalTable: "Advice",
                        principalColumn: "AdviceId");
                    table.ForeignKey(
                        name: "FK_AIConversations_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "MarketContexts",
                columns: table => new
                {
                    MarketContextId = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ContextDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    DailySummary = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    MarketSentiment = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    MajorEvents = table.Column<List<string>>(type: "jsonb", nullable: false),
                    AffectedSectors = table.Column<List<string>>(type: "jsonb", nullable: false),
                    SPYChange = table.Column<decimal>(type: "numeric(8,4)", nullable: false),
                    VIXLevel = table.Column<decimal>(type: "numeric(8,2)", nullable: false),
                    CryptoSentiment = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    TreasuryYield10Y = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: true),
                    GeneratedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    TokensUsed = table.Column<int>(type: "integer", nullable: false),
                    GenerationCost = table.Column<decimal>(type: "numeric(10,6)", nullable: false),
                    SourceArticleCount = table.Column<int>(type: "integer", nullable: false),
                    ModelUsed = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MarketContexts", x => x.MarketContextId);
                });

            migrationBuilder.CreateTable(
                name: "AIMessages",
                columns: table => new
                {
                    MessageId = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ConversationId = table.Column<int>(type: "integer", nullable: false),
                    Role = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Content = table.Column<string>(type: "character varying(5000)", maxLength: 5000, nullable: false),
                    SentAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ModelUsed = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    TokensUsed = table.Column<int>(type: "integer", nullable: true),
                    MessageCost = table.Column<decimal>(type: "numeric(10,6)", nullable: true),
                    UsedConsensus = table.Column<bool>(type: "boolean", nullable: false),
                    AgreementScore = table.Column<decimal>(type: "numeric(5,2)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AIMessages", x => x.MessageId);
                    table.ForeignKey(
                        name: "FK_AIMessages_AIConversations_ConversationId",
                        column: x => x.ConversationId,
                        principalTable: "AIConversations",
                        principalColumn: "ConversationId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AIUserMemories",
                columns: table => new
                {
                    UserMemoryId = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UserId = table.Column<int>(type: "integer", nullable: false),
                    MemoryType = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    MemoryKey = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    MemoryValue = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    Context = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    ConfidenceScore = table.Column<int>(type: "integer", nullable: false),
                    LearnedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    LastReinforcedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ReinforcementCount = table.Column<int>(type: "integer", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    DeprecatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    DeprecationReason = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    SourceConversationId = table.Column<int>(type: "integer", nullable: true),
                    SourceAdviceId = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AIUserMemories", x => x.UserMemoryId);
                    table.ForeignKey(
                        name: "FK_AIUserMemories_AIConversations_SourceConversationId",
                        column: x => x.SourceConversationId,
                        principalTable: "AIConversations",
                        principalColumn: "ConversationId");
                    table.ForeignKey(
                        name: "FK_AIUserMemories_Advice_SourceAdviceId",
                        column: x => x.SourceAdviceId,
                        principalTable: "Advice",
                        principalColumn: "AdviceId");
                    table.ForeignKey(
                        name: "FK_AIUserMemories_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Alerts_MarketContextId",
                table: "Alerts",
                column: "MarketContextId");

            migrationBuilder.CreateIndex(
                name: "IX_Advice_MarketContextId",
                table: "Advice",
                column: "MarketContextId");

            migrationBuilder.CreateIndex(
                name: "IX_AIActionMemories_SourceAdviceId",
                table: "AIActionMemories",
                column: "SourceAdviceId");

            migrationBuilder.CreateIndex(
                name: "IX_AIActionMemories_SourceAlertId",
                table: "AIActionMemories",
                column: "SourceAlertId");

            migrationBuilder.CreateIndex(
                name: "IX_AIActionMemories_UserId",
                table: "AIActionMemories",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_AIConversations_RelatedAdviceId",
                table: "AIConversations",
                column: "RelatedAdviceId");

            migrationBuilder.CreateIndex(
                name: "IX_AIConversations_UserId",
                table: "AIConversations",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_AIMessages_ConversationId",
                table: "AIMessages",
                column: "ConversationId");

            migrationBuilder.CreateIndex(
                name: "IX_AIUserMemories_SourceAdviceId",
                table: "AIUserMemories",
                column: "SourceAdviceId");

            migrationBuilder.CreateIndex(
                name: "IX_AIUserMemories_SourceConversationId",
                table: "AIUserMemories",
                column: "SourceConversationId");

            migrationBuilder.CreateIndex(
                name: "IX_AIUserMemories_UserId",
                table: "AIUserMemories",
                column: "UserId");

            migrationBuilder.AddForeignKey(
                name: "FK_Advice_MarketContexts_MarketContextId",
                table: "Advice",
                column: "MarketContextId",
                principalTable: "MarketContexts",
                principalColumn: "MarketContextId");

            migrationBuilder.AddForeignKey(
                name: "FK_Alerts_MarketContexts_MarketContextId",
                table: "Alerts",
                column: "MarketContextId",
                principalTable: "MarketContexts",
                principalColumn: "MarketContextId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Advice_MarketContexts_MarketContextId",
                table: "Advice");

            migrationBuilder.DropForeignKey(
                name: "FK_Alerts_MarketContexts_MarketContextId",
                table: "Alerts");

            migrationBuilder.DropTable(
                name: "AIActionMemories");

            migrationBuilder.DropTable(
                name: "AIMessages");

            migrationBuilder.DropTable(
                name: "AIUserMemories");

            migrationBuilder.DropTable(
                name: "MarketContexts");

            migrationBuilder.DropTable(
                name: "AIConversations");

            migrationBuilder.DropIndex(
                name: "IX_Alerts_MarketContextId",
                table: "Alerts");

            migrationBuilder.DropIndex(
                name: "IX_Advice_MarketContextId",
                table: "Advice");

            migrationBuilder.DropColumn(
                name: "AIAnalyzed",
                table: "Alerts");

            migrationBuilder.DropColumn(
                name: "AIAnalyzedAt",
                table: "Alerts");

            migrationBuilder.DropColumn(
                name: "AIContext",
                table: "Alerts");

            migrationBuilder.DropColumn(
                name: "MarketContextId",
                table: "Alerts");

            migrationBuilder.DropColumn(
                name: "AIGenerationCost",
                table: "Advice");

            migrationBuilder.DropColumn(
                name: "AggressiveRecommendation",
                table: "Advice");

            migrationBuilder.DropColumn(
                name: "AgreementScore",
                table: "Advice");

            migrationBuilder.DropColumn(
                name: "ConservativeRecommendation",
                table: "Advice");

            migrationBuilder.DropColumn(
                name: "HasConsensus",
                table: "Advice");

            migrationBuilder.DropColumn(
                name: "MarketContextId",
                table: "Advice");

            migrationBuilder.DropColumn(
                name: "ModelsUsed",
                table: "Advice");

            migrationBuilder.DropColumn(
                name: "TotalTokensUsed",
                table: "Advice");
        }
    }
}
