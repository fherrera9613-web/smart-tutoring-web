using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using SmartTutoring.Api.Data;

#nullable disable

namespace SmartTutoring.Api.Migrations;

[DbContext(typeof(SmartTutoringDbContext))]
[Migration("20261111130000_TutorSettlements")]
public partial class TutorSettlements : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "LiquidacionesTutor",
            columns: table => new
            {
                IdLiquidacion = table.Column<int>(type: "integer", nullable: false)
                    .Annotation("Npgsql:ValueGenerationStrategy", Npgsql.EntityFrameworkCore.PostgreSQL.Metadata.NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                IdSesion = table.Column<int>(type: "integer", nullable: false),
                MontoNio = table.Column<decimal>(type: "numeric(12,2)", nullable: false),
                Estado = table.Column<string>(type: "character varying(25)", maxLength: 25, nullable: false),
                FechaRegistro = table.Column<DateOnly>(type: "date", nullable: false),
                FechaAprobacion = table.Column<DateOnly>(type: "date", nullable: true),
                FechaPago = table.Column<DateOnly>(type: "date", nullable: true),
                Observaciones = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_LiquidacionesTutor", x => x.IdLiquidacion);
                table.CheckConstraint("CK_LiquidacionesTutor_Monto", "\"MontoNio\" > 0");
                table.CheckConstraint("CK_LiquidacionesTutor_Estado", "\"Estado\" IN ('Pendiente','Aprobada','Pagada')");
                table.ForeignKey(
                    name: "FK_LiquidacionesTutor_SesionesTutoria_IdSesion",
                    column: x => x.IdSesion,
                    principalTable: "SesionesTutoria",
                    principalColumn: "IdSesion",
                    onDelete: ReferentialAction.Restrict);
            });
        migrationBuilder.CreateIndex(
            name: "IX_LiquidacionesTutor_IdSesion",
            table: "LiquidacionesTutor",
            column: "IdSesion",
            unique: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(name: "LiquidacionesTutor");
    }
}
