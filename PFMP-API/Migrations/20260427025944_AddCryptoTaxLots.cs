using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace PFMP_API.Migrations
{
    /// <inheritdoc />
    public partial class AddCryptoTaxLots : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "CryptoTaxLots",
                columns: table => new
                {
                    CryptoTaxLotId = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ExchangeConnectionId = table.Column<int>(type: "integer", nullable: false),
                    SourceTransactionId = table.Column<int>(type: "integer", nullable: false),
                    Symbol = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    AcquiredAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    OriginalQuantity = table.Column<decimal>(type: "numeric(28,18)", nullable: false),
                    RemainingQuantity = table.Column<decimal>(type: "numeric(28,18)", nullable: false),
                    CostBasisUsdPerUnit = table.Column<decimal>(type: "numeric(18,8)", nullable: false),
                    RealizedProceedsUsd = table.Column<decimal>(type: "numeric(18,4)", nullable: false),
                    RealizedCostBasisUsd = table.Column<decimal>(type: "numeric(18,4)", nullable: false),
                    RealizedShortTermGainUsd = table.Column<decimal>(type: "numeric(18,4)", nullable: false),
                    RealizedLongTermGainUsd = table.Column<decimal>(type: "numeric(18,4)", nullable: false),
                    IsClosed = table.Column<bool>(type: "boolean", nullable: false),
                    ClosedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsRewardLot = table.Column<bool>(type: "boolean", nullable: false),
                    DateCreated = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    DateUpdated = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CryptoTaxLots", x => x.CryptoTaxLotId);
                    table.ForeignKey(
                        name: "FK_CryptoTaxLots_CryptoTransactions_SourceTransactionId",
                        column: x => x.SourceTransactionId,
                        principalTable: "CryptoTransactions",
                        principalColumn: "CryptoTransactionId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_CryptoTaxLots_ExchangeConnections_ExchangeConnectionId",
                        column: x => x.ExchangeConnectionId,
                        principalTable: "ExchangeConnections",
                        principalColumn: "ExchangeConnectionId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_CryptoTaxLots_ExchangeConnectionId_Symbol_AcquiredAt",
                table: "CryptoTaxLots",
                columns: new[] { "ExchangeConnectionId", "Symbol", "AcquiredAt" });

            migrationBuilder.CreateIndex(
                name: "IX_CryptoTaxLots_SourceTransactionId",
                table: "CryptoTaxLots",
                column: "SourceTransactionId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CryptoTaxLots");
        }
    }
}
