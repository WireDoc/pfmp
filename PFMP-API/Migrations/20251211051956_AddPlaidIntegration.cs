using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PFMP_API.Migrations
{
    /// <inheritdoc />
    public partial class AddPlaidIntegration : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "AllowManualOverride",
                table: "CashAccounts",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "LastSyncedAt",
                table: "CashAccounts",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "ManualBalanceOverride",
                table: "CashAccounts",
                type: "numeric(18,2)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PlaidAccountId",
                table: "CashAccounts",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PlaidItemId",
                table: "CashAccounts",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Source",
                table: "CashAccounts",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "SyncErrorMessage",
                table: "CashAccounts",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "SyncStatus",
                table: "CashAccounts",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateTable(
                name: "AccountConnections",
                columns: table => new
                {
                    ConnectionId = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<int>(type: "integer", nullable: false),
                    Source = table.Column<int>(type: "integer", nullable: false),
                    PlaidItemId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    PlaidAccessToken = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    PlaidInstitutionId = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    PlaidInstitutionName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    ErrorMessage = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    SyncFailureCount = table.Column<int>(type: "integer", nullable: false),
                    ConnectedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    LastSyncedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AccountConnections", x => x.ConnectionId);
                    table.ForeignKey(
                        name: "FK_AccountConnections_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "SyncHistory",
                columns: table => new
                {
                    SyncHistoryId = table.Column<Guid>(type: "uuid", nullable: false),
                    ConnectionId = table.Column<Guid>(type: "uuid", nullable: false),
                    SyncStartedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    SyncCompletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    ErrorMessage = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    AccountsUpdated = table.Column<int>(type: "integer", nullable: false),
                    DurationMs = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SyncHistory", x => x.SyncHistoryId);
                    table.ForeignKey(
                        name: "FK_SyncHistory_AccountConnections_ConnectionId",
                        column: x => x.ConnectionId,
                        principalTable: "AccountConnections",
                        principalColumn: "ConnectionId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AccountConnections_PlaidItemId",
                table: "AccountConnections",
                column: "PlaidItemId");

            migrationBuilder.CreateIndex(
                name: "IX_AccountConnections_UserId",
                table: "AccountConnections",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_AccountConnections_UserId_Source",
                table: "AccountConnections",
                columns: new[] { "UserId", "Source" });

            migrationBuilder.CreateIndex(
                name: "IX_SyncHistory_ConnectionId",
                table: "SyncHistory",
                column: "ConnectionId");

            migrationBuilder.CreateIndex(
                name: "IX_SyncHistory_SyncStartedAt",
                table: "SyncHistory",
                column: "SyncStartedAt");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "SyncHistory");

            migrationBuilder.DropTable(
                name: "AccountConnections");

            migrationBuilder.DropColumn(
                name: "AllowManualOverride",
                table: "CashAccounts");

            migrationBuilder.DropColumn(
                name: "LastSyncedAt",
                table: "CashAccounts");

            migrationBuilder.DropColumn(
                name: "ManualBalanceOverride",
                table: "CashAccounts");

            migrationBuilder.DropColumn(
                name: "PlaidAccountId",
                table: "CashAccounts");

            migrationBuilder.DropColumn(
                name: "PlaidItemId",
                table: "CashAccounts");

            migrationBuilder.DropColumn(
                name: "Source",
                table: "CashAccounts");

            migrationBuilder.DropColumn(
                name: "SyncErrorMessage",
                table: "CashAccounts");

            migrationBuilder.DropColumn(
                name: "SyncStatus",
                table: "CashAccounts");
        }
    }
}
