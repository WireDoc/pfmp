using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PFMP_API.Migrations
{
    /// <inheritdoc />
    public partial class RenameAllocationToContribution_AddDateUpdated : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "AllocationPercent",
                table: "TspLifecyclePositions",
                newName: "ContributionPercent");

            migrationBuilder.AddColumn<DateTime>(
                name: "DateUpdated",
                table: "TspLifecyclePositions",
                type: "timestamp with time zone",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DateUpdated",
                table: "TspLifecyclePositions");

            migrationBuilder.RenameColumn(
                name: "ContributionPercent",
                table: "TspLifecyclePositions",
                newName: "AllocationPercent");
        }
    }
}
