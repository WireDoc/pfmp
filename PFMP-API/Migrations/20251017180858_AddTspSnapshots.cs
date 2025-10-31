using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace PFMP_API.Migrations
{
    /// <inheritdoc />
    public partial class AddTspSnapshots : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "TspPositionSnapshots",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UserId = table.Column<int>(type: "integer", nullable: false),
                    FundCode = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    Price = table.Column<decimal>(type: "numeric(18,6)", nullable: false),
                    Units = table.Column<decimal>(type: "numeric(18,6)", nullable: false),
                    MarketValue = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    MixPercent = table.Column<decimal>(type: "numeric(8,4)", nullable: false),
                    AllocationPercent = table.Column<decimal>(type: "numeric(8,4)", nullable: true),
                    AsOfUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TspPositionSnapshots", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TspPositionSnapshots_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_TspPositionSnapshots_UserId_AsOfUtc",
                table: "TspPositionSnapshots",
                columns: new[] { "UserId", "AsOfUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_TspPositionSnapshots_UserId_FundCode_AsOfUtc",
                table: "TspPositionSnapshots",
                columns: new[] { "UserId", "FundCode", "AsOfUtc" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "TspPositionSnapshots");
        }
    }
}
