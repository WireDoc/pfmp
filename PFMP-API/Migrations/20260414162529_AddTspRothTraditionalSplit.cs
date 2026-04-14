using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PFMP_API.Migrations
{
    /// <inheritdoc />
    public partial class AddTspRothTraditionalSplit : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "RothBalance",
                table: "TspProfiles",
                type: "numeric(18,2)",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "RothContributionRatePercent",
                table: "TspProfiles",
                type: "numeric(8,4)",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "TraditionalBalance",
                table: "TspProfiles",
                type: "numeric(18,2)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "RothBalance",
                table: "TspProfiles");

            migrationBuilder.DropColumn(
                name: "RothContributionRatePercent",
                table: "TspProfiles");

            migrationBuilder.DropColumn(
                name: "TraditionalBalance",
                table: "TspProfiles");
        }
    }
}
