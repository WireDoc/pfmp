using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PFMP_API.Migrations
{
    /// <inheritdoc />
    public partial class Wave25b_ValuationProviderSelection : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "PreferredValuationProvider",
                table: "Properties",
                type: "character varying(30)",
                maxLength: 30,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ValuationAnchorDate",
                table: "Properties",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "ValuationAnchorValue",
                table: "Properties",
                type: "numeric(18,2)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PreferredValuationProvider",
                table: "Properties");

            migrationBuilder.DropColumn(
                name: "ValuationAnchorDate",
                table: "Properties");

            migrationBuilder.DropColumn(
                name: "ValuationAnchorValue",
                table: "Properties");
        }
    }
}
