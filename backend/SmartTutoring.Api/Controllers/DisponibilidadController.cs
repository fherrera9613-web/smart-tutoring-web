using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartTutoring.Api.Data;
using SmartTutoring.Api.Models.DTOs;
using SmartTutoring.Api.Models.Entities;

namespace SmartTutoring.Api.Controllers;

[ApiController]
[Route("api/tutores/{idTutor:int}/disponibilidad")]
[Authorize(Roles = RolesUsuario.Administrador + "," + RolesUsuario.PersonalAdministrativo)]
public class DisponibilidadController : ControllerBase
{
    private readonly SmartTutoringDbContext _context;

    public DisponibilidadController(SmartTutoringDbContext context) => _context = context;

    [HttpGet]
    public async Task<ActionResult> Consultar(int idTutor, [FromQuery] DateOnly? fecha = null)
    {
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

    [HttpPut("horarios")]
    public async Task<IActionResult> GuardarHorarios(int idTutor, ActualizarHorariosTutorDto dto)
    {
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

        // No permitir que una configuración deje fuera una sesión futura ya confirmada.
        if (ordenados.Count > 0)
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
        var bloqueo = await _context.BloqueosTutor.FirstOrDefaultAsync(b =>
            b.IdTutor == idTutor && b.IdBloqueo == idBloqueo);
        if (bloqueo is null) return NotFound(new { mensaje = "Bloqueo no encontrado." });
        _context.BloqueosTutor.Remove(bloqueo);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    private static bool EsIntervaloValido(TimeOnly inicio, TimeOnly fin) =>
        fin > inicio && (fin.ToTimeSpan() - inicio.ToTimeSpan()).TotalMinutes >= 15 &&
        inicio.Minute % 15 == 0 && fin.Minute % 15 == 0 &&
        inicio.Second == 0 && fin.Second == 0;
}
