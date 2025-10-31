using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PFMP_API.Migrations
{
    /// <inheritdoc />
    public partial class IncreaseAdviceRecommendationLength : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "ConservativeRecommendation",
                table: "Advice",
                type: "character varying(5000)",
                maxLength: 5000,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(2000)",
                oldMaxLength: 2000,
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "AggressiveRecommendation",
                table: "Advice",
                type: "character varying(5000)",
                maxLength: 5000,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(2000)",
                oldMaxLength: 2000,
                oldNullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "ConservativeRecommendation",
                table: "Advice",
                type: "character varying(2000)",
                maxLength: 2000,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(5000)",
                oldMaxLength: 5000,
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "AggressiveRecommendation",
                table: "Advice",
                type: "character varying(2000)",
                maxLength: 2000,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(5000)",
                oldMaxLength: 5000,
                oldNullable: true);
        }
    }
}
