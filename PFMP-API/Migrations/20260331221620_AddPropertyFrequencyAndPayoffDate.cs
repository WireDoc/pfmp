using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PFMP_API.Migrations
{
    /// <inheritdoc />
    public partial class AddPropertyFrequencyAndPayoffDate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "EstimatedPayoffDate",
                table: "Properties",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "InsuranceFrequency",
                table: "Properties",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "PropertyTaxFrequency",
                table: "Properties",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "EstimatedPayoffDate",
                table: "Properties");

            migrationBuilder.DropColumn(
                name: "InsuranceFrequency",
                table: "Properties");

            migrationBuilder.DropColumn(
                name: "PropertyTaxFrequency",
                table: "Properties");
        }
    }
}
