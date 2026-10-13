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

        if (sesion.IdTutor != idTutorActual.Value)
        {
            return Forbid();
        }

        if (sesion.Estado == EstadosSesion.Cancelada)
        {
            return Conflict(new
            {
                mensaje =
                    "No se puede registrar asistencia en una sesión cancelada."
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

        if (sesion.Estado == EstadosSesion.Cancelada)
        {
            return Conflict(new
            {
                mensaje =
                    "No se puede registrar seguimiento en una sesión cancelada."
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