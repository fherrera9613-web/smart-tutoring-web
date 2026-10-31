using System.IdentityModel.Tokens.Jwt;
using System.Linq.Expressions;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartTutoring.Api.Data;
using SmartTutoring.Api.Models.DTOs;
using SmartTutoring.Api.Models.Entities;

namespace SmartTutoring.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class SesionesController : ControllerBase
{
    private readonly SmartTutoringDbContext _context;

    private static readonly Expression<Func<SesionTutoria, SesionDto>> ProyeccionSesion = s => new SesionDto
    {
        IdSesion = s.IdSesion,
        IdEstudiante = s.IdEstudiante,
        NombreEstudiante = s.Estudiante.Nombre + " " + s.Estudiante.Apellido,
        IdTutor = s.IdTutor,
        NombreTutor = s.Tutor.Nombre + " " + s.Tutor.Apellido,
        IdMateria = s.IdMateria,
        NombreMateria = s.Materia.NombreMateria,
        Fecha = s.Fecha,
        HoraInicio = s.HoraInicio,
        HoraFin = s.HoraFin,
        Estado = s.Estado
    };

    public SesionesController(SmartTutoringDbContext context) => _context = context;

    [Authorize(Roles = RolesUsuario.Administrador + "," + RolesUsuario.PersonalAdministrativo)]
    [HttpGet]
    public async Task<ActionResult<IEnumerable<SesionDto>>> ObtenerTodas()
    {
        var sesiones = await _context.SesionesTutoria.AsNoTracking()
            .OrderBy(s => s.Fecha).ThenBy(s => s.HoraInicio)
            .Select(ProyeccionSesion).ToListAsync();
        return Ok(sesiones);
    }

