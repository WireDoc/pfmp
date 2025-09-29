using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PFMP_API.Migrations
{
    /// <inheritdoc />
    public partial class AddUserProfileFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "AnnualIncome",
                table: "Users",
                type: "numeric(18,2)",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "BypassAuthentication",
                table: "Users",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "DateOfBirth",
                table: "Users",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "EmploymentType",
                table: "Users",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsTestAccount",
                table: "Users",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "PayGrade",
                table: "Users",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ProfileCompletedAt",
                table: "Users",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "ProfileSetupComplete",
                table: "Users",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "RetirementSystem",
                table: "Users",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ServiceComputationDate",
                table: "Users",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "SetupProgressPercentage",
                table: "Users",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "SetupStepsCompleted",
                table: "Users",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "DismissedAt",
                table: "Alerts",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "GeneratedTaskId",
                table: "Alerts",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsDismissed",
                table: "Alerts",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "TaskGenerated",
                table: "Alerts",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateIndex(
                name: "IX_Alerts_GeneratedTaskId",
                table: "Alerts",
                column: "GeneratedTaskId");

            migrationBuilder.AddForeignKey(
                name: "FK_Alerts_Tasks_GeneratedTaskId",
                table: "Alerts",
                column: "GeneratedTaskId",
                principalTable: "Tasks",
                principalColumn: "TaskId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Alerts_Tasks_GeneratedTaskId",
                table: "Alerts");

            migrationBuilder.DropIndex(
                name: "IX_Alerts_GeneratedTaskId",
                table: "Alerts");

            migrationBuilder.DropColumn(
                name: "AnnualIncome",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "BypassAuthentication",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "DateOfBirth",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "EmploymentType",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "IsTestAccount",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "PayGrade",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "ProfileCompletedAt",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "ProfileSetupComplete",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "RetirementSystem",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "ServiceComputationDate",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "SetupProgressPercentage",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "SetupStepsCompleted",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "DismissedAt",
                table: "Alerts");

            migrationBuilder.DropColumn(
                name: "GeneratedTaskId",
                table: "Alerts");

            migrationBuilder.DropColumn(
                name: "IsDismissed",
                table: "Alerts");

            migrationBuilder.DropColumn(
                name: "TaskGenerated",
                table: "Alerts");
        }
    }
}
