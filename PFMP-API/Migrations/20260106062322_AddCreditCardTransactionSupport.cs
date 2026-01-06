using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PFMP_API.Migrations
{
    /// <inheritdoc />
    public partial class AddCreditCardTransactionSupport : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<Guid>(
                name: "CashAccountId",
                table: "CashTransactions",
                type: "uuid",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uuid");

            migrationBuilder.AddColumn<int>(
                name: "LiabilityAccountId",
                table: "CashTransactions",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_CashTransactions_LiabilityAccountId",
                table: "CashTransactions",
                column: "LiabilityAccountId");

            migrationBuilder.AddForeignKey(
                name: "FK_CashTransactions_FinancialProfileLiabilities_LiabilityAccou~",
                table: "CashTransactions",
                column: "LiabilityAccountId",
                principalTable: "FinancialProfileLiabilities",
                principalColumn: "LiabilityAccountId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_CashTransactions_FinancialProfileLiabilities_LiabilityAccou~",
                table: "CashTransactions");

            migrationBuilder.DropIndex(
                name: "IX_CashTransactions_LiabilityAccountId",
                table: "CashTransactions");

            migrationBuilder.DropColumn(
                name: "LiabilityAccountId",
                table: "CashTransactions");

            migrationBuilder.AlterColumn<Guid>(
                name: "CashAccountId",
                table: "CashTransactions",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);
        }
    }
}
