using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace SmartTutoring.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddSesionesTutoria : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "SesionesTutoria",
                columns: table => new
                {
                    IdSesion = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    IdEstudiante = table.Column<int>(type: "integer", nullable: false),
                    IdTutor = table.Column<int>(type: "integer", nullable: false),
                    IdMateria = table.Column<int>(type: "integer", nullable: false),
                    Fecha = table.Column<DateOnly>(type: "date", nullable: false),
                    HoraInicio = table.Column<TimeOnly>(type: "time without time zone", nullable: false),
                    HoraFin = table.Column<TimeOnly>(type: "time without time zone", nullable: false),
                    Estado = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SesionesTutoria", x => x.IdSesion);
                    table.CheckConstraint("CK_SesionesTutoria_EstadoValido", "\"Estado\" IN ('Programada', 'Completada', 'Cancelada')");
                    table.CheckConstraint("CK_SesionesTutoria_HorarioValido", "\"HoraFin\" > \"HoraInicio\"");
                    table.ForeignKey(
                        name: "FK_SesionesTutoria_Estudiantes_IdEstudiante",
                        column: x => x.IdEstudiante,
                        principalTable: "Estudiantes",
                        principalColumn: "IdEstudiante",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_SesionesTutoria_Materias_IdMateria",
                        column: x => x.IdMateria,
                        principalTable: "Materias",
                        principalColumn: "IdMateria",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_SesionesTutoria_Tutores_IdTutor",
                        column: x => x.IdTutor,
                        principalTable: "Tutores",
                        principalColumn: "IdTutor",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_SesionesTutoria_IdEstudiante",
                table: "SesionesTutoria",
                column: "IdEstudiante");

            migrationBuilder.CreateIndex(
                name: "IX_SesionesTutoria_IdMateria",
                table: "SesionesTutoria",
                column: "IdMateria");

            migrationBuilder.CreateIndex(
                name: "IX_SesionesTutoria_IdTutor_Fecha",
                table: "SesionesTutoria",
                columns: new[] { "IdTutor", "Fecha" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "SesionesTutoria");
        }
    }
}
