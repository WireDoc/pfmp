using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PFMP_API.Migrations
{
    /// <inheritdoc />
    public partial class Wave14_IncomeStreamCashFlowBasis : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Default to 1 = IncomeStreamCashFlowBasis.Net so existing rows match
            // the model default. Using gross without modeling payroll deductions
            // (federal/state tax, FICA, TSP, FEHB) would overstate net cash flow.
            migrationBuilder.AddColumn<int>(
                name: "CashFlowBasis",
                table: "IncomeStreams",
                type: "integer",
                nullable: false,
                defaultValue: 1);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CashFlowBasis",
                table: "IncomeStreams");
        }
    }
}
