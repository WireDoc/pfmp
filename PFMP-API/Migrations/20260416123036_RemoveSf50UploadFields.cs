using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PFMP_API.Migrations
{
    /// <inheritdoc />
    public partial class RemoveSf50UploadFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "LastSf50FileName",
                table: "FederalBenefitsProfiles");

            migrationBuilder.DropColumn(
                name: "LastSf50UploadDate",
                table: "FederalBenefitsProfiles");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "LastSf50FileName",
                table: "FederalBenefitsProfiles",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "LastSf50UploadDate",
                table: "FederalBenefitsProfiles",
                type: "timestamp with time zone",
                nullable: true);
        }
    }
}
