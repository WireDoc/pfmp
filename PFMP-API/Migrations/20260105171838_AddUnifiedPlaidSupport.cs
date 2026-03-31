using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace PFMP_API.Migrations
{
    /// <inheritdoc />
    public partial class AddUnifiedPlaidSupport : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "City",
                table: "Properties",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "LastSyncedAt",
                table: "Properties",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "LinkedMortgageLiabilityId",
                table: "Properties",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PostalCode",
                table: "Properties",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Source",
                table: "Properties",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "State",
                table: "Properties",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Street",
                table: "Properties",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SyncStatus",
                table: "Properties",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "DaysUntilDue",
                table: "FinancialProfileLiabilities",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "EscrowBalance",
                table: "FinancialProfileLiabilities",
                type: "numeric(18,2)",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsOverdue",
                table: "FinancialProfileLiabilities",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<decimal>(
                name: "LastPaymentAmount",
                table: "FinancialProfileLiabilities",
                type: "numeric(18,2)",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "LastPaymentDate",
                table: "FinancialProfileLiabilities",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "LastSyncedAt",
                table: "FinancialProfileLiabilities",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "NextPaymentDueDate",
                table: "FinancialProfileLiabilities",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PlaidAccountId",
                table: "FinancialProfileLiabilities",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PlaidItemId",
                table: "FinancialProfileLiabilities",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Source",
                table: "FinancialProfileLiabilities",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "SyncStatus",
                table: "FinancialProfileLiabilities",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "YtdInterestPaid",
                table: "FinancialProfileLiabilities",
                type: "numeric(18,2)",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "YtdPrincipalPaid",
                table: "FinancialProfileLiabilities",
                type: "numeric(18,2)",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsUnified",
                table: "AccountConnections",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "Products",
                table: "AccountConnections",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "PropertyValueHistory",
                columns: table => new
                {
                    PropertyValueHistoryId = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    PropertyId = table.Column<Guid>(type: "uuid", nullable: false),
                    ValueDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    EstimatedValue = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    MortgageBalance = table.Column<decimal>(type: "numeric(18,2)", nullable: true),
                    ValueSource = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PropertyValueHistory", x => x.PropertyValueHistoryId);
                    table.ForeignKey(
                        name: "FK_PropertyValueHistory_Properties_PropertyId",
                        column: x => x.PropertyId,
                        principalTable: "Properties",
                        principalColumn: "PropertyId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PropertyValueHistory_PropertyId",
                table: "PropertyValueHistory",
                column: "PropertyId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PropertyValueHistory");

            migrationBuilder.DropColumn(
                name: "City",
                table: "Properties");

            migrationBuilder.DropColumn(
                name: "LastSyncedAt",
                table: "Properties");

            migrationBuilder.DropColumn(
                name: "LinkedMortgageLiabilityId",
                table: "Properties");

            migrationBuilder.DropColumn(
                name: "PostalCode",
                table: "Properties");

            migrationBuilder.DropColumn(
                name: "Source",
                table: "Properties");

            migrationBuilder.DropColumn(
                name: "State",
                table: "Properties");

            migrationBuilder.DropColumn(
                name: "Street",
                table: "Properties");

            migrationBuilder.DropColumn(
                name: "SyncStatus",
                table: "Properties");

            migrationBuilder.DropColumn(
                name: "DaysUntilDue",
                table: "FinancialProfileLiabilities");

            migrationBuilder.DropColumn(
                name: "EscrowBalance",
                table: "FinancialProfileLiabilities");

            migrationBuilder.DropColumn(
                name: "IsOverdue",
                table: "FinancialProfileLiabilities");

            migrationBuilder.DropColumn(
                name: "LastPaymentAmount",
                table: "FinancialProfileLiabilities");

            migrationBuilder.DropColumn(
                name: "LastPaymentDate",
                table: "FinancialProfileLiabilities");

            migrationBuilder.DropColumn(
                name: "LastSyncedAt",
                table: "FinancialProfileLiabilities");

            migrationBuilder.DropColumn(
                name: "NextPaymentDueDate",
                table: "FinancialProfileLiabilities");

            migrationBuilder.DropColumn(
                name: "PlaidAccountId",
                table: "FinancialProfileLiabilities");

            migrationBuilder.DropColumn(
                name: "PlaidItemId",
                table: "FinancialProfileLiabilities");

            migrationBuilder.DropColumn(
                name: "Source",
                table: "FinancialProfileLiabilities");

            migrationBuilder.DropColumn(
                name: "SyncStatus",
                table: "FinancialProfileLiabilities");

            migrationBuilder.DropColumn(
                name: "YtdInterestPaid",
                table: "FinancialProfileLiabilities");

            migrationBuilder.DropColumn(
                name: "YtdPrincipalPaid",
                table: "FinancialProfileLiabilities");

            migrationBuilder.DropColumn(
                name: "IsUnified",
                table: "AccountConnections");

            migrationBuilder.DropColumn(
                name: "Products",
                table: "AccountConnections");
        }
    }
}
