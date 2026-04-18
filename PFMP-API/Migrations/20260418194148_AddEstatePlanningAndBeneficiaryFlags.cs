using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace PFMP_API.Migrations
{
    /// <inheritdoc />
    public partial class AddEstatePlanningAndBeneficiaryFlags : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "HasFegliBeneficiaryDesignation",
                table: "FederalBenefitsProfiles",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "HasTspBeneficiaryDesignation",
                table: "FederalBenefitsProfiles",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "HasBeneficiaryDesignation",
                table: "Accounts",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateTable(
                name: "EstatePlanningProfiles",
                columns: table => new
                {
                    EstatePlanningProfileId = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UserId = table.Column<int>(type: "integer", nullable: false),
                    HasWill = table.Column<bool>(type: "boolean", nullable: false),
                    WillLastReviewedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    HasTrust = table.Column<bool>(type: "boolean", nullable: false),
                    TrustType = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    TrustLastReviewedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    HasFinancialPOA = table.Column<bool>(type: "boolean", nullable: false),
                    HasHealthcarePOA = table.Column<bool>(type: "boolean", nullable: false),
                    HasAdvanceDirective = table.Column<bool>(type: "boolean", nullable: false),
                    AttorneyName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    AttorneyLastConsultDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Notes = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EstatePlanningProfiles", x => x.EstatePlanningProfileId);
                    table.ForeignKey(
                        name: "FK_EstatePlanningProfiles_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_EstatePlanningProfiles_UserId",
                table: "EstatePlanningProfiles",
                column: "UserId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "EstatePlanningProfiles");

            migrationBuilder.DropColumn(
                name: "HasFegliBeneficiaryDesignation",
                table: "FederalBenefitsProfiles");

            migrationBuilder.DropColumn(
                name: "HasTspBeneficiaryDesignation",
                table: "FederalBenefitsProfiles");

            migrationBuilder.DropColumn(
                name: "HasBeneficiaryDesignation",
                table: "Accounts");
        }
    }
}
