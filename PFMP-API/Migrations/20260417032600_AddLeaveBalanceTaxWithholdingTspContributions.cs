using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PFMP_API.Migrations
{
    /// <inheritdoc />
    public partial class AddLeaveBalanceTaxWithholdingTspContributions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "AgencyMatchBiweekly",
                table: "TspProfiles",
                type: "numeric(18,2)",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "CatchUpContributionBiweekly",
                table: "TspProfiles",
                type: "numeric(18,2)",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "EmployeeContributionBiweekly",
                table: "TspProfiles",
                type: "numeric(18,2)",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "RothContributionBiweekly",
                table: "TspProfiles",
                type: "numeric(18,2)",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "AnnualLeaveBalance",
                table: "FederalBenefitsProfiles",
                type: "numeric(10,2)",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "FederalTaxWithholdingBiweekly",
                table: "FederalBenefitsProfiles",
                type: "numeric(18,2)",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "MedicareDeductionBiweekly",
                table: "FederalBenefitsProfiles",
                type: "numeric(18,2)",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "OasdiDeductionBiweekly",
                table: "FederalBenefitsProfiles",
                type: "numeric(18,2)",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "SickLeaveBalance",
                table: "FederalBenefitsProfiles",
                type: "numeric(10,2)",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "StateTaxWithholdingBiweekly",
                table: "FederalBenefitsProfiles",
                type: "numeric(18,2)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AgencyMatchBiweekly",
                table: "TspProfiles");

            migrationBuilder.DropColumn(
                name: "CatchUpContributionBiweekly",
                table: "TspProfiles");

            migrationBuilder.DropColumn(
                name: "EmployeeContributionBiweekly",
                table: "TspProfiles");

            migrationBuilder.DropColumn(
                name: "RothContributionBiweekly",
                table: "TspProfiles");

            migrationBuilder.DropColumn(
                name: "AnnualLeaveBalance",
                table: "FederalBenefitsProfiles");

            migrationBuilder.DropColumn(
                name: "FederalTaxWithholdingBiweekly",
                table: "FederalBenefitsProfiles");

            migrationBuilder.DropColumn(
                name: "MedicareDeductionBiweekly",
                table: "FederalBenefitsProfiles");

            migrationBuilder.DropColumn(
                name: "OasdiDeductionBiweekly",
                table: "FederalBenefitsProfiles");

            migrationBuilder.DropColumn(
                name: "SickLeaveBalance",
                table: "FederalBenefitsProfiles");

            migrationBuilder.DropColumn(
                name: "StateTaxWithholdingBiweekly",
                table: "FederalBenefitsProfiles");
        }
    }
}
