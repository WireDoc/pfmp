using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace PFMP_API.Migrations
{
    /// <inheritdoc />
    public partial class AddPriceHistoryTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "PriceHistory",
                columns: table => new
                {
                    PriceHistoryId = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    HoldingId = table.Column<int>(type: "integer", nullable: true),
                    Symbol = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Date = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Open = table.Column<decimal>(type: "numeric(18,8)", nullable: false),
                    High = table.Column<decimal>(type: "numeric(18,8)", nullable: false),
                    Low = table.Column<decimal>(type: "numeric(18,8)", nullable: false),
                    Close = table.Column<decimal>(type: "numeric(18,8)", nullable: false),
                    Volume = table.Column<long>(type: "bigint", nullable: false),
                    AdjustedClose = table.Column<decimal>(type: "numeric(18,8)", nullable: true),
                    Change = table.Column<decimal>(type: "numeric(18,8)", nullable: true),
                    ChangePercent = table.Column<decimal>(type: "numeric(10,4)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PriceHistory", x => x.PriceHistoryId);
                    table.ForeignKey(
                        name: "FK_PriceHistory_Holdings_HoldingId",
                        column: x => x.HoldingId,
                        principalTable: "Holdings",
                        principalColumn: "HoldingId");
                });

            migrationBuilder.CreateIndex(
                name: "IX_PriceHistory_HoldingId",
                table: "PriceHistory",
                column: "HoldingId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PriceHistory");
        }
    }
}
