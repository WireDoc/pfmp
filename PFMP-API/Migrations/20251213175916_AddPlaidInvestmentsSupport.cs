using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PFMP_API.Migrations
{
    /// <inheritdoc />
    public partial class AddPlaidInvestmentsSupport : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Cusip",
                table: "Holdings",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Isin",
                table: "Holdings",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PlaidHoldingId",
                table: "Holdings",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "PlaidLastSyncedAt",
                table: "Holdings",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PlaidSecurityId",
                table: "Holdings",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "ConnectionId",
                table: "Accounts",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PlaidAccountId",
                table: "Accounts",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PlaidItemId",
                table: "Accounts",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "PlaidLastSyncedAt",
                table: "Accounts",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PlaidSyncErrorMessage",
                table: "Accounts",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "PlaidSyncStatus",
                table: "Accounts",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "Source",
                table: "Accounts",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateTable(
                name: "PlaidSecurities",
                columns: table => new
                {
                    PlaidSecurityId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    TickerSymbol = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    Name = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    Type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Cusip = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    Isin = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    Sedol = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    InstitutionSecurityId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    IsoCurrencyCode = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: true),
                    UnofficialCurrencyCode = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: true),
                    ClosePrice = table.Column<decimal>(type: "numeric(18,8)", nullable: true),
                    ClosePriceAsOf = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsCashEquivalent = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PlaidSecurities", x => x.PlaidSecurityId);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PlaidSecurities");

            migrationBuilder.DropColumn(
                name: "Cusip",
                table: "Holdings");

            migrationBuilder.DropColumn(
                name: "Isin",
                table: "Holdings");

            migrationBuilder.DropColumn(
                name: "PlaidHoldingId",
                table: "Holdings");

            migrationBuilder.DropColumn(
                name: "PlaidLastSyncedAt",
                table: "Holdings");

            migrationBuilder.DropColumn(
                name: "PlaidSecurityId",
                table: "Holdings");

            migrationBuilder.DropColumn(
                name: "ConnectionId",
                table: "Accounts");

            migrationBuilder.DropColumn(
                name: "PlaidAccountId",
                table: "Accounts");

            migrationBuilder.DropColumn(
                name: "PlaidItemId",
                table: "Accounts");

            migrationBuilder.DropColumn(
                name: "PlaidLastSyncedAt",
                table: "Accounts");

            migrationBuilder.DropColumn(
                name: "PlaidSyncErrorMessage",
                table: "Accounts");

            migrationBuilder.DropColumn(
                name: "PlaidSyncStatus",
                table: "Accounts");

            migrationBuilder.DropColumn(
                name: "Source",
                table: "Accounts");
        }
    }
}
