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

    // Proyección común utilizada para devolver una vista consistente de la sesión
    // sin exponer directamente la entidad de persistencia.
    private static readonly Expression<Func<SesionTutoria, SesionDto>>
        ProyeccionSesion = s => new SesionDto
        {
            IdSesion = s.IdSesion,

            IdEstudiante = s.IdEstudiante,
            NombreEstudiante =
                s.Estudiante.Nombre + " " + s.Estudiante.Apellido,

            IdTutor = s.IdTutor,
            NombreTutor =
                s.Tutor.Nombre + " " + s.Tutor.Apellido,

            IdMateria = s.IdMateria,
            NombreMateria = s.Materia.NombreMateria,

            Fecha = s.Fecha,
            HoraInicio = s.HoraInicio,
            HoraFin = s.HoraFin,

            Estado = s.Estado
        };

    public SesionesController(SmartTutoringDbContext context)
    {
        _context = context;
    }

    [Authorize(
        Roles = RolesUsuario.Administrador + "," +
                RolesUsuario.PersonalAdministrativo)]
    [HttpGet]
    public async Task<ActionResult<IEnumerable<SesionDto>>> ObtenerTodas()
    {
        var sesiones = await _context.SesionesTutoria
            .AsNoTracking()
            .OrderBy(s => s.Fecha)
            .ThenBy(s => s.HoraInicio)
            .Select(ProyeccionSesion)
            .ToListAsync();

        return Ok(sesiones);
    }

    [Authorize(Roles = RolesUsuario.Tutor)]
    [HttpGet("mis-sesiones")]
    public async Task<ActionResult<IEnumerable<SesionDto>>> ObtenerMisSesiones()
    {
        var idUsuario = ObtenerIdUsuarioActual();

        if (idUsuario is null)
        {
            return Unauthorized();
        }

        // El identificador del usuario autenticado se relaciona con su registro Tutor.
        // De esta forma un Tutor solo puede consultar las sesiones que le pertenecen.
        var idTutor = await _context.Tutores
            .Where(t => t.IdUsuario == idUsuario.Value)
            .Select(t => (int?)t.IdTutor)
            .FirstOrDefaultAsync();

        if (idTutor is null)
        {
            return Forbid();
        }

        var sesiones = await _context.SesionesTutoria
            .AsNoTracking()
            .Where(s => s.IdTutor == idTutor.Value)
            .OrderBy(s => s.Fecha)
            .ThenBy(s => s.HoraInicio)
            .Select(ProyeccionSesion)
            .ToListAsync();

        return Ok(sesiones);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<SesionDto>> ObtenerPorId(int id)
    {
        var sesion = await _context.SesionesTutoria
            .AsNoTracking()
            .Where(s => s.IdSesion == id)
            .Select(ProyeccionSesion)
            .FirstOrDefaultAsync();

        if (sesion is null)
        {
            return NotFound(new
            {
                mensaje = "Sesión no encontrada."
            });
        }

        // La autorización por rol no basta para el Tutor: también se comprueba
        // que la sesión consultada esté asociada específicamente a su IdTutor.
        if (User.IsInRole(RolesUsuario.Tutor))
        {
            var idUsuario = ObtenerIdUsuarioActual();

            if (idUsuario is null)
            {
                return Unauthorized();
            }

            var idTutor = await _context.Tutores
                .Where(t => t.IdUsuario == idUsuario.Value)
                .Select(t => (int?)t.IdTutor)
                .FirstOrDefaultAsync();

            if (idTutor is null ||
                idTutor.Value != sesion.IdTutor)
            {
                return Forbid();
            }
        }
        else if (
            !User.IsInRole(RolesUsuario.Administrador) &&
            !User.IsInRole(RolesUsuario.PersonalAdministrativo))
        {
            return Forbid();
        }

        return Ok(sesion);
    }

    [Authorize(
        Roles = RolesUsuario.Administrador + "," +
                RolesUsuario.PersonalAdministrativo)]
    [HttpPost]
    public async Task<ActionResult<SesionDto>> Crear(
        CrearSesionDto dto)
    {
        var fecha = dto.Fecha!.Value;
        var horaInicio = dto.HoraInicio!.Value;
        var horaFin = dto.HoraFin!.Value;

        if (horaFin <= horaInicio)
        {
            return BadRequest(new
            {
                mensaje =
                    "La hora de finalización debe ser posterior a la hora de inicio."
            });
        }

        var estudianteExiste = await _context.Estudiantes
            .AnyAsync(e => e.IdEstudiante == dto.IdEstudiante);

        if (!estudianteExiste)
        {
            return NotFound(new
            {
                mensaje = "Estudiante no encontrado."
            });
        }

        var tutorExiste = await _context.Tutores
            .AnyAsync(t => t.IdTutor == dto.IdTutor);

        if (!tutorExiste)
        {
            return NotFound(new
            {
                mensaje = "Tutor no encontrado."
            });
        }

        var materiaExiste = await _context.Materias
            .AnyAsync(m => m.IdMateria == dto.IdMateria);

        if (!materiaExiste)
        {
            return NotFound(new
            {
                mensaje = "Materia no encontrada."
            });
        }

        // Regla de negocio: no se puede programar una materia que el tutor
        // no tenga asignada en la relación TutorMateria.
        var tutorImparteMateria = await _context.TutorMaterias
            .AnyAsync(tm =>
                tm.IdTutor == dto.IdTutor &&
                tm.IdMateria == dto.IdMateria);

        if (!tutorImparteMateria)
        {
            return Conflict(new
            {
                mensaje =
                    "El tutor no está asociado a la materia seleccionada."
            });
        }

        // Dos intervalos se superponen cuando el nuevo inicio ocurre antes del
        // final existente y el nuevo final ocurre después del inicio existente.
        // Las sesiones canceladas no bloquean el horario.
        var existeConflicto = await _context.SesionesTutoria
            .AnyAsync(s =>
                s.IdTutor == dto.IdTutor &&
                s.Fecha == fecha &&
                s.Estado != EstadosSesion.Cancelada &&
                horaInicio < s.HoraFin &&
                horaFin > s.HoraInicio);

        if (existeConflicto)
        {
            return Conflict(new
            {
                mensaje =
                    "El tutor ya tiene una sesión durante ese período."
            });
        }

        var sesion = new SesionTutoria
        {
            IdEstudiante = dto.IdEstudiante,
            IdTutor = dto.IdTutor,
            IdMateria = dto.IdMateria,
            Fecha = fecha,
            HoraInicio = horaInicio,
            HoraFin = horaFin,
            Estado = EstadosSesion.Programada
        };

        _context.SesionesTutoria.Add(sesion);

        await _context.SaveChangesAsync();

        var resultado = await _context.SesionesTutoria
            .AsNoTracking()
            .Where(s => s.IdSesion == sesion.IdSesion)
            .Select(ProyeccionSesion)
            .FirstAsync();

        return CreatedAtAction(
            nameof(ObtenerPorId),
            new { id = sesion.IdSesion },
            resultado);
    }

    [Authorize(
        Roles = RolesUsuario.Administrador + "," +
                RolesUsuario.PersonalAdministrativo)]
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Reprogramar(
        int id,
        ReprogramarSesionDto dto)
    {
        var sesion = await _context.SesionesTutoria
            .FirstOrDefaultAsync(s => s.IdSesion == id);

        if (sesion is null)
        {
            return NotFound(new
            {
                mensaje = "Sesión no encontrada."
            });
        }

        if (sesion.Estado != EstadosSesion.Programada)
        {
            return Conflict(new
            {
                mensaje =
                    "Solo las sesiones programadas pueden reprogramarse."
            });
        }

        var fecha = dto.Fecha!.Value;
        var horaInicio = dto.HoraInicio!.Value;
        var horaFin = dto.HoraFin!.Value;

        if (horaFin <= horaInicio)
        {
            return BadRequest(new
            {
                mensaje =
                    "La hora de finalización debe ser posterior a la hora de inicio."
            });
        }

        // Se reutiliza la misma regla de solapamiento, excluyendo la sesión
        // que se está modificando para no compararla contra sí misma.
        var existeConflicto = await _context.SesionesTutoria
            .AnyAsync(s =>
                s.IdSesion != id &&
                s.IdTutor == sesion.IdTutor &&
                s.Fecha == fecha &&
                s.Estado != EstadosSesion.Cancelada &&
                horaInicio < s.HoraFin &&
                horaFin > s.HoraInicio);

        if (existeConflicto)
        {
            return Conflict(new
            {
                mensaje =
                    "El tutor ya tiene una sesión durante ese período."
            });
        }

        sesion.Fecha = fecha;
        sesion.HoraInicio = horaInicio;
        sesion.HoraFin = horaFin;

        await _context.SaveChangesAsync();

        return NoContent();
    }

    [Authorize(
        Roles = RolesUsuario.Administrador + "," +
                RolesUsuario.PersonalAdministrativo)]
    [HttpPatch("{id:int}/cancelar")]
    public async Task<IActionResult> Cancelar(int id)
    {
        var sesion = await _context.SesionesTutoria
            .FirstOrDefaultAsync(s => s.IdSesion == id);

        if (sesion is null)
        {
            return NotFound(new
            {
                mensaje = "Sesión no encontrada."
            });
        }

        if (sesion.Estado == EstadosSesion.Cancelada)
        {
            return NoContent();
        }

        if (sesion.Estado == EstadosSesion.Completada)
        {
            return Conflict(new
            {
                mensaje =
                    "Una sesión completada no puede cancelarse."
            });
        }

        sesion.Estado = EstadosSesion.Cancelada;

        await _context.SaveChangesAsync();

        return NoContent();
    }

    private int? ObtenerIdUsuarioActual()
    {
        // El identificador se obtiene del claim NameIdentifier o, como respaldo,
        // del claim estándar sub incluido al generar el JWT.
        var claimId =
            User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue(JwtRegisteredClaimNames.Sub);

        return int.TryParse(claimId, out var idUsuario)
            ? idUsuario
            : null;
    }
}