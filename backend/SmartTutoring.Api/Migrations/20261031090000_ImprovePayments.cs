using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using SmartTutoring.Api.Data;

#nullable disable

namespace SmartTutoring.Api.Migrations;

[DbContext(typeof(SmartTutoringDbContext))]
[Migration("20261031090000_ImprovePayments")]
public partial class ImprovePayments : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<int>(
            name: "IdSesion",
            table: "Pagos",
            type: "integer",
            nullable: true);

        migrationBuilder.AddColumn<string>(
            name: "MetodoPago",
            table: "Pagos",
            type: "character varying(30)",
            maxLength: 30,
            nullable: false,
            defaultValue: "Efectivo");

        migrationBuilder.AddCheckConstraint(
            name: "CK_Pagos_MetodoValido",
            table: "Pagos",
            sql: "\"MetodoPago\" IN ('Efectivo', 'Transferencia', 'Tarjeta')");

        migrationBuilder.CreateIndex(
            name: "IX_Pagos_IdSesion",
            table: "Pagos",
            column: "IdSesion",
            unique: true,
            filter: "\"IdSesion\" IS NOT NULL");

        migrationBuilder.AddForeignKey(
            name: "FK_Pagos_SesionesTutoria_IdSesion",
            table: "Pagos",
            column: "IdSesion",
            principalTable: "SesionesTutoria",
            principalColumn: "IdSesion",
            onDelete: ReferentialAction.Restrict);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropForeignKey(
            name: "FK_Pagos_SesionesTutoria_IdSesion",
            table: "Pagos");

        migrationBuilder.DropIndex(
            name: "IX_Pagos_IdSesion",
            table: "Pagos");

        migrationBuilder.DropCheckConstraint(
            name: "CK_Pagos_MetodoValido",
            table: "Pagos");

        migrationBuilder.DropColumn(
            name: "IdSesion",
            table: "Pagos");

        migrationBuilder.DropColumn(
            name: "MetodoPago",
            table: "Pagos");
    }
}
