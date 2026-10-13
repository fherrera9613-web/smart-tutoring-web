using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartTutoring.Api.Data;
using SmartTutoring.Api.Models.DTOs;
using SmartTutoring.Api.Models.Entities;

namespace SmartTutoring.Api.Controllers;

[ApiController]
[Route("api/estudiantes")]
[Authorize(
    Roles = RolesUsuario.Administrador + "," +
            RolesUsuario.PersonalAdministrativo + "," +
            RolesUsuario.Tutor)]
public class HistorialAcademicoController : ControllerBase
{
    private readonly SmartTutoringDbContext _context;

    public HistorialAcademicoController(
        SmartTutoringDbContext context)
    {
        _context = context;
    }

    [HttpGet("{idEstudiante:int}/historial-academico")]
    public async Task<ActionResult<HistorialAcademicoDto>>
        ObtenerHistorial(int idEstudiante)
    {
        var estudiante = await _context.Estudiantes
            .AsNoTracking()
            .FirstOrDefaultAsync(
                e => e.IdEstudiante == idEstudiante);

        if (estudiante is null)
        {
            return NotFound(new
            {
                mensaje = "Estudiante no encontrado."
            });
        }

        var sesionesQuery = _context.SesionesTutoria
            .AsNoTracking()
            .Where(s => s.IdEstudiante == idEstudiante);

        if (User.IsInRole(RolesUsuario.Tutor))
        {
            var idTutor = await ObtenerIdTutorActualAsync();

            if (idTutor is null)
            {
                return Forbid();
            }

            var estudianteVinculado = await sesionesQuery
                .AnyAsync(s => s.IdTutor == idTutor.Value);

            if (!estudianteVinculado)
            {
                return Forbid();
            }

            sesionesQuery = sesionesQuery
                .Where(s => s.IdTutor == idTutor.Value);
        }

        var sesiones = await sesionesQuery
            .OrderByDescending(s => s.Fecha)
            .ThenByDescending(s => s.HoraInicio)
            .Select(s => new
            {
                s.IdSesion,
                s.Fecha,
                s.HoraInicio,
                s.HoraFin,
                EstadoSesion = s.Estado,

                s.IdTutor,
                NombreTutor =
                    s.Tutor.Nombre + " " + s.Tutor.Apellido,

                s.IdMateria,
                NombreMateria = s.Materia.NombreMateria
            })
            .ToListAsync();

        var idsSesiones = sesiones
            .Select(s => s.IdSesion)
            .ToList();

        var asistencias = idsSesiones.Count == 0
            ? new Dictionary<int, Asistencia>()
            : await _context.Asistencias
                .AsNoTracking()
                .Where(a => idsSesiones.Contains(a.IdSesion))
                .ToDictionaryAsync(a => a.IdSesion);

        var seguimientos = idsSesiones.Count == 0
            ? new Dictionary<int, SeguimientoAcademico>()
            : await _context.SeguimientosAcademicos
                .AsNoTracking()
                .Where(s => idsSesiones.Contains(s.IdSesion))
                .ToDictionaryAsync(s => s.IdSesion);

        var historialSesiones = sesiones
            .Select(s =>
            {
                asistencias.TryGetValue(
                    s.IdSesion,
                    out var asistencia);

                seguimientos.TryGetValue(
                    s.IdSesion,
                    out var seguimiento);

                return new HistorialSesionDto
                {
                    IdSesion = s.IdSesion,

                    Fecha = s.Fecha,
                    HoraInicio = s.HoraInicio,
                    HoraFin = s.HoraFin,

                    EstadoSesion = s.EstadoSesion,

                    IdTutor = s.IdTutor,
                    NombreTutor = s.NombreTutor,

                    IdMateria = s.IdMateria,
                    NombreMateria = s.NombreMateria,

                    EstadoAsistencia =
                        asistencia?.EstadoAsistencia,

                    ObservacionesAsistencia =
                        asistencia?.Observaciones,

                    TemaTrabajado =
                        seguimiento?.TemaTrabajado,

                    ObservacionesAcademicas =
                        seguimiento?.Observaciones
                };
            })
            .ToList();

        var resultado = new HistorialAcademicoDto
        {
            IdEstudiante = estudiante.IdEstudiante,

            NombreEstudiante =
                estudiante.Nombre + " " +
                estudiante.Apellido,

            Carnet = estudiante.Carnet,

            Sesiones = historialSesiones
        };

        return Ok(resultado);
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
            ?? User.FindFirstValue(
                JwtRegisteredClaimNames.Sub);

        return int.TryParse(
            claimId,
            out var idUsuario)
                ? idUsuario
                : null;
    }
}