using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PFMP_API.Migrations
{
    /// <inheritdoc />
    public partial class Wave7_4_AddAccountPurposeAndUserPreferences : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "TransactionalAccountDesiredBalance",
                table: "Users",
                type: "numeric(18,2)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Purpose",
                table: "CashAccounts",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Purpose",
                table: "Accounts",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "TransactionalAccountDesiredBalance",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "Purpose",
                table: "CashAccounts");

            migrationBuilder.DropColumn(
                name: "Purpose",
                table: "Accounts");
        }
    }
}
