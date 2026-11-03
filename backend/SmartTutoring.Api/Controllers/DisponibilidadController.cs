using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartTutoring.Api.Data;
using SmartTutoring.Api.Models.DTOs;
using SmartTutoring.Api.Models.Entities;

namespace SmartTutoring.Api.Controllers;

[ApiController]
[Route("api/tutores/{idTutor:int}/disponibilidad")]
[Authorize(Roles = RolesUsuario.Administrador + "," + RolesUsuario.PersonalAdministrativo + "," + RolesUsuario.Tutor)]
public class DisponibilidadController : ControllerBase
{
    private readonly SmartTutoringDbContext _context;

    public DisponibilidadController(SmartTutoringDbContext context) => _context = context;

    [HttpGet]
    public async Task<ActionResult> Consultar(int idTutor, [FromQuery] DateOnly? fecha = null)
    {
        if (!await PuedeGestionarAsync(idTutor)) return Forbid();
        if (!await _context.Tutores.AnyAsync(t => t.IdTutor == idTutor))
            return NotFound(new { mensaje = "Tutor no encontrado." });

        var horarios = await _context.HorariosTutor.AsNoTracking()
            .Where(h => h.IdTutor == idTutor)
            .OrderBy(h => h.DiaSemana).ThenBy(h => h.HoraInicio)
            .Select(h => new { h.IdHorario, h.DiaSemana, h.HoraInicio, h.HoraFin })
            .ToListAsync();

        var query = _context.BloqueosTutor.AsNoTracking().Where(b => b.IdTutor == idTutor);
        if (fecha.HasValue) query = query.Where(b => b.Fecha == fecha.Value);
        else query = query.Where(b => b.Fecha >= DateOnly.FromDateTime(DateTime.UtcNow.AddHours(-6)));

        var bloqueos = await query.OrderBy(b => b.Fecha).ThenBy(b => b.HoraInicio)
            .Select(b => new { b.IdBloqueo, b.Fecha, b.HoraInicio, b.HoraFin, b.Motivo })
            .ToListAsync();

        return Ok(new { configurado = horarios.Count > 0, horarios, bloqueos });
    }

    [HttpGet("libres")]
    public async Task<ActionResult> ConsultarEspaciosLibres(int idTutor, [FromQuery] DateOnly fecha)
    {
        if (!await PuedeGestionarAsync(idTutor)) return Forbid();
        if (!await _context.Tutores.AnyAsync(t => t.IdTutor == idTutor))
            return NotFound(new { mensaje = "Tutor no encontrado." });

        var horas = await _context.HorariosTutor.AsNoTracking()
            .Where(h => h.IdTutor == idTutor && h.DiaSemana == (int)fecha.DayOfWeek)
            .OrderBy(h => h.HoraInicio).Select(h => new { inicio = h.HoraInicio, fin = h.HoraFin })
            .ToListAsync();
        var configurado = await _context.HorariosTutor.AnyAsync(h => h.IdTutor == idTutor);

        var hoy = DateOnly.FromDateTime(DateTime.UtcNow.AddHours(-6));
        if (fecha < hoy)
            return Ok(new { configurado, intervalos = Array.Empty<object>() });

        var sesiones = await _context.SesionesTutoria.AsNoTracking()
            .Where(s => s.IdTutor == idTutor && s.Fecha == fecha && s.Estado != EstadosSesion.Cancelada)
            .Select(s => new { inicio = s.HoraInicio, fin = s.HoraFin })
            .ToListAsync();
        var bloqueos = await _context.BloqueosTutor.AsNoTracking()
            .Where(b => b.IdTutor == idTutor && b.Fecha == fecha)
            .Select(b => new { inicio = b.HoraInicio, fin = b.HoraFin }).ToListAsync();

        var ocupados = sesiones.Concat(bloqueos)
            .OrderBy(i => i.inicio).ThenBy(i => i.fin).ToList();
        var libres = new List<object>();
        var ahora = DateTime.UtcNow.AddHours(-6);
        var primerMinutoDisponible = fecha == hoy
            ? ((ahora.Hour * 60 + ahora.Minute) / 15 + 1) * 15
            : 0;
        if (primerMinutoDisponible >= 1440)
            return Ok(new { configurado, intervalos = Array.Empty<object>() });
        var horaMinima = new TimeOnly(primerMinutoDisponible / 60, primerMinutoDisponible % 60);

        foreach (var franja in horas)
        {
            var cursor = franja.inicio > horaMinima ? franja.inicio : horaMinima;
            foreach (var ocupado in ocupados)
            {
                if (ocupado.fin <= cursor || ocupado.inicio >= franja.fin) continue;
                if (ocupado.inicio > cursor)
                    libres.Add(new { horaInicio = cursor, horaFin = ocupado.inicio });
                if (ocupado.fin > cursor) cursor = ocupado.fin;
                if (cursor >= franja.fin) break;
            }
            if (cursor < franja.fin)
                libres.Add(new { horaInicio = cursor, horaFin = franja.fin });
        }

        return Ok(new { configurado, intervalos = libres });
    }

