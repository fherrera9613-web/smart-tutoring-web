using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartTutoring.Api.Data;
using SmartTutoring.Api.Models.DTOs;
using SmartTutoring.Api.Models.Entities;

namespace SmartTutoring.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = RolesUsuario.Administrador + "," + RolesUsuario.PersonalAdministrativo)]
public class PagosController : ControllerBase
{
    private const decimal TarifaUsdPorHora = 10m;
    private const decimal TipoCambioOficial2026 = 36.6243m;
    private const decimal TarifaCordobasPorHoraExacta = TarifaUsdPorHora * TipoCambioOficial2026;
    private static readonly string[] MetodosPagoPermitidos = ["Efectivo", "Transferencia", "Tarjeta"];
    private readonly SmartTutoringDbContext _context;

    public PagosController(SmartTutoringDbContext context) => _context = context;

    [HttpGet("tarifa")]
    public ActionResult ObtenerTarifa() => Ok(new
    {
        tarifaUsdPorHora = TarifaUsdPorHora,
        tipoCambioCordobasPorUsd = TipoCambioOficial2026,
        tarifaCordobasPorHora = TarifaCordobasPorHoraExacta
    });

    [HttpGet]
    public async Task<ActionResult<IEnumerable<PagoDto>>> ObtenerTodos()
    {
        var pagos = await CargarPagosBase().OrderByDescending(p => p.FechaPago)
            .ThenByDescending(p => p.IdPago).ToListAsync();
        return Ok(pagos.Select(MapearPago).ToList());
    }

    [HttpGet("resumen")]
    public async Task<ActionResult> ObtenerResumen()
    {
        var hoy = ObtenerFechaActualCentro();
        var inicioMes = new DateOnly(hoy.Year, hoy.Month, 1);
        var inicioMesSiguiente = inicioMes.AddMonths(1);

        var ingresosTotales = await _context.Pagos.SumAsync(p => (decimal?)p.Monto) ?? 0m;
        var pagosMesQuery = _context.Pagos.Where(p => p.FechaPago >= inicioMes && p.FechaPago < inicioMesSiguiente);
        var ingresosMesActual = await pagosMesQuery.SumAsync(p => (decimal?)p.Monto) ?? 0m;
        var pagosMesActual = await pagosMesQuery.CountAsync();
        var sesionesSinPago = await _context.SesionesTutoria.CountAsync(s =>
            s.Estado != EstadosSesion.Cancelada && !_context.Pagos.Any(p => p.IdSesion == s.IdSesion));

        return Ok(new { ingresosTotales, ingresosMesActual, pagosMesActual, sesionesSinPago });
    }

    [HttpPost]
    public async Task<ActionResult<PagoDto>> Crear(CrearPagoDto dto)
    {
        var metodoPago = NormalizarMetodoPago(dto.MetodoPago);
        if (metodoPago is null)
            return BadRequest(new { mensaje = "El método de pago debe ser Efectivo, Transferencia o Tarjeta." });

        var fechaPago = dto.FechaPago!.Value;
        if (fechaPago > ObtenerFechaActualCentro())
            return BadRequest(new { mensaje = "La fecha de pago no puede estar en el futuro." });

        var sesion = await _context.SesionesTutoria.AsNoTracking()
            .Include(s => s.Estudiante).Include(s => s.Tutor).Include(s => s.Materia)
            .FirstOrDefaultAsync(s => s.IdSesion == dto.IdSesion);
        if (sesion is null) return NotFound(new { mensaje = "Sesión no encontrada." });
        if (sesion.Estado == EstadosSesion.Cancelada)
            return Conflict(new { mensaje = "No se puede registrar un pago para una sesión cancelada." });
        if (await _context.Pagos.AnyAsync(p => p.IdSesion == sesion.IdSesion))
            return Conflict(new { mensaje = "La sesión seleccionada ya tiene un pago registrado." });

        var minutos = CalcularMinutos(sesion.HoraInicio, sesion.HoraFin);
        var pago = new Pago
        {
            IdEstudiante = sesion.IdEstudiante,
            IdSesion = sesion.IdSesion,
            Monto = CalcularMonto(minutos),
            FechaPago = fechaPago,
            MetodoPago = metodoPago,
            Concepto = $"Tutoría de {sesion.Materia.NombreMateria}",
            Observaciones = string.IsNullOrWhiteSpace(dto.Observaciones) ? null : dto.Observaciones.Trim()
        };

        _context.Pagos.Add(pago);
        await _context.SaveChangesAsync();
        pago.Estudiante = sesion.Estudiante;
        pago.Sesion = sesion;

        return Created($"/api/pagos/{pago.IdPago}", MapearPago(pago));
    }

    [HttpGet("estudiante/{idEstudiante:int}")]
    public async Task<ActionResult<IEnumerable<PagoDto>>> ObtenerPorEstudiante(int idEstudiante)
    {
        if (!await _context.Estudiantes.AnyAsync(e => e.IdEstudiante == idEstudiante))
            return NotFound(new { mensaje = "Estudiante no encontrado." });

        var pagos = await CargarPagosBase().Where(p => p.IdEstudiante == idEstudiante)
            .OrderByDescending(p => p.FechaPago).ThenByDescending(p => p.IdPago).ToListAsync();
        return Ok(pagos.Select(MapearPago).ToList());
    }

    private IQueryable<Pago> CargarPagosBase() =>
        _context.Pagos.AsNoTracking()
            .Include(p => p.Estudiante)
            .Include(p => p.Sesion).ThenInclude(s => s!.Materia)
            .Include(p => p.Sesion).ThenInclude(s => s!.Tutor);

    private static PagoDto MapearPago(Pago pago)
    {
        var sesion = pago.Sesion;
        return new PagoDto
        {
            IdPago = pago.IdPago,
            IdEstudiante = pago.IdEstudiante,
            NombreEstudiante = pago.Estudiante.Nombre + " " + pago.Estudiante.Apellido,
            IdSesion = pago.IdSesion,
            NombreMateria = sesion?.Materia.NombreMateria,
            NombreTutor = sesion is null ? null : sesion.Tutor.Nombre + " " + sesion.Tutor.Apellido,
            FechaSesion = sesion?.Fecha,
            Minutos = sesion is null ? null : CalcularMinutos(sesion.HoraInicio, sesion.HoraFin),
            Monto = pago.Monto,
            FechaPago = pago.FechaPago,
            MetodoPago = pago.MetodoPago,
            Concepto = pago.Concepto,
            Observaciones = pago.Observaciones
        };
    }

    private static string? NormalizarMetodoPago(string metodoPago) =>
        MetodosPagoPermitidos.FirstOrDefault(m => string.Equals(m, metodoPago.Trim(), StringComparison.OrdinalIgnoreCase));

    private static int CalcularMinutos(TimeOnly horaInicio, TimeOnly horaFin) =>
        (int)(horaFin.ToTimeSpan() - horaInicio.ToTimeSpan()).TotalMinutes;

    private static decimal CalcularMonto(int minutos) =>
        Math.Round((minutos / 60m) * TarifaCordobasPorHoraExacta, 2, MidpointRounding.AwayFromZero);

    private static DateOnly ObtenerFechaActualCentro() => DateOnly.FromDateTime(DateTime.UtcNow.AddHours(-6));
}
