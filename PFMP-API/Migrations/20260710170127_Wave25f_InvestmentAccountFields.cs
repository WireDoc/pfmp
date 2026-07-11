using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PFMP_API.Migrations
{
    /// <inheritdoc />
    public partial class Wave25f_InvestmentAccountFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "ContributionRatePercent",
                table: "Accounts",
                type: "numeric(5,2)",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "CostBasis",
                table: "Accounts",
                type: "numeric(18,2)",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "LastContributionDate",
                table: "Accounts",
                type: "timestamp with time zone",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ContributionRatePercent",
                table: "Accounts");

            migrationBuilder.DropColumn(
                name: "CostBasis",
                table: "Accounts");

            migrationBuilder.DropColumn(
                name: "LastContributionDate",
                table: "Accounts");
        }
    }
}
