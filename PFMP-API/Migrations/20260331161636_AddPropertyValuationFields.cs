using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PFMP_API.Migrations
{
    /// <inheritdoc />
    public partial class AddPropertyValuationFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "AddressValidated",
                table: "Properties",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "AutoValuationEnabled",
                table: "Properties",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "LastValuationAt",
                table: "Properties",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "ValuationConfidence",
                table: "Properties",
                type: "numeric(5,4)",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "ValuationHigh",
                table: "Properties",
                type: "numeric(18,2)",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "ValuationLow",
                table: "Properties",
                type: "numeric(18,2)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ValuationSource",
                table: "Properties",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AddressValidated",
                table: "Properties");

            migrationBuilder.DropColumn(
                name: "AutoValuationEnabled",
                table: "Properties");

            migrationBuilder.DropColumn(
                name: "LastValuationAt",
                table: "Properties");

            migrationBuilder.DropColumn(
                name: "ValuationConfidence",
                table: "Properties");

            migrationBuilder.DropColumn(
                name: "ValuationHigh",
                table: "Properties");

            migrationBuilder.DropColumn(
                name: "ValuationLow",
                table: "Properties");

            migrationBuilder.DropColumn(
                name: "ValuationSource",
                table: "Properties");
        }
    }
}
