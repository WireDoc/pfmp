using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace PFMP_API.Migrations
{
    /// <inheritdoc />
    public partial class Wave13_AddCryptoExchangeTables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ExchangeConnections",
                columns: table => new
                {
                    ExchangeConnectionId = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UserId = table.Column<int>(type: "integer", nullable: false),
                    Provider = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Nickname = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    EncryptedApiKey = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    EncryptedApiSecret = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: false),
                    Scopes = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    LastSyncAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    LastSyncError = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    DateCreated = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    DateUpdated = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ExchangeConnections", x => x.ExchangeConnectionId);
                    table.ForeignKey(
                        name: "FK_ExchangeConnections_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "CryptoHoldings",
                columns: table => new
                {
                    CryptoHoldingId = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ExchangeConnectionId = table.Column<int>(type: "integer", nullable: false),
                    Symbol = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    CoinGeckoId = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    Quantity = table.Column<decimal>(type: "numeric(28,18)", nullable: false),
                    AvgCostBasisUsd = table.Column<decimal>(type: "numeric(18,4)", nullable: true),
                    MarketValueUsd = table.Column<decimal>(type: "numeric(18,4)", nullable: false),
                    LastPriceAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    IsStaked = table.Column<bool>(type: "boolean", nullable: false),
                    StakingApyPercent = table.Column<decimal>(type: "numeric(8,4)", nullable: true),
                    DateCreated = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    DateUpdated = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CryptoHoldings", x => x.CryptoHoldingId);
                    table.ForeignKey(
                        name: "FK_CryptoHoldings_ExchangeConnections_ExchangeConnectionId",
                        column: x => x.ExchangeConnectionId,
                        principalTable: "ExchangeConnections",
                        principalColumn: "ExchangeConnectionId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "CryptoTransactions",
                columns: table => new
                {
                    CryptoTransactionId = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ExchangeConnectionId = table.Column<int>(type: "integer", nullable: false),
                    ExchangeTxId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    TransactionType = table.Column<int>(type: "integer", nullable: false),
                    Symbol = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Quantity = table.Column<decimal>(type: "numeric(28,18)", nullable: false),
                    PriceUsd = table.Column<decimal>(type: "numeric(18,4)", nullable: true),
                    FeeUsd = table.Column<decimal>(type: "numeric(18,4)", nullable: true),
                    ExecutedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    RawJson = table.Column<string>(type: "text", nullable: true),
                    DateCreated = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CryptoTransactions", x => x.CryptoTransactionId);
                    table.ForeignKey(
                        name: "FK_CryptoTransactions_ExchangeConnections_ExchangeConnectionId",
                        column: x => x.ExchangeConnectionId,
                        principalTable: "ExchangeConnections",
                        principalColumn: "ExchangeConnectionId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_CryptoHoldings_ExchangeConnectionId_Symbol_IsStaked",
                table: "CryptoHoldings",
                columns: new[] { "ExchangeConnectionId", "Symbol", "IsStaked" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_CryptoTransactions_ExchangeConnectionId_ExchangeTxId",
                table: "CryptoTransactions",
                columns: new[] { "ExchangeConnectionId", "ExchangeTxId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_CryptoTransactions_ExecutedAt",
                table: "CryptoTransactions",
                column: "ExecutedAt");

            migrationBuilder.CreateIndex(
                name: "IX_ExchangeConnections_UserId_Provider_Nickname",
                table: "ExchangeConnections",
                columns: new[] { "UserId", "Provider", "Nickname" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CryptoHoldings");

            migrationBuilder.DropTable(
                name: "CryptoTransactions");

            migrationBuilder.DropTable(
                name: "ExchangeConnections");
        }
    }
}
