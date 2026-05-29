using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PFMP_API.Migrations
{
    /// <inheritdoc />
    public partial class Wave14_IncomeStreamAllotments : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "AllotmentDestinationAccountId",
                table: "IncomeStreams",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "AllotmentType",
                table: "IncomeStreams",
                type: "integer",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AllotmentDestinationAccountId",
                table: "IncomeStreams");

            migrationBuilder.DropColumn(
                name: "AllotmentType",
                table: "IncomeStreams");
        }
    }
}
