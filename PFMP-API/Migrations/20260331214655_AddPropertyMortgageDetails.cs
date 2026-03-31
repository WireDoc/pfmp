using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PFMP_API.Migrations
{
    /// <inheritdoc />
    public partial class AddPropertyMortgageDetails : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "InterestRate",
                table: "Properties",
                type: "numeric(8,4)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Lienholder",
                table: "Properties",
                type: "character varying(150)",
                maxLength: 150,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "MonthlyInsurance",
                table: "Properties",
                type: "numeric(18,2)",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "MonthlyPropertyTax",
                table: "Properties",
                type: "numeric(18,2)",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "MortgageTerm",
                table: "Properties",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Purpose",
                table: "Properties",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "InterestRate",
                table: "Properties");

            migrationBuilder.DropColumn(
                name: "Lienholder",
                table: "Properties");

            migrationBuilder.DropColumn(
                name: "MonthlyInsurance",
                table: "Properties");

            migrationBuilder.DropColumn(
                name: "MonthlyPropertyTax",
                table: "Properties");

            migrationBuilder.DropColumn(
                name: "MortgageTerm",
                table: "Properties");

            migrationBuilder.DropColumn(
                name: "Purpose",
                table: "Properties");
        }
    }
}
