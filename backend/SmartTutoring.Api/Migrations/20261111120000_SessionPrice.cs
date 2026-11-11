using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using SmartTutoring.Api.Data;

#nullable disable

namespace SmartTutoring.Api.Migrations;

[DbContext(typeof(SmartTutoringDbContext))]
[Migration("20261111120000_SessionPrice")]
public partial class SessionPrice : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<decimal>(
            name: "TarifaUsdPorSesion",
            table: "SesionesTutoria",
            type: "numeric(10,2)",
            nullable: true);
        migrationBuilder.AddCheckConstraint(
            name: "CK_SesionesTutoria_TarifaUsdPorSesion",
            table: "SesionesTutoria",
            sql: "\"TarifaUsdPorSesion\" IS NULL OR \"TarifaUsdPorSesion\" BETWEEN 0.01 AND 10000");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropCheckConstraint(name: "CK_SesionesTutoria_TarifaUsdPorSesion", table: "SesionesTutoria");
        migrationBuilder.DropColumn(name: "TarifaUsdPorSesion", table: "SesionesTutoria");
    }
}
