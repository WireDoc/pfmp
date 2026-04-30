using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PFMP_API.Migrations
{
    /// <inheritdoc />
    public partial class AddSymbolMetricsCache : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "SymbolMetricsCache",
                columns: table => new
                {
                    Symbol = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    AsOfDate = table.Column<DateOnly>(type: "date", nullable: false),
                    Last = table.Column<decimal>(type: "numeric(18,8)", nullable: false),
                    High52w = table.Column<decimal>(type: "numeric(18,8)", nullable: false),
                    Low52w = table.Column<decimal>(type: "numeric(18,8)", nullable: false),
                    YearStartClose = table.Column<decimal>(type: "numeric(18,8)", nullable: true),
                    YtdPercent = table.Column<decimal>(type: "numeric(8,4)", nullable: true),
                    PercentFrom52wHigh = table.Column<decimal>(type: "numeric(8,4)", nullable: false),
                    PercentFrom52wLow = table.Column<decimal>(type: "numeric(8,4)", nullable: false),
                    RefreshedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SymbolMetricsCache", x => x.Symbol);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "SymbolMetricsCache");
        }
    }
}