    [HttpPut("horarios")]
    public async Task<IActionResult> GuardarHorarios(int idTutor, ActualizarHorariosTutorDto dto)
    {
        if (!await PuedeGestionarAsync(idTutor)) return Forbid();
        if (!await _context.Tutores.AnyAsync(t => t.IdTutor == idTutor))
            return NotFound(new { mensaje = "Tutor no encontrado." });
        if (dto.Horarios.Count > 28)
            return BadRequest(new { mensaje = "No se permiten más de 28 intervalos semanales." });

        var ordenados = dto.Horarios.OrderBy(h => h.DiaSemana).ThenBy(h => h.HoraInicio).ToList();
        foreach (var horario in ordenados)
        {
            if (horario.DiaSemana is < 0 or > 6 || !EsIntervaloValido(horario.HoraInicio, horario.HoraFin))
                return BadRequest(new { mensaje = "Los intervalos deben ser válidos, de al menos 15 minutos y en cuartos de hora." });
        }

        foreach (var grupo in ordenados.GroupBy(h => h.DiaSemana))
        {
            var anterior = (TimeOnly?)null;
            foreach (var horario in grupo)
            {
                if (anterior.HasValue && horario.HoraInicio < anterior.Value)
                    return Conflict(new { mensaje = "Los intervalos semanales del tutor se superponen." });
                anterior = horario.HoraFin;
            }
        }

        // La jornada no puede vaciarse ni reducirse si deja reservas futuras fuera de horario.
        {
            var hoy = DateOnly.FromDateTime(DateTime.UtcNow.AddHours(-6));
            var proximas = await _context.SesionesTutoria.AsNoTracking()
                .Where(s => s.IdTutor == idTutor && s.Fecha >= hoy && s.Estado != EstadosSesion.Cancelada)
                .Select(s => new { s.Fecha, s.HoraInicio, s.HoraFin }).ToListAsync();
            foreach (var sesion in proximas)
            {
                if (!ordenados.Any(h => h.DiaSemana == (int)sesion.Fecha.DayOfWeek &&
                    h.HoraInicio <= sesion.HoraInicio && h.HoraFin >= sesion.HoraFin))
                    return Conflict(new { mensaje = "Existen sesiones programadas fuera de la nueva jornada. Reprográmelas primero." });
            }
        }

        var anteriores = await _context.HorariosTutor.Where(h => h.IdTutor == idTutor).ToListAsync();
        _context.HorariosTutor.RemoveRange(anteriores);
        _context.HorariosTutor.AddRange(ordenados.Select(h => new HorarioTutor
        {
            IdTutor = idTutor, DiaSemana = h.DiaSemana, HoraInicio = h.HoraInicio, HoraFin = h.HoraFin
        }));
        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("bloqueos")]
    public async Task<ActionResult> CrearBloqueo(int idTutor, CrearBloqueoTutorDto dto)
    {
        if (!await PuedeGestionarAsync(idTutor)) return Forbid();
        if (!await _context.Tutores.AnyAsync(t => t.IdTutor == idTutor))
            return NotFound(new { mensaje = "Tutor no encontrado." });

        var fecha = dto.Fecha!.Value;
        var inicio = dto.HoraInicio!.Value;
        var fin = dto.HoraFin!.Value;
        if (!EsIntervaloValido(inicio, fin) || fecha < DateOnly.FromDateTime(DateTime.UtcNow.AddHours(-6)))
            return BadRequest(new { mensaje = "Indique un bloqueo futuro con horas válidas en intervalos de 15 minutos." });

        if (await _context.SesionesTutoria.AnyAsync(s => s.IdTutor == idTutor && s.Fecha == fecha &&
            s.Estado != EstadosSesion.Cancelada && inicio < s.HoraFin && fin > s.HoraInicio))
            return Conflict(new { mensaje = "Hay sesiones ocupando ese horario. Reprográmelas antes de bloquearlo." });

        var bloqueo = new BloqueoTutor
        {
            IdTutor = idTutor, Fecha = fecha, HoraInicio = inicio, HoraFin = fin,
            Motivo = string.IsNullOrWhiteSpace(dto.Motivo) ? null : dto.Motivo.Trim()
        };
        _context.BloqueosTutor.Add(bloqueo);
        await _context.SaveChangesAsync();
        return Created($"/api/tutores/{idTutor}/disponibilidad", new
        {
            bloqueo.IdBloqueo, bloqueo.Fecha, bloqueo.HoraInicio, bloqueo.HoraFin, bloqueo.Motivo
        });
    }

    [HttpDelete("bloqueos/{idBloqueo:int}")]
    public async Task<IActionResult> EliminarBloqueo(int idTutor, int idBloqueo)
    {
        if (!await PuedeGestionarAsync(idTutor)) return Forbid();
        var bloqueo = await _context.BloqueosTutor.FirstOrDefaultAsync(b =>
            b.IdTutor == idTutor && b.IdBloqueo == idBloqueo);
        if (bloqueo is null) return NotFound(new { mensaje = "Bloqueo no encontrado." });
        _context.BloqueosTutor.Remove(bloqueo);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    // El identificador en la ruta nunca concede permisos: se compara con el usuario autenticado.
    private async Task<bool> PuedeGestionarAsync(int idTutor)
    {
        if (User.IsInRole(RolesUsuario.Administrador) ||
            User.IsInRole(RolesUsuario.PersonalAdministrativo))
            return true;

        if (!User.IsInRole(RolesUsuario.Tutor)) return false;
        var rawId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!int.TryParse(rawId, out var idUsuario)) return false;
        return await _context.Tutores.AsNoTracking()
            .AnyAsync(t => t.IdTutor == idTutor && t.IdUsuario == idUsuario && t.Usuario.Activo);
    }

    private static bool EsIntervaloValido(TimeOnly inicio, TimeOnly fin) =>
        fin > inicio && (fin.ToTimeSpan() - inicio.ToTimeSpan()).TotalMinutes >= 15 &&
        inicio.Minute % 15 == 0 && fin.Minute % 15 == 0 &&
        inicio.Second == 0 && fin.Second == 0;
}