    [Authorize(Roles = RolesUsuario.Tutor)]
    [HttpGet("mis-sesiones")]
    public async Task<ActionResult<IEnumerable<SesionDto>>> ObtenerMisSesiones()
    {
        var idUsuario = ObtenerIdUsuarioActual();
        if (idUsuario is null) return Unauthorized();

        var idTutor = await _context.Tutores.Where(t => t.IdUsuario == idUsuario.Value)
            .Select(t => (int?)t.IdTutor).FirstOrDefaultAsync();
        if (idTutor is null) return Forbid();

        var sesiones = await _context.SesionesTutoria.AsNoTracking()
            .Where(s => s.IdTutor == idTutor.Value)
            .OrderBy(s => s.Fecha).ThenBy(s => s.HoraInicio)
            .Select(ProyeccionSesion).ToListAsync();
        return Ok(sesiones);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<SesionDto>> ObtenerPorId(int id)
    {
        var sesion = await _context.SesionesTutoria.AsNoTracking()
            .Where(s => s.IdSesion == id).Select(ProyeccionSesion).FirstOrDefaultAsync();
        if (sesion is null) return NotFound(new { mensaje = "Sesión no encontrada." });

        if (User.IsInRole(RolesUsuario.Tutor))
        {
            var idUsuario = ObtenerIdUsuarioActual();
            if (idUsuario is null) return Unauthorized();
            var idTutor = await _context.Tutores.Where(t => t.IdUsuario == idUsuario.Value)
                .Select(t => (int?)t.IdTutor).FirstOrDefaultAsync();
            if (idTutor is null || idTutor.Value != sesion.IdTutor) return Forbid();
        }
        else if (!User.IsInRole(RolesUsuario.Administrador) && !User.IsInRole(RolesUsuario.PersonalAdministrativo))
        {
            return Forbid();
        }

        return Ok(sesion);
    }

    [Authorize(Roles = RolesUsuario.Administrador + "," + RolesUsuario.PersonalAdministrativo)]
    [HttpPost]
    public async Task<ActionResult<SesionDto>> Crear(CrearSesionDto dto)
    {
        var fecha = dto.Fecha!.Value;
        var horaInicio = dto.HoraInicio!.Value;
        var horaFin = dto.HoraFin!.Value;

        var errorHorario = ValidarHorario(fecha, horaInicio, horaFin);
        if (errorHorario is not null) return BadRequest(new { mensaje = errorHorario });

        if (!await _context.Estudiantes.AnyAsync(e => e.IdEstudiante == dto.IdEstudiante))
            return NotFound(new { mensaje = "Estudiante no encontrado." });
        if (!await _context.Tutores.AnyAsync(t => t.IdTutor == dto.IdTutor))
            return NotFound(new { mensaje = "Tutor no encontrado." });
        if (!await _context.Materias.AnyAsync(m => m.IdMateria == dto.IdMateria))
            return NotFound(new { mensaje = "Materia no encontrada." });

        if (!await _context.TutorMaterias.AnyAsync(tm => tm.IdTutor == dto.IdTutor && tm.IdMateria == dto.IdMateria))
            return Conflict(new { mensaje = "El tutor no está asociado a la materia seleccionada." });

        var existeConflicto = await _context.SesionesTutoria.AnyAsync(s =>
            s.IdTutor == dto.IdTutor && s.Fecha == fecha && s.Estado != EstadosSesion.Cancelada &&
            horaInicio < s.HoraFin && horaFin > s.HoraInicio);
        if (existeConflicto)
            return Conflict(new { mensaje = "El tutor ya tiene una sesión durante ese período." });

        var sesion = new SesionTutoria
        {
            IdEstudiante = dto.IdEstudiante, IdTutor = dto.IdTutor, IdMateria = dto.IdMateria,
            Fecha = fecha, HoraInicio = horaInicio, HoraFin = horaFin, Estado = EstadosSesion.Programada
        };
        _context.SesionesTutoria.Add(sesion);
        await _context.SaveChangesAsync();

        var resultado = await _context.SesionesTutoria.AsNoTracking()
            .Where(s => s.IdSesion == sesion.IdSesion).Select(ProyeccionSesion).FirstAsync();
        return CreatedAtAction(nameof(ObtenerPorId), new { id = sesion.IdSesion }, resultado);
    }

    [Authorize(Roles = RolesUsuario.Administrador + "," + RolesUsuario.PersonalAdministrativo)]
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Reprogramar(int id, ReprogramarSesionDto dto)
    {
        var sesion = await _context.SesionesTutoria.FirstOrDefaultAsync(s => s.IdSesion == id);
        if (sesion is null) return NotFound(new { mensaje = "Sesión no encontrada." });
        if (sesion.Estado != EstadosSesion.Programada)
            return Conflict(new { mensaje = "Solo las sesiones programadas pueden reprogramarse." });

        var fecha = dto.Fecha!.Value;
        var horaInicio = dto.HoraInicio!.Value;
        var horaFin = dto.HoraFin!.Value;
        var errorHorario = ValidarHorario(fecha, horaInicio, horaFin);
        if (errorHorario is not null) return BadRequest(new { mensaje = errorHorario });

        var existeConflicto = await _context.SesionesTutoria.AnyAsync(s =>
            s.IdSesion != id && s.IdTutor == sesion.IdTutor && s.Fecha == fecha &&
            s.Estado != EstadosSesion.Cancelada && horaInicio < s.HoraFin && horaFin > s.HoraInicio);
        if (existeConflicto)
            return Conflict(new { mensaje = "El tutor ya tiene una sesión durante ese período." });

        sesion.Fecha = fecha;
        sesion.HoraInicio = horaInicio;
        sesion.HoraFin = horaFin;
        await _context.SaveChangesAsync();
        return NoContent();
    }

    [Authorize(Roles = RolesUsuario.Administrador + "," + RolesUsuario.PersonalAdministrativo)]
    [HttpPatch("{id:int}/cancelar")]
    public async Task<IActionResult> Cancelar(int id)
    {
        var sesion = await _context.SesionesTutoria.FirstOrDefaultAsync(s => s.IdSesion == id);
        if (sesion is null) return NotFound(new { mensaje = "Sesión no encontrada." });
        if (sesion.Estado == EstadosSesion.Cancelada) return NoContent();
        if (sesion.Estado == EstadosSesion.Completada)
            return Conflict(new { mensaje = "Una sesión completada no puede cancelarse." });
        if (await _context.Pagos.AnyAsync(p => p.IdSesion == id))
            return Conflict(new { mensaje = "La sesión tiene un pago registrado y no puede cancelarse sin gestionar primero ese pago." });

        sesion.Estado = EstadosSesion.Cancelada;
        await _context.SaveChangesAsync();
        return NoContent();
    }

    private static string? ValidarHorario(DateOnly fecha, TimeOnly horaInicio, TimeOnly horaFin)
    {
        if (horaFin <= horaInicio)
            return "La hora de finalización debe ser posterior a la hora de inicio.";

        var minutos = (int)(horaFin.ToTimeSpan() - horaInicio.ToTimeSpan()).TotalMinutes;
        if (minutos < 15 || minutos % 15 != 0)
            return "La sesión debe durar al menos 15 minutos y usar intervalos de 15 minutos.";

        var ahora = ObtenerAhoraCentro();
        var hoy = DateOnly.FromDateTime(ahora);
        var horaActual = TimeOnly.FromDateTime(ahora);
        if (fecha < hoy || (fecha == hoy && horaInicio <= horaActual))
            return "No se puede programar ni reprogramar una sesión en una fecha u hora pasada.";

        return null;
    }

    private static DateTime ObtenerAhoraCentro()
    {
        try
        {
            var zona = TimeZoneInfo.FindSystemTimeZoneById("America/Managua");
            return TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, zona);
        }
        catch (TimeZoneNotFoundException)
        {
            var zona = TimeZoneInfo.FindSystemTimeZoneById("Central America Standard Time");
            return TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, zona);
        }
    }

    private int? ObtenerIdUsuarioActual()
    {
        var claimId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue(JwtRegisteredClaimNames.Sub);
        return int.TryParse(claimId, out var idUsuario) ? idUsuario : null;
    }
}
