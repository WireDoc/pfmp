using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PFMP_API.Migrations
{
    /// <inheritdoc />
    public partial class Wave14_IncomeStreamFrequency : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // IncomeStreamFrequency enum order: Weekly=0, Biweekly=1, Semimonthly=2, Monthly=3.
            // Default to Monthly (3) so existing rows preserve the legacy monthly-only
            // behavior — otherwise their per-period amount would be misinterpreted.
            migrationBuilder.AddColumn<int>(
                name: "AllotmentFrequency",
                table: "IncomeStreams",
                type: "integer",
                nullable: false,
                defaultValue: 3);

            migrationBuilder.AddColumn<decimal>(
                name: "AllotmentPerPeriodAmount",
                table: "IncomeStreams",
                type: "numeric(18,2)",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "AmountFrequency",
                table: "IncomeStreams",
                type: "integer",
                nullable: false,
                defaultValue: 3);

            migrationBuilder.AddColumn<decimal>(
                name: "PerPeriodAmount",
                table: "IncomeStreams",
                type: "numeric(18,2)",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "PerPeriodNetAmount",
                table: "IncomeStreams",
                type: "numeric(18,2)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AllotmentFrequency",
                table: "IncomeStreams");

            migrationBuilder.DropColumn(
                name: "AllotmentPerPeriodAmount",
                table: "IncomeStreams");

            migrationBuilder.DropColumn(
                name: "AmountFrequency",
                table: "IncomeStreams");

            migrationBuilder.DropColumn(
                name: "PerPeriodAmount",
                table: "IncomeStreams");

            migrationBuilder.DropColumn(
                name: "PerPeriodNetAmount",
                table: "IncomeStreams");
        }
    }
}
