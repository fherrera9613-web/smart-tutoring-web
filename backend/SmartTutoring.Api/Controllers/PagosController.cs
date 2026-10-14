using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartTutoring.Api.Data;
using SmartTutoring.Api.Models.DTOs;
using SmartTutoring.Api.Models.Entities;

namespace SmartTutoring.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(
    Roles = RolesUsuario.Administrador + "," +
            RolesUsuario.PersonalAdministrativo)]
public class PagosController : ControllerBase
{
    private const decimal TarifaUsdPorHora = 10m;
    private const decimal TipoCambioOficial2026 = 36.6243m;
    private const decimal TarifaCordobasPorHora = 366.24m;

    private readonly SmartTutoringDbContext _context;

    public PagosController(SmartTutoringDbContext context)
    {
        _context = context;
    }

    [HttpGet("tarifa")]
    public ActionResult ObtenerTarifa()
    {
        return Ok(new
        {
            tarifaUsdPorHora = TarifaUsdPorHora,
            tipoCambioCordobasPorUsd = TipoCambioOficial2026,
            tarifaCordobasPorHora = TarifaCordobasPorHora
        });
    }

    [HttpPost]
    public async Task<ActionResult<PagoDto>> Crear(
        CrearPagoDto dto)
    {
        if (dto.Horas <= 0)
        {
            return BadRequest(new
            {
                mensaje = "La cantidad de horas debe ser mayor que cero."
            });
        }

        var estudiante = await _context.Estudiantes
            .AsNoTracking()
            .FirstOrDefaultAsync(
                e => e.IdEstudiante == dto.IdEstudiante);

        if (estudiante is null)
        {
            return NotFound(new
            {
                mensaje = "Estudiante no encontrado."
            });
        }

        var pago = new Pago
        {
            IdEstudiante = dto.IdEstudiante,
            Monto = CalcularMonto(dto.Horas),
            FechaPago = dto.FechaPago!.Value,

            Concepto =
                string.IsNullOrWhiteSpace(dto.Concepto)
                    ? null
                    : dto.Concepto.Trim(),

            Observaciones =
                string.IsNullOrWhiteSpace(dto.Observaciones)
                    ? null
                    : dto.Observaciones.Trim()
        };

        _context.Pagos.Add(pago);

        await _context.SaveChangesAsync();

        var resultado = new PagoDto
        {
            IdPago = pago.IdPago,
            IdEstudiante = estudiante.IdEstudiante,
            NombreEstudiante =
                estudiante.Nombre + " " + estudiante.Apellido,
            Monto = pago.Monto,
            FechaPago = pago.FechaPago,
            Concepto = pago.Concepto,
            Observaciones = pago.Observaciones
        };

        return Created(
            $"/api/pagos/estudiante/{pago.IdEstudiante}",
            resultado);
    }

    [HttpGet("estudiante/{idEstudiante:int}")]
    public async Task<ActionResult<IEnumerable<PagoDto>>>
        ObtenerPorEstudiante(int idEstudiante)
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

        var pagos = await _context.Pagos
            .AsNoTracking()
            .Where(p => p.IdEstudiante == idEstudiante)
            .OrderByDescending(p => p.FechaPago)
            .ThenByDescending(p => p.IdPago)
            .Select(p => new PagoDto
            {
                IdPago = p.IdPago,
                IdEstudiante = p.IdEstudiante,

                NombreEstudiante =
                    p.Estudiante.Nombre + " " +
                    p.Estudiante.Apellido,

                Monto = p.Monto,
                FechaPago = p.FechaPago,
                Concepto = p.Concepto,
                Observaciones = p.Observaciones
            })
            .ToListAsync();

        return Ok(pagos);
    }

    private static decimal CalcularMonto(decimal horas)
    {
        return Math.Round(
            horas * TarifaCordobasPorHora,
            2,
            MidpointRounding.AwayFromZero);
    }
}
