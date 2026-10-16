using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartTutoring.Api.Data;
using SmartTutoring.Api.Models.DTOs;
using SmartTutoring.Api.Models.Entities;

namespace SmartTutoring.Api.Controllers;

[Authorize(Roles = RolesUsuario.Tutor)]
[ApiController]
[Route("api/sesiones")]
public class RegistrosAcademicosController : ControllerBase
{
    private readonly SmartTutoringDbContext _context;

    public RegistrosAcademicosController(
        SmartTutoringDbContext context)
    {
        _context = context;
    }

    [HttpPost("{idSesion:int}/asistencia")]
    public async Task<ActionResult<AsistenciaDto>> RegistrarAsistencia(
        int idSesion,
        RegistrarAsistenciaDto dto)
    {
        var sesion = await _context.SesionesTutoria
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.IdSesion == idSesion);

        if (sesion is null)
        {
            return NotFound(new
            {
                mensaje = "Sesión no encontrada."
            });
        }

        var idTutorActual = await ObtenerIdTutorActualAsync();

        if (idTutorActual is null)
        {
            return Forbid();
        }

        // Aunque el endpoint ya exige rol Tutor, también se verifica propiedad:
        // un tutor no puede registrar información académica sobre sesiones ajenas.
        if (sesion.IdTutor != idTutorActual.Value)
        {
            return Forbid();
        }

        if (sesion.Estado != EstadosSesion.Programada)
        {
            return Conflict(new
            {
                mensaje =
                    "Solo se puede registrar asistencia en una sesión programada."
            });
        }

        var ahora = ObtenerAhoraCentro();

        // La asistencia se habilita desde el momento real de inicio de la sesión.
        if (!SesionYaInicio(sesion, ahora))
        {
            return Conflict(new
            {
                mensaje =
                    "La asistencia solo puede registrarse a partir de la hora de inicio de la sesión."
            });
        }

        var asistenciaExiste = await _context.Asistencias
            .AnyAsync(a => a.IdSesion == idSesion);

        if (asistenciaExiste)
        {
            return Conflict(new
            {
                mensaje =
                    "La sesión ya tiene un registro de asistencia."
            });
        }

        var estadoRecibido = dto.EstadoAsistencia.Trim();

        var estadoValido = EstadosAsistencia.Todos
            .FirstOrDefault(e =>
                string.Equals(
                    e,
                    estadoRecibido,
                    StringComparison.OrdinalIgnoreCase));

        if (estadoValido is null)
        {
            return BadRequest(new
            {
                mensaje =
                    "El estado de asistencia debe ser Presente o Ausente."
            });
        }

        var asistencia = new Asistencia
        {
            IdSesion = idSesion,
            EstadoAsistencia = estadoValido,

            Observaciones =
                string.IsNullOrWhiteSpace(dto.Observaciones)
                    ? null
                    : dto.Observaciones.Trim()
        };

        _context.Asistencias.Add(asistencia);

        await _context.SaveChangesAsync();

        var resultado = new AsistenciaDto
        {
            IdAsistencia = asistencia.IdAsistencia,
            IdSesion = asistencia.IdSesion,
            EstadoAsistencia = asistencia.EstadoAsistencia,
            Observaciones = asistencia.Observaciones
        };

