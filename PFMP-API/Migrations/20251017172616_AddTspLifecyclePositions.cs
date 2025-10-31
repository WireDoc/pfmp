using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace PFMP_API.Migrations
{
    /// <inheritdoc />
    public partial class AddTspLifecyclePositions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "TspLifecyclePositions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UserId = table.Column<int>(type: "integer", nullable: false),
                    FundCode = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    AllocationPercent = table.Column<decimal>(type: "numeric(8,4)", nullable: false),
                    Units = table.Column<decimal>(type: "numeric(18,6)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TspLifecyclePositions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TspLifecyclePositions_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_TspLifecyclePositions_UserId_FundCode",
                table: "TspLifecyclePositions",
                columns: new[] { "UserId", "FundCode" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "TspLifecyclePositions");
        }
    }
}
