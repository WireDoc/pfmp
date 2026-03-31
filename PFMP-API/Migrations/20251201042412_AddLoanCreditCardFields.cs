using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PFMP_API.Migrations
{
    /// <inheritdoc />
    public partial class AddLoanCreditCardFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "CreditLimit",
                table: "FinancialProfileLiabilities",
                type: "numeric(18,2)",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "LoanStartDate",
                table: "FinancialProfileLiabilities",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "LoanTermMonths",
                table: "FinancialProfileLiabilities",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "OriginalLoanAmount",
                table: "FinancialProfileLiabilities",
                type: "numeric(18,2)",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "PaymentDueDate",
                table: "FinancialProfileLiabilities",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "StatementBalance",
                table: "FinancialProfileLiabilities",
                type: "numeric(18,2)",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "StatementDate",
                table: "FinancialProfileLiabilities",
                type: "timestamp with time zone",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CreditLimit",
                table: "FinancialProfileLiabilities");

            migrationBuilder.DropColumn(
                name: "LoanStartDate",
                table: "FinancialProfileLiabilities");

            migrationBuilder.DropColumn(
                name: "LoanTermMonths",
                table: "FinancialProfileLiabilities");

            migrationBuilder.DropColumn(
                name: "OriginalLoanAmount",
                table: "FinancialProfileLiabilities");

            migrationBuilder.DropColumn(
                name: "PaymentDueDate",
                table: "FinancialProfileLiabilities");

            migrationBuilder.DropColumn(
                name: "StatementBalance",
                table: "FinancialProfileLiabilities");

            migrationBuilder.DropColumn(
                name: "StatementDate",
                table: "FinancialProfileLiabilities");
        }
    }
}