        return Created(
            $"/api/sesiones/{idSesion}/asistencia",
            resultado);
    }

    [HttpPost("{idSesion:int}/seguimiento")]
    public async Task<ActionResult<SeguimientoAcademicoDto>>
        RegistrarSeguimiento(
            int idSesion,
            RegistrarSeguimientoDto dto)
    {
        var sesion = await _context.SesionesTutoria
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.IdSesion == idSesion);

        if (sesion is null)
        {
            return NotFound(new
            {
                mensaje = "Sesión no encontrada."
            });
        }

        var idTutorActual = await ObtenerIdTutorActualAsync();

        if (idTutorActual is null)
        {
            return Forbid();
        }

        if (sesion.IdTutor != idTutorActual.Value)
        {
            return Forbid();
        }

        if (sesion.Estado != EstadosSesion.Programada)
        {
            return Conflict(new
            {
                mensaje =
                    "Solo se puede registrar seguimiento en una sesión programada."
            });
        }

        var ahora = ObtenerAhoraCentro();

        // El seguimiento representa el trabajo realizado, por eso solo procede
        // después de que haya terminado el horario programado de la sesión.
        if (!SesionYaFinalizo(sesion, ahora))
        {
            return Conflict(new
            {
                mensaje =
                    "El seguimiento académico solo puede registrarse después de la hora de finalización de la sesión."
            });
        }

        var asistencia = await _context.Asistencias
            .AsNoTracking()
            .FirstOrDefaultAsync(a => a.IdSesion == idSesion);

        if (asistencia is null)
        {
            return Conflict(new
            {
                mensaje =
                    "Debe registrar la asistencia antes del seguimiento académico."
            });
        }

        // Si el estudiante estuvo ausente no existe trabajo académico que documentar.
        if (asistencia.EstadoAsistencia != EstadosAsistencia.Presente)
        {
            return Conflict(new
            {
                mensaje =
                    "No corresponde registrar seguimiento académico cuando el estudiante estuvo ausente."
            });
        }

        var seguimientoExiste =
            await _context.SeguimientosAcademicos
                .AnyAsync(s => s.IdSesion == idSesion);

        if (seguimientoExiste)
        {
            return Conflict(new
            {
                mensaje =
                    "La sesión ya tiene un seguimiento académico."
            });
        }

        var seguimiento = new SeguimientoAcademico
        {
            IdSesion = idSesion,
            TemaTrabajado = dto.TemaTrabajado.Trim(),
            Observaciones = dto.Observaciones.Trim()
        };

        _context.SeguimientosAcademicos.Add(seguimiento);

        await _context.SaveChangesAsync();

        var resultado = new SeguimientoAcademicoDto
        {
            IdSeguimiento = seguimiento.IdSeguimiento,
            IdSesion = seguimiento.IdSesion,
            TemaTrabajado = seguimiento.TemaTrabajado,
            Observaciones = seguimiento.Observaciones
        };

        return Created(
            $"/api/sesiones/{idSesion}/seguimiento",
            resultado);
    }

    [HttpPatch("{idSesion:int}/completar")]
    public async Task<IActionResult> CompletarSesion(int idSesion)
    {
        var sesion = await _context.SesionesTutoria
            .FirstOrDefaultAsync(s => s.IdSesion == idSesion);

        if (sesion is null)
        {
            return NotFound(new
            {
                mensaje = "Sesión no encontrada."
            });
        }

        var idTutorActual = await ObtenerIdTutorActualAsync();

        if (idTutorActual is null)
        {
            return Forbid();
        }

        if (sesion.IdTutor != idTutorActual.Value)
        {
            return Forbid();
        }

        if (sesion.Estado == EstadosSesion.Cancelada)
        {
            return Conflict(new
            {
                mensaje =
                    "Una sesión cancelada no puede completarse."
            });
        }

        if (sesion.Estado == EstadosSesion.Completada)
        {
            return NoContent();
        }

        if (sesion.Estado != EstadosSesion.Programada)
        {
            return Conflict(new
            {
                mensaje =
                    "Solo las sesiones programadas pueden completarse."
            });
        }

        var ahora = ObtenerAhoraCentro();

        if (!SesionYaFinalizo(sesion, ahora))
        {
            return Conflict(new
            {
                mensaje =
                    "La sesión no puede completarse antes de su hora de finalización."
            });
        }

        var asistencia = await _context.Asistencias
            .AsNoTracking()
            .FirstOrDefaultAsync(a => a.IdSesion == idSesion);

        if (asistencia is null)
        {
            return Conflict(new
            {
                mensaje =
                    "Debe registrar la asistencia antes de completar la sesión."
            });
        }

        // Cuando hubo asistencia Presente, completar la sesión exige que el tutor
        // haya documentado previamente el seguimiento académico correspondiente.
        if (asistencia.EstadoAsistencia == EstadosAsistencia.Presente)
        {
            var seguimientoExiste =
                await _context.SeguimientosAcademicos
                    .AnyAsync(s => s.IdSesion == idSesion);

            if (!seguimientoExiste)
            {
                return Conflict(new
                {
                    mensaje =
                        "Debe registrar el seguimiento académico antes de completar una sesión con asistencia presente."
                });
            }
        }

        sesion.Estado = EstadosSesion.Completada;

        await _context.SaveChangesAsync();

        return NoContent();
    }

    private static bool SesionYaInicio(
        SesionTutoria sesion,
        DateTime ahora)
    {
        var fechaActual = DateOnly.FromDateTime(ahora);
        var horaActual = TimeOnly.FromDateTime(ahora);

        return sesion.Fecha < fechaActual ||
               (sesion.Fecha == fechaActual &&
                sesion.HoraInicio <= horaActual);
    }

    private static bool SesionYaFinalizo(
        SesionTutoria sesion,
        DateTime ahora)
    {
        var fechaActual = DateOnly.FromDateTime(ahora);
        var horaActual = TimeOnly.FromDateTime(ahora);

        return sesion.Fecha < fechaActual ||
               (sesion.Fecha == fechaActual &&
                sesion.HoraFin <= horaActual);
    }

    private static DateTime ObtenerAhoraCentro()
    {
        var zonaHoraria = ObtenerZonaHorariaCentro();

        return TimeZoneInfo.ConvertTimeFromUtc(
            DateTime.UtcNow,
            zonaHoraria);
    }

    private static TimeZoneInfo ObtenerZonaHorariaCentro()
    {
        // Linux/macOS utilizan el identificador IANA. Windows utiliza el nombre
        // alternativo; el fallback mantiene la misma zona horaria en ambos entornos.
        try
        {
            return TimeZoneInfo.FindSystemTimeZoneById(
                "America/Managua");
        }
        catch (TimeZoneNotFoundException)
        {
            return TimeZoneInfo.FindSystemTimeZoneById(
                "Central America Standard Time");
        }
    }

    private async Task<int?> ObtenerIdTutorActualAsync()
    {
        var idUsuario = ObtenerIdUsuarioActual();

        if (idUsuario is null)
        {
            return null;
        }

        return await _context.Tutores
            .Where(t => t.IdUsuario == idUsuario.Value)
            .Select(t => (int?)t.IdTutor)
            .FirstOrDefaultAsync();
    }

    private int? ObtenerIdUsuarioActual()
    {
        var claimId =
            User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue(JwtRegisteredClaimNames.Sub);

        return int.TryParse(claimId, out var idUsuario)
            ? idUsuario
            : null;
    }
}