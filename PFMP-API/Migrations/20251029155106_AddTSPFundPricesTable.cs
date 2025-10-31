using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace PFMP_API.Migrations
{
    /// <inheritdoc />
    public partial class AddTSPFundPricesTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "TSPFundPrices",
                columns: table => new
                {
                    TSPFundPriceId = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    PriceDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    GFundPrice = table.Column<decimal>(type: "numeric(18,8)", nullable: false),
                    FFundPrice = table.Column<decimal>(type: "numeric(18,8)", nullable: false),
                    CFundPrice = table.Column<decimal>(type: "numeric(18,8)", nullable: false),
                    SFundPrice = table.Column<decimal>(type: "numeric(18,8)", nullable: false),
                    IFundPrice = table.Column<decimal>(type: "numeric(18,8)", nullable: false),
                    LIncomeFundPrice = table.Column<decimal>(type: "numeric(18,8)", nullable: true),
                    L2030FundPrice = table.Column<decimal>(type: "numeric(18,8)", nullable: true),
                    L2035FundPrice = table.Column<decimal>(type: "numeric(18,8)", nullable: true),
                    L2040FundPrice = table.Column<decimal>(type: "numeric(18,8)", nullable: true),
                    L2045FundPrice = table.Column<decimal>(type: "numeric(18,8)", nullable: true),
                    L2050FundPrice = table.Column<decimal>(type: "numeric(18,8)", nullable: true),
                    L2055FundPrice = table.Column<decimal>(type: "numeric(18,8)", nullable: true),
                    L2060FundPrice = table.Column<decimal>(type: "numeric(18,8)", nullable: true),
                    L2065FundPrice = table.Column<decimal>(type: "numeric(18,8)", nullable: true),
                    L2070FundPrice = table.Column<decimal>(type: "numeric(18,8)", nullable: true),
                    L2075FundPrice = table.Column<decimal>(type: "numeric(18,8)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    DataSource = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TSPFundPrices", x => x.TSPFundPriceId);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "TSPFundPrices");
        }
    }
}
