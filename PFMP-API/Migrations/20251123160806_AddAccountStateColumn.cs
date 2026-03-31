using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PFMP_API.Migrations
{
    /// <inheritdoc />
    public partial class AddAccountStateColumn : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Add State column with default value
            migrationBuilder.AddColumn<string>(
                name: "State",
                table: "Accounts",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "DETAILED");

            // Create index on State column
            migrationBuilder.CreateIndex(
                name: "IX_Accounts_State",
                table: "Accounts",
                column: "State");

            // Update existing accounts to DETAILED state
            // (All existing accounts already have holdings, so they are DETAILED)
            migrationBuilder.Sql("UPDATE \"Accounts\" SET \"State\" = 'DETAILED'");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Drop index
            migrationBuilder.DropIndex(
                name: "IX_Accounts_State",
                table: "Accounts");

            // Drop column
            migrationBuilder.DropColumn(
                name: "State",
                table: "Accounts");
        }
    }
}
