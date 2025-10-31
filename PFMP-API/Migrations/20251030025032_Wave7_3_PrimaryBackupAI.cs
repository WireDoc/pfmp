using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PFMP_API.Migrations
{
    /// <inheritdoc />
    public partial class Wave7_3_PrimaryBackupAI : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "BackupAgreementLevel",
                table: "Advice",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "BackupCorroboration",
                table: "Advice",
                type: "character varying(5000)",
                maxLength: 5000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PrimaryRecommendation",
                table: "Advice",
                type: "character varying(5000)",
                maxLength: 5000,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "BackupAgreementLevel",
                table: "Advice");

            migrationBuilder.DropColumn(
                name: "BackupCorroboration",
                table: "Advice");

            migrationBuilder.DropColumn(
                name: "PrimaryRecommendation",
                table: "Advice");
        }
    }
}
