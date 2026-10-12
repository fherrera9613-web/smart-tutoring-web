using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace SmartTutoring.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddAsistenciaSeguimiento : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Asistencias",
                columns: table => new
                {
                    IdAsistencia = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    IdSesion = table.Column<int>(type: "integer", nullable: false),
                    EstadoAsistencia = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Observaciones = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Asistencias", x => x.IdAsistencia);
                    table.CheckConstraint("CK_Asistencias_EstadoValido", "\"EstadoAsistencia\" IN ('Presente', 'Ausente')");
                    table.ForeignKey(
                        name: "FK_Asistencias_SesionesTutoria_IdSesion",
                        column: x => x.IdSesion,
                        principalTable: "SesionesTutoria",
                        principalColumn: "IdSesion",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "SeguimientosAcademicos",
                columns: table => new
                {
                    IdSeguimiento = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    IdSesion = table.Column<int>(type: "integer", nullable: false),
                    TemaTrabajado = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Observaciones = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SeguimientosAcademicos", x => x.IdSeguimiento);
                    table.ForeignKey(
                        name: "FK_SeguimientosAcademicos_SesionesTutoria_IdSesion",
                        column: x => x.IdSesion,
                        principalTable: "SesionesTutoria",
                        principalColumn: "IdSesion",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Asistencias_IdSesion",
                table: "Asistencias",
                column: "IdSesion",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_SeguimientosAcademicos_IdSesion",
                table: "SeguimientosAcademicos",
                column: "IdSesion",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Asistencias");

            migrationBuilder.DropTable(
                name: "SeguimientosAcademicos");
        }
    }
}
