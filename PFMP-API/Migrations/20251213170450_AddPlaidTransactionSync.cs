using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PFMP_API.Migrations
{
    /// <inheritdoc />
    public partial class AddPlaidTransactionSync : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "MerchantLogoUrl",
                table: "CashTransactions",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PaymentChannel",
                table: "CashTransactions",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PlaidCategory",
                table: "CashTransactions",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PlaidCategoryDetailed",
                table: "CashTransactions",
                type: "character varying(150)",
                maxLength: 150,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PlaidTransactionId",
                table: "CashTransactions",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Source",
                table: "CashTransactions",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TransactionsCursor",
                table: "AccountConnections",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "TransactionsLastSyncedAt",
                table: "AccountConnections",
                type: "timestamp with time zone",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "MerchantLogoUrl",
                table: "CashTransactions");

            migrationBuilder.DropColumn(
                name: "PaymentChannel",
                table: "CashTransactions");

            migrationBuilder.DropColumn(
                name: "PlaidCategory",
                table: "CashTransactions");

            migrationBuilder.DropColumn(
                name: "PlaidCategoryDetailed",
                table: "CashTransactions");

            migrationBuilder.DropColumn(
                name: "PlaidTransactionId",
                table: "CashTransactions");

            migrationBuilder.DropColumn(
                name: "Source",
                table: "CashTransactions");

            migrationBuilder.DropColumn(
                name: "TransactionsCursor",
                table: "AccountConnections");

            migrationBuilder.DropColumn(
                name: "TransactionsLastSyncedAt",
                table: "AccountConnections");
        }
    }
}
