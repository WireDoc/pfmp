using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PFMP_API.Migrations
{
    /// <inheritdoc />
    public partial class AddTspDenormalizedTotals : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "TotalBalance",
                table: "TspProfiles",
                type: "numeric(18,2)",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "CurrentMarketValue",
                table: "TspLifecyclePositions",
                type: "numeric(18,2)",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "CurrentMixPercent",
                table: "TspLifecyclePositions",
                type: "numeric(8,4)",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "CurrentPrice",
                table: "TspLifecyclePositions",
                type: "numeric(18,6)",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "LastPricedAsOfUtc",
                table: "TspLifecyclePositions",
                type: "timestamp with time zone",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "TotalBalance",
                table: "TspProfiles");

            migrationBuilder.DropColumn(
                name: "CurrentMarketValue",
                table: "TspLifecyclePositions");

            migrationBuilder.DropColumn(
                name: "CurrentMixPercent",
                table: "TspLifecyclePositions");

            migrationBuilder.DropColumn(
                name: "CurrentPrice",
                table: "TspLifecyclePositions");

            migrationBuilder.DropColumn(
                name: "LastPricedAsOfUtc",
                table: "TspLifecyclePositions");
        }
    }
}
