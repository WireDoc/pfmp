using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PFMP_API.Migrations
{
    /// <inheritdoc />
    public partial class AddRetirementProjectionFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "AnnualSalaryGrowthRate",
                table: "FederalBenefitsProfiles",
                type: "numeric(5,2)",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "SocialSecurityEstimateAt62",
                table: "FederalBenefitsProfiles",
                type: "numeric(18,2)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AnnualSalaryGrowthRate",
                table: "FederalBenefitsProfiles");

            migrationBuilder.DropColumn(
                name: "SocialSecurityEstimateAt62",
                table: "FederalBenefitsProfiles");
        }
    }
}
