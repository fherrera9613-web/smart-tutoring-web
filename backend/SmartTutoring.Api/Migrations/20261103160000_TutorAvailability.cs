using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using SmartTutoring.Api.Data;

#nullable disable

namespace SmartTutoring.Api.Migrations;

[DbContext(typeof(SmartTutoringDbContext))]
[Migration("20261103160000_TutorAvailability")]
public partial class TutorAvailability : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "BloqueosTutor",
            columns: table => new
            {
                IdBloqueo = table.Column<int>(type: "integer", nullable: false)
                    .Annotation("Npgsql:ValueGenerationStrategy", Npgsql.EntityFrameworkCore.PostgreSQL.Metadata.NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                IdTutor = table.Column<int>(type: "integer", nullable: false),
                Fecha = table.Column<DateOnly>(type: "date", nullable: false),
                HoraInicio = table.Column<TimeOnly>(type: "time without time zone", nullable: false),
                HoraFin = table.Column<TimeOnly>(type: "time without time zone", nullable: false),
                Motivo = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: true)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_BloqueosTutor", x => x.IdBloqueo);
                table.CheckConstraint("CK_BloqueosTutor_Horas", "\"HoraFin\" > \"HoraInicio\"");
                table.ForeignKey("FK_BloqueosTutor_Tutores_IdTutor", x => x.IdTutor,
                    "Tutores", "IdTutor", onDelete: ReferentialAction.Cascade);
            });
        migrationBuilder.CreateIndex(name: "IX_BloqueosTutor_IdTutor_Fecha",
            table: "BloqueosTutor", columns: new[] { "IdTutor", "Fecha" });

        migrationBuilder.CreateTable(
            name: "HorariosTutor",
            columns: table => new
            {
                IdHorario = table.Column<int>(type: "integer", nullable: false)
                    .Annotation("Npgsql:ValueGenerationStrategy", Npgsql.EntityFrameworkCore.PostgreSQL.Metadata.NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                IdTutor = table.Column<int>(type: "integer", nullable: false),
                DiaSemana = table.Column<int>(type: "integer", nullable: false),
                HoraInicio = table.Column<TimeOnly>(type: "time without time zone", nullable: false),
                HoraFin = table.Column<TimeOnly>(type: "time without time zone", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_HorariosTutor", x => x.IdHorario);
                table.CheckConstraint("CK_HorariosTutor_Dia", "\"DiaSemana\" BETWEEN 0 AND 6");
                table.CheckConstraint("CK_HorariosTutor_Horas", "\"HoraFin\" > \"HoraInicio\"");
                table.ForeignKey("FK_HorariosTutor_Tutores_IdTutor", x => x.IdTutor,
                    "Tutores", "IdTutor", onDelete: ReferentialAction.Cascade);
            });
        migrationBuilder.CreateIndex(name: "IX_HorariosTutor_IdTutor_DiaSemana",
            table: "HorariosTutor", columns: new[] { "IdTutor", "DiaSemana" });
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(name: "BloqueosTutor");
        migrationBuilder.DropTable(name: "HorariosTutor");
    }
}
