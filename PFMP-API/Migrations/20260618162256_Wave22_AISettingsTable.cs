using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace PFMP_API.Migrations
{
    /// <inheritdoc />
    public partial class Wave22_AISettingsTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AISettings",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Slot = table.Column<int>(type: "integer", nullable: false),
                    Model = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    MaxTokens = table.Column<int>(type: "integer", nullable: true),
                    Temperature = table.Column<decimal>(type: "numeric(4,3)", nullable: true),
                    TopP = table.Column<decimal>(type: "numeric(4,3)", nullable: true),
                    ReasoningEffort = table.Column<int>(type: "integer", nullable: true),
                    ReasoningExclude = table.Column<bool>(type: "boolean", nullable: true),
                    ReasoningMaxTokens = table.Column<int>(type: "integer", nullable: true),
                    FusionPreset = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    FusionJudgeModel = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    FusionMaxToolCalls = table.Column<int>(type: "integer", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AISettings", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AISettings_Slot",
                table: "AISettings",
                column: "Slot",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AISettings");
        }
    }
}
