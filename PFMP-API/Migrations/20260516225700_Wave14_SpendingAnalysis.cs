using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace PFMP_API.Migrations
{
    /// <inheritdoc />
    public partial class Wave14_SpendingAnalysis : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "AllotmentDestinationAccountId",
                table: "IncomeSources",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "AllotmentType",
                table: "IncomeSources",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<DateTime>(
                name: "EffectiveFrom",
                table: "FinancialProfileExpenses",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            // Wave 14 P1 — backfill EffectiveFrom from existing CreatedAt so legacy
            // budgets have a sensible start date instead of the default. Postgres stores
            // the 0001-01-01 default as -infinity (outside the safe timestamp range), so
            // we match anything below 1900-01-01 (covers both -infinity and 0001-01-01).
            migrationBuilder.Sql(
                "UPDATE \"FinancialProfileExpenses\" SET \"EffectiveFrom\" = \"CreatedAt\" " +
                "WHERE \"EffectiveFrom\" < TIMESTAMP '1900-01-01 00:00:00+00';");

            migrationBuilder.AddColumn<DateTime>(
                name: "EffectiveTo",
                table: "FinancialProfileExpenses",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "PeriodType",
                table: "FinancialProfileExpenses",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "PlaidDetailedCategory",
                table: "FinancialProfileExpenses",
                type: "character varying(160)",
                maxLength: 160,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PlaidPrimaryCategory",
                table: "FinancialProfileExpenses",
                type: "character varying(120)",
                maxLength: 120,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "RolloverAmount",
                table: "FinancialProfileExpenses",
                type: "numeric(18,4)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<bool>(
                name: "RolloverEnabled",
                table: "FinancialProfileExpenses",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateTable(
                name: "RecurringTransactionStreams",
                columns: table => new
                {
                    StreamId = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UserId = table.Column<int>(type: "integer", nullable: false),
                    Source = table.Column<int>(type: "integer", nullable: false),
                    PlaidStreamId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    MerchantName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    Direction = table.Column<int>(type: "integer", nullable: false),
                    AverageAmount = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    LastAmount = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    Frequency = table.Column<int>(type: "integer", nullable: false),
                    LastDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    NextExpectedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    ConfidenceScore = table.Column<decimal>(type: "numeric(5,4)", nullable: true),
                    PlaidCategory = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: true),
                    PlaidCategoryDetailed = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: true),
                    DateCreated = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    DateUpdated = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RecurringTransactionStreams", x => x.StreamId);
                    table.ForeignKey(
                        name: "FK_RecurringTransactionStreams_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "SpendingAnomalies",
                columns: table => new
                {
                    AnomalyId = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UserId = table.Column<int>(type: "integer", nullable: false),
                    CashTransactionId = table.Column<int>(type: "integer", nullable: false),
                    PlaidPrimaryCategory = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    Amount = table.Column<decimal>(type: "numeric(18,4)", nullable: false),
                    CategoryMedian = table.Column<decimal>(type: "numeric(18,4)", nullable: false),
                    CategoryIqr = table.Column<decimal>(type: "numeric(18,4)", nullable: false),
                    DeviationMultiple = table.Column<decimal>(type: "numeric(8,4)", nullable: false),
                    DetectedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Dismissed = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SpendingAnomalies", x => x.AnomalyId);
                    table.ForeignKey(
                        name: "FK_SpendingAnomalies_CashTransactions_CashTransactionId",
                        column: x => x.CashTransactionId,
                        principalTable: "CashTransactions",
                        principalColumn: "CashTransactionId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_SpendingAnomalies_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "SpendingCategoryRollups",
                columns: table => new
                {
                    RollupId = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UserId = table.Column<int>(type: "integer", nullable: false),
                    PeriodStart = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    PlaidPrimaryCategory = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    PlaidDetailedCategory = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: true),
                    ActualAmount = table.Column<decimal>(type: "numeric(18,4)", nullable: false),
                    BudgetedAmount = table.Column<decimal>(type: "numeric(18,4)", nullable: true),
                    TransactionCount = table.Column<int>(type: "integer", nullable: false),
                    DateUpdated = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SpendingCategoryRollups", x => x.RollupId);
                    table.ForeignKey(
                        name: "FK_SpendingCategoryRollups_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "SpendingCategoryRules",
                columns: table => new
                {
                    RuleId = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UserId = table.Column<int>(type: "integer", nullable: false),
                    MatchType = table.Column<int>(type: "integer", nullable: false),
                    MatchValue = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    AssignedPrimaryCategory = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    AssignedDetailedCategory = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: true),
                    Priority = table.Column<int>(type: "integer", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    DateCreated = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    DateUpdated = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SpendingCategoryRules", x => x.RuleId);
                    table.ForeignKey(
                        name: "FK_SpendingCategoryRules_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_RecurringTransactionStreams_UserId_MerchantName_Direction_F~",
                table: "RecurringTransactionStreams",
                columns: new[] { "UserId", "MerchantName", "Direction", "Frequency" });

            migrationBuilder.CreateIndex(
                name: "IX_RecurringTransactionStreams_UserId_Source_PlaidStreamId",
                table: "RecurringTransactionStreams",
                columns: new[] { "UserId", "Source", "PlaidStreamId" },
                unique: true,
                filter: "\"PlaidStreamId\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_SpendingAnomalies_CashTransactionId",
                table: "SpendingAnomalies",
                column: "CashTransactionId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_SpendingAnomalies_UserId_Dismissed_DetectedAt",
                table: "SpendingAnomalies",
                columns: new[] { "UserId", "Dismissed", "DetectedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_SpendingCategoryRollups_UserId_PeriodStart_PlaidPrimaryCate~",
                table: "SpendingCategoryRollups",
                columns: new[] { "UserId", "PeriodStart", "PlaidPrimaryCategory", "PlaidDetailedCategory" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_SpendingCategoryRules_UserId_IsActive_Priority",
                table: "SpendingCategoryRules",
                columns: new[] { "UserId", "IsActive", "Priority" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "RecurringTransactionStreams");

            migrationBuilder.DropTable(
                name: "SpendingAnomalies");

            migrationBuilder.DropTable(
                name: "SpendingCategoryRollups");

            migrationBuilder.DropTable(
                name: "SpendingCategoryRules");

            migrationBuilder.DropColumn(
                name: "AllotmentDestinationAccountId",
                table: "IncomeSources");

            migrationBuilder.DropColumn(
                name: "AllotmentType",
                table: "IncomeSources");

            migrationBuilder.DropColumn(
                name: "EffectiveFrom",
                table: "FinancialProfileExpenses");

            migrationBuilder.DropColumn(
                name: "EffectiveTo",
                table: "FinancialProfileExpenses");

            migrationBuilder.DropColumn(
                name: "PeriodType",
                table: "FinancialProfileExpenses");

            migrationBuilder.DropColumn(
                name: "PlaidDetailedCategory",
                table: "FinancialProfileExpenses");

            migrationBuilder.DropColumn(
                name: "PlaidPrimaryCategory",
                table: "FinancialProfileExpenses");

            migrationBuilder.DropColumn(
                name: "RolloverAmount",
                table: "FinancialProfileExpenses");

            migrationBuilder.DropColumn(
                name: "RolloverEnabled",
                table: "FinancialProfileExpenses");
        }
    }
}
