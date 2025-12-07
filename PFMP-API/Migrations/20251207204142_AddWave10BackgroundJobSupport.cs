using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace PFMP_API.Migrations
{
    /// <inheritdoc />
    public partial class AddWave10BackgroundJobSupport : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsBackgroundRefreshEnabled",
                table: "Accounts",
                type: "boolean",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<string>(
                name: "LifecycleState",
                table: "Accounts",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "Active");

            migrationBuilder.CreateTable(
                name: "NetWorthSnapshots",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UserId = table.Column<int>(type: "integer", nullable: false),
                    SnapshotDate = table.Column<DateOnly>(type: "date", nullable: false),
                    TotalNetWorth = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    InvestmentsTotal = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    CashTotal = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    RealEstateEquity = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    RetirementTotal = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    LiabilitiesTotal = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NetWorthSnapshots", x => x.Id);
                    table.ForeignKey(
                        name: "FK_NetWorthSnapshots_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_NetWorthSnapshots_SnapshotDate",
                table: "NetWorthSnapshots",
                column: "SnapshotDate");

            migrationBuilder.CreateIndex(
                name: "IX_NetWorthSnapshots_UserId_SnapshotDate",
                table: "NetWorthSnapshots",
                columns: new[] { "UserId", "SnapshotDate" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "NetWorthSnapshots");

            migrationBuilder.DropColumn(
                name: "IsBackgroundRefreshEnabled",
                table: "Accounts");

            migrationBuilder.DropColumn(
                name: "LifecycleState",
                table: "Accounts");
        }
    }
}
