using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartTutoring.Api.Data;
using SmartTutoring.Api.Models.Entities;

namespace SmartTutoring.Api.Controllers;

public class CrearLiquidacionTutorDto
{
    [Range(1, int.MaxValue)] public int IdSesion { get; set; }
    [Range(typeof(decimal), "0.01", "1000000")] public decimal MontoNio { get; set; }
    [MaxLength(500)] public string? Observaciones { get; set; }
}

public class RegistrarPagoTutorDto
{
    [Required] public DateOnly? FechaPago { get; set; }
}

[ApiController]
[Route("api/liquidaciones-tutores")]
[Authorize(Roles = RolesUsuario.Administrador + "," + RolesUsuario.PersonalAdministrativo)]
public class LiquidacionesTutoresController : ControllerBase
{
    private readonly SmartTutoringDbContext _db;
    public LiquidacionesTutoresController(SmartTutoringDbContext db) => _db = db;

    [HttpGet]
    public async Task<ActionResult> Listar()
    {
        var items = await _db.LiquidacionesTutor.AsNoTracking()
            .OrderByDescending(x => x.FechaRegistro).ThenByDescending(x => x.IdLiquidacion)
            .Select(x => new
            {
                x.IdLiquidacion, x.IdSesion, x.MontoNio, x.Estado,
                x.FechaRegistro, x.FechaAprobacion, x.FechaPago, x.Observaciones,
                x.Sesion.IdTutor, x.Sesion.Fecha,
                nombreTutor = x.Sesion.Tutor.Nombre + " " + x.Sesion.Tutor.Apellido,
                nombreMateria = x.Sesion.Materia.NombreMateria
            }).ToListAsync();
        return Ok(items);
    }

    [HttpPost]
    public async Task<ActionResult> Crear(CrearLiquidacionTutorDto dto)
    {
        if (await _db.LiquidacionesTutor.AnyAsync(x => x.IdSesion == dto.IdSesion))
            return Conflict(new { mensaje = "Ya existe liquidación para esta sesión." });

        var sesion = await _db.SesionesTutoria.AsNoTracking()
            .FirstOrDefaultAsync(x => x.IdSesion == dto.IdSesion);
        if (sesion is null) return NotFound(new { mensaje = "Sesión no encontrada." });
        if (sesion.Estado != EstadosSesion.Completada ||
            !await _db.Asistencias.AnyAsync(x => x.IdSesion == dto.IdSesion &&
                x.EstadoAsistencia == EstadosAsistencia.Presente))
            return Conflict(new { mensaje = "La liquidación requiere una tutoría completada con asistencia presente." });

        var item = new LiquidacionTutor
        {
            IdSesion = dto.IdSesion,
            MontoNio = dto.MontoNio,
            Estado = "Pendiente",
            FechaRegistro = FechaCentro(),
            Observaciones = string.IsNullOrWhiteSpace(dto.Observaciones) ? null : dto.Observaciones.Trim()
        };
        _db.LiquidacionesTutor.Add(item);
        try
        {
            await _db.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            if (await _db.LiquidacionesTutor.AsNoTracking().AnyAsync(x => x.IdSesion == dto.IdSesion))
                return Conflict(new { mensaje = "La sesión ya fue incluida en otra liquidación." });
            throw;
        }
        return Created($"/api/liquidaciones-tutores/{item.IdLiquidacion}", new
        {
            item.IdLiquidacion, item.IdSesion, item.MontoNio, item.Estado, item.FechaRegistro
        });
    }

    [HttpPost("{id:int}/aprobar")]
    [Authorize(Roles = RolesUsuario.Administrador)]
    public async Task<ActionResult> Aprobar(int id)
    {
        var item = await _db.LiquidacionesTutor.FindAsync(id);
        if (item is null) return NotFound(new { mensaje = "Liquidación no encontrada." });
        if (item.Estado != "Pendiente")
            return Conflict(new { mensaje = "Solo pueden aprobarse liquidaciones pendientes." });

        item.Estado = "Aprobada";
        item.FechaAprobacion = FechaCentro();
        await _db.SaveChangesAsync();
        return Ok(new { item.IdLiquidacion, item.Estado, item.FechaAprobacion });
    }

    [HttpPost("{id:int}/registrar-pago")]
    [Authorize(Roles = RolesUsuario.Administrador)]
    public async Task<ActionResult> RegistrarPago(int id, RegistrarPagoTutorDto dto)
    {
        var item = await _db.LiquidacionesTutor.FindAsync(id);
        if (item is null) return NotFound(new { mensaje = "Liquidación no encontrada." });
        if (item.Estado != "Aprobada")
            return Conflict(new { mensaje = "Solo pueden marcarse como pagadas las liquidaciones aprobadas." });

        var fecha = dto.FechaPago!.Value;
        if (fecha > FechaCentro() || fecha < item.FechaAprobacion)
            return BadRequest(new { mensaje = "La fecha de pago debe ser igual o posterior a la aprobación y no puede estar en el futuro." });

        item.Estado = "Pagada";
        item.FechaPago = fecha;
        await _db.SaveChangesAsync();
        return Ok(new { item.IdLiquidacion, item.Estado, item.FechaPago });
    }

    private static DateOnly FechaCentro() => DateOnly.FromDateTime(DateTime.UtcNow.AddHours(-6));
}
