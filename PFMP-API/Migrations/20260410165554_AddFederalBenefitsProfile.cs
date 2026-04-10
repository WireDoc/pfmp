using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace PFMP_API.Migrations
{
    /// <inheritdoc />
    public partial class AddFederalBenefitsProfile : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "InflationAssumptionPercent",
                table: "Users",
                type: "numeric(5,2)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PlannedRetirementState",
                table: "Users",
                type: "character varying(2)",
                maxLength: 2,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "ProjectedMonthlyRetirementExpenses",
                table: "Users",
                type: "numeric(18,2)",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "FederalBenefitsProfiles",
                columns: table => new
                {
                    FederalBenefitsProfileId = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UserId = table.Column<int>(type: "integer", nullable: false),
                    High3AverageSalary = table.Column<decimal>(type: "numeric(18,2)", nullable: true),
                    ProjectedAnnuity = table.Column<decimal>(type: "numeric(18,2)", nullable: true),
                    ProjectedMonthlyPension = table.Column<decimal>(type: "numeric(18,2)", nullable: true),
                    CreditableYearsOfService = table.Column<int>(type: "integer", nullable: true),
                    CreditableMonthsOfService = table.Column<int>(type: "integer", nullable: true),
                    MinimumRetirementAge = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsEligibleForSpecialRetirementSupplement = table.Column<bool>(type: "boolean", nullable: true),
                    EstimatedSupplementMonthly = table.Column<decimal>(type: "numeric(18,2)", nullable: true),
                    SupplementEligibilityAge = table.Column<int>(type: "integer", nullable: true),
                    SupplementEndAge = table.Column<int>(type: "integer", nullable: true),
                    HasFegliBasic = table.Column<bool>(type: "boolean", nullable: false),
                    FegliBasicCoverage = table.Column<decimal>(type: "numeric(18,2)", nullable: true),
                    HasFegliOptionA = table.Column<bool>(type: "boolean", nullable: false),
                    HasFegliOptionB = table.Column<bool>(type: "boolean", nullable: false),
                    FegliOptionBMultiple = table.Column<int>(type: "integer", nullable: true),
                    HasFegliOptionC = table.Column<bool>(type: "boolean", nullable: false),
                    FegliOptionCMultiple = table.Column<int>(type: "integer", nullable: true),
                    FegliTotalMonthlyPremium = table.Column<decimal>(type: "numeric(18,2)", nullable: true),
                    FehbPlanName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    FehbCoverageLevel = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    FehbMonthlyPremium = table.Column<decimal>(type: "numeric(18,2)", nullable: true),
                    FehbEmployerContribution = table.Column<decimal>(type: "numeric(18,2)", nullable: true),
                    HasFedvipDental = table.Column<bool>(type: "boolean", nullable: false),
                    FedvipDentalMonthlyPremium = table.Column<decimal>(type: "numeric(18,2)", nullable: true),
                    HasFedvipVision = table.Column<bool>(type: "boolean", nullable: false),
                    FedvipVisionMonthlyPremium = table.Column<decimal>(type: "numeric(18,2)", nullable: true),
                    HasFltcip = table.Column<bool>(type: "boolean", nullable: false),
                    FltcipMonthlyPremium = table.Column<decimal>(type: "numeric(18,2)", nullable: true),
                    HasFsa = table.Column<bool>(type: "boolean", nullable: false),
                    FsaAnnualElection = table.Column<decimal>(type: "numeric(18,2)", nullable: true),
                    HasHsa = table.Column<bool>(type: "boolean", nullable: false),
                    HsaBalance = table.Column<decimal>(type: "numeric(18,2)", nullable: true),
                    HsaAnnualContribution = table.Column<decimal>(type: "numeric(18,2)", nullable: true),
                    LastSf50UploadDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    LastSf50FileName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    LastLesUploadDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    LastLesFileName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FederalBenefitsProfiles", x => x.FederalBenefitsProfileId);
                    table.ForeignKey(
                        name: "FK_FederalBenefitsProfiles_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_FederalBenefitsProfiles_UserId",
                table: "FederalBenefitsProfiles",
                column: "UserId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "FederalBenefitsProfiles");

            migrationBuilder.DropColumn(
                name: "InflationAssumptionPercent",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "PlannedRetirementState",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "ProjectedMonthlyRetirementExpenses",
                table: "Users");
        }
    }
}
