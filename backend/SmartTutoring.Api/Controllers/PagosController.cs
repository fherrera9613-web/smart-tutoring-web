using System.Text;
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
        var inicioHistorico = inicioMes.AddMonths(-5);

        var ingresosTotales = await _context.Pagos.SumAsync(p => (decimal?)p.Monto) ?? 0m;
        var pagosMesQuery = _context.Pagos.Where(p => p.FechaPago >= inicioMes && p.FechaPago < inicioMesSiguiente);
        var ingresosMesActual = await pagosMesQuery.SumAsync(p => (decimal?)p.Monto) ?? 0m;
        var pagosMesActual = await pagosMesQuery.CountAsync();
        var ahora = DateTime.UtcNow.AddHours(-6);
        var horaActual = TimeOnly.FromDateTime(ahora);
        var sesionesSinPago = await SesionesPendientesQuery(hoy, horaActual).CountAsync();

        var pagosHistoricos = await _context.Pagos
            .AsNoTracking()
            .Where(p => p.FechaPago >= inicioHistorico && p.FechaPago < inicioMesSiguiente)
            .Select(p => new { p.FechaPago, p.Monto })
            .ToListAsync();

        var ingresosPorMes = Enumerable.Range(0, 6)
            .Select(indice => inicioHistorico.AddMonths(indice))
            .Select(mes => new
            {
                anio = mes.Year,
                mes = mes.Month,
                total = pagosHistoricos
                    .Where(p => p.FechaPago.Year == mes.Year && p.FechaPago.Month == mes.Month)
                    .Sum(p => p.Monto)
            })
            .ToList();

        return Ok(new
        {
            ingresosTotales,
            ingresosMesActual,
            pagosMesActual,
            sesionesSinPago,
            ingresosPorMes
        });
    }

    // Paginación en servidor: evita cargar todo el historial de sesiones para cobrar.
    [HttpGet("pendientes")]
    public async Task<ActionResult> ObtenerPendientes(
        [FromQuery] int? idEstudiante = null,
        [FromQuery] string? buscar = null,
        [FromQuery] int pagina = 1,
        [FromQuery] int tamanio = 20)
    {
        if (pagina < 1 || tamanio < 1 || tamanio > 100)
            return BadRequest(new { mensaje = "La página debe ser positiva y el tamaño entre 1 y 100." });

        var ahora = DateTime.UtcNow.AddHours(-6);
        var fecha = DateOnly.FromDateTime(ahora);
        var hora = TimeOnly.FromDateTime(ahora);
        var query = SesionesPendientesQuery(fecha, hora);
        if (idEstudiante.HasValue)
            query = query.Where(s => s.IdEstudiante == idEstudiante.Value);

        if (!string.IsNullOrWhiteSpace(buscar))
        {
            var termino = buscar.Trim();
            if (termino.Length > 100)
                return BadRequest(new { mensaje = "La búsqueda no debe superar 100 caracteres." });
            var patron = "%" + termino.Replace("\\", "\\\\").Replace("%", "\\%").Replace("_", "\\_") + "%";
            query = query.Where(s =>
                EF.Functions.ILike(s.Estudiante.Nombre + " " + s.Estudiante.Apellido, patron, "\\") ||
                EF.Functions.ILike(s.Estudiante.Carnet, patron, "\\") ||
                EF.Functions.ILike(s.Materia.NombreMateria, patron, "\\"));
        }

        var total = await query.CountAsync();
        var items = await query
            .OrderBy(s => s.Fecha).ThenBy(s => s.HoraInicio).ThenBy(s => s.IdSesion)
            .Skip((pagina - 1) * tamanio).Take(tamanio)
            .Select(s => new
            {
                s.IdSesion, s.IdEstudiante, s.Fecha, s.HoraInicio, s.HoraFin,
                nombreEstudiante = s.Estudiante.Nombre + " " + s.Estudiante.Apellido,
                s.Estudiante.Carnet,
                s.Materia.NombreMateria,
                nombreTutor = s.Tutor.Nombre + " " + s.Tutor.Apellido
            }).ToListAsync();

        return Ok(new { items, total, pagina, tamanio });
    }

    private IQueryable<SesionTutoria> SesionesPendientesQuery(DateOnly fecha, TimeOnly hora) =>
        _context.SesionesTutoria.AsNoTracking().Where(s =>
            s.Estado != EstadosSesion.Cancelada &&
            (s.Fecha < fecha || (s.Fecha == fecha && s.HoraFin <= hora)) &&
            !_context.Pagos.Any(p => p.IdSesion == s.IdSesion));

    // Exportación acotada por período, procesada en streaming para evitar grandes listas en memoria.
    [HttpGet("reporte.csv")]
    public async Task<IActionResult> ExportarReporte([FromQuery] DateOnly desde, [FromQuery] DateOnly hasta)
    {
        if (desde == default || hasta == default || desde > hasta || hasta.DayNumber - desde.DayNumber > 366)
            return BadRequest(new { mensaje = "Indique un período válido de hasta 366 días." });

        Response.ContentType = "text/csv; charset=utf-8";
        Response.Headers.ContentDisposition = "attachment; filename=\"smart-tutoring-pagos.csv\"";
        await using var writer = new StreamWriter(Response.Body, new UTF8Encoding(true), 4096, leaveOpen: true);
        await writer.WriteLineAsync("Comprobante,Fecha de pago,Estudiante,Materia,Tutor,Fecha de sesión,Método,Monto C$");

        var query = _context.Pagos.AsNoTracking()
            .Where(p => p.FechaPago >= desde && p.FechaPago <= hasta)
            .OrderBy(p => p.FechaPago).ThenBy(p => p.IdPago)
            .Select(p => new
            {
                p.IdPago, p.FechaPago, Estudiante = p.Estudiante.Nombre + " " + p.Estudiante.Apellido,
                Materia = p.Sesion != null ? p.Sesion.Materia.NombreMateria : p.Concepto,
                Tutor = p.Sesion != null ? p.Sesion.Tutor.Nombre + " " + p.Sesion.Tutor.Apellido : "",
                FechaSesion = p.Sesion != null ? (DateOnly?)p.Sesion.Fecha : null,
                p.MetodoPago, p.Monto
            });

        await foreach (var pago in query.AsAsyncEnumerable().WithCancellation(HttpContext.RequestAborted))
        {
            var valores = new[]
            {
                pago.IdPago.ToString(), pago.FechaPago.ToString("yyyy-MM-dd"),
                pago.Estudiante, pago.Materia ?? "", pago.Tutor,
                pago.FechaSesion?.ToString("yyyy-MM-dd") ?? "", pago.MetodoPago,
                pago.Monto.ToString("F2", System.Globalization.CultureInfo.InvariantCulture)
            };
            await writer.WriteLineAsync(string.Join(",", valores.Select(EscapeCsv)));
        }
        await writer.FlushAsync();
        return new EmptyResult();
    }

    private static string EscapeCsv(string? value)
    {
        var texto = value ?? string.Empty;
        // Neutralizar fórmulas cuando el archivo se abra en un programa de hojas de cálculo.
        if (texto.Length > 0 && (texto[0] is '=' or '+' or '-' or '@' or '\t' or '\r'))
            texto = "'" + texto;
        return "\"" + texto.Replace("\"", "\"\"") + "\"";
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

        var ahoraCentro = DateTime.UtcNow.AddHours(-6);
        var fechaCentro = DateOnly.FromDateTime(ahoraCentro);
        var horaCentro = TimeOnly.FromDateTime(ahoraCentro);
        if (sesion.Fecha > fechaCentro || (sesion.Fecha == fechaCentro && sesion.HoraFin > horaCentro))
            return Conflict(new { mensaje = "Solo se permite pagar sesiones cuyo horario ya finalizó." });

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
