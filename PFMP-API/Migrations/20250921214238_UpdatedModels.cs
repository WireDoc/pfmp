using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PFMP_API.Migrations
{
    /// <inheritdoc />
    public partial class UpdatedModels : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "TSPAllocation_L2030FundPercentage",
                table: "Accounts",
                type: "numeric(5,2)",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "TSPAllocation_L2035FundPercentage",
                table: "Accounts",
                type: "numeric(5,2)",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "TSPAllocation_L2040FundPercentage",
                table: "Accounts",
                type: "numeric(5,2)",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "TSPAllocation_L2045FundPercentage",
                table: "Accounts",
                type: "numeric(5,2)",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "TSPAllocation_L2050FundPercentage",
                table: "Accounts",
                type: "numeric(5,2)",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "TSPAllocation_L2055FundPercentage",
                table: "Accounts",
                type: "numeric(5,2)",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "TSPAllocation_L2060FundPercentage",
                table: "Accounts",
                type: "numeric(5,2)",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "TSPAllocation_L2065FundPercentage",
                table: "Accounts",
                type: "numeric(5,2)",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "TSPAllocation_L2070FundPercentage",
                table: "Accounts",
                type: "numeric(5,2)",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "TSPAllocation_L2075FundPercentage",
                table: "Accounts",
                type: "numeric(5,2)",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "TSPAllocation_LIncomeFundPercentage",
                table: "Accounts",
                type: "numeric(5,2)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "TSPAllocation_L2030FundPercentage",
                table: "Accounts");

            migrationBuilder.DropColumn(
                name: "TSPAllocation_L2035FundPercentage",
                table: "Accounts");

            migrationBuilder.DropColumn(
                name: "TSPAllocation_L2040FundPercentage",
                table: "Accounts");

            migrationBuilder.DropColumn(
                name: "TSPAllocation_L2045FundPercentage",
                table: "Accounts");

            migrationBuilder.DropColumn(
                name: "TSPAllocation_L2050FundPercentage",
                table: "Accounts");

            migrationBuilder.DropColumn(
                name: "TSPAllocation_L2055FundPercentage",
                table: "Accounts");

            migrationBuilder.DropColumn(
                name: "TSPAllocation_L2060FundPercentage",
                table: "Accounts");

            migrationBuilder.DropColumn(
                name: "TSPAllocation_L2065FundPercentage",
                table: "Accounts");

            migrationBuilder.DropColumn(
                name: "TSPAllocation_L2070FundPercentage",
                table: "Accounts");

            migrationBuilder.DropColumn(
                name: "TSPAllocation_L2075FundPercentage",
                table: "Accounts");

            migrationBuilder.DropColumn(
                name: "TSPAllocation_LIncomeFundPercentage",
                table: "Accounts");
        }
    }
}
