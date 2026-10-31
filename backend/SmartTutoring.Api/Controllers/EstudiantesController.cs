using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartTutoring.Api.Data;
using SmartTutoring.Api.Models;
using SmartTutoring.Api.Models.DTOs;
using SmartTutoring.Api.Models.Entities;

namespace SmartTutoring.Api.Controllers;

[Authorize(Roles = "Administrador,PersonalAdministrativo")]
[ApiController]
[Route("api/[controller]")]
public class EstudiantesController : ControllerBase
{
    private readonly SmartTutoringDbContext _context;

    public EstudiantesController(SmartTutoringDbContext context) => _context = context;

    [HttpGet]
    public async Task<ActionResult<IEnumerable<EstudianteDto>>> ObtenerTodos()
    {
        var estudiantes = await _context.Estudiantes.AsNoTracking()
            .OrderBy(e => e.Apellido).ThenBy(e => e.Nombre)
            .Select(e => new EstudianteDto
            {
                IdEstudiante = e.IdEstudiante, Nombre = e.Nombre, Apellido = e.Apellido,
                FechaNacimiento = e.FechaNacimiento, Carnet = e.Carnet, Telefono = e.Telefono
            }).ToListAsync();
        return Ok(estudiantes);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<EstudianteDto>> ObtenerPorId(int id)
    {
        var estudiante = await _context.Estudiantes.AsNoTracking()
            .Where(e => e.IdEstudiante == id)
            .Select(e => new EstudianteDto
            {
                IdEstudiante = e.IdEstudiante, Nombre = e.Nombre, Apellido = e.Apellido,
                FechaNacimiento = e.FechaNacimiento, Carnet = e.Carnet, Telefono = e.Telefono
            }).FirstOrDefaultAsync();

        return estudiante is null
            ? NotFound(new { mensaje = "Estudiante no encontrado." })
            : Ok(estudiante);
    }

    [HttpPost]
    public async Task<ActionResult<EstudianteDto>> Crear(CrearEstudianteDto dto)
    {
        var errorValidacion = ValidarDatos(dto.Nombre, dto.Apellido, dto.Carnet, dto.Telefono);
        if (errorValidacion is not null) return BadRequest(new { mensaje = errorValidacion });

        if (dto.FechaNacimiento > ObtenerFechaActualCentro())
            return BadRequest(new { mensaje = "La fecha de nacimiento no puede estar en el futuro." });

        var carnet = NormalizarCarnet(dto.Carnet);
        if (await _context.Estudiantes.AnyAsync(e => e.Carnet == carnet))
            return Conflict(new { mensaje = "Ya existe un estudiante registrado con ese carnet." });

        var estudiante = new Estudiante
        {
            Nombre = dto.Nombre.Trim(),
            Apellido = dto.Apellido.Trim(),
            FechaNacimiento = dto.FechaNacimiento,
            Carnet = carnet,
            Telefono = NormalizarTelefono(dto.Telefono)
        };

        _context.Estudiantes.Add(estudiante);
        await _context.SaveChangesAsync();

        var resultado = new EstudianteDto
        {
            IdEstudiante = estudiante.IdEstudiante, Nombre = estudiante.Nombre,
            Apellido = estudiante.Apellido, FechaNacimiento = estudiante.FechaNacimiento,
            Carnet = estudiante.Carnet, Telefono = estudiante.Telefono
        };

        return CreatedAtAction(nameof(ObtenerPorId), new { id = estudiante.IdEstudiante }, resultado);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Actualizar(int id, ActualizarEstudianteDto dto)
    {
        var estudiante = await _context.Estudiantes.FindAsync(id);
        if (estudiante is null) return NotFound(new { mensaje = "Estudiante no encontrado." });

        var errorValidacion = ValidarDatos(dto.Nombre, dto.Apellido, dto.Carnet, dto.Telefono);
        if (errorValidacion is not null) return BadRequest(new { mensaje = errorValidacion });

        if (dto.FechaNacimiento > ObtenerFechaActualCentro())
            return BadRequest(new { mensaje = "La fecha de nacimiento no puede estar en el futuro." });

        var carnet = NormalizarCarnet(dto.Carnet);
        if (await _context.Estudiantes.AnyAsync(e => e.Carnet == carnet && e.IdEstudiante != id))
            return Conflict(new { mensaje = "Ya existe otro estudiante registrado con ese carnet." });

        estudiante.Nombre = dto.Nombre.Trim();
        estudiante.Apellido = dto.Apellido.Trim();
        estudiante.FechaNacimiento = dto.FechaNacimiento;
        estudiante.Carnet = carnet;
        estudiante.Telefono = NormalizarTelefono(dto.Telefono);

        await _context.SaveChangesAsync();
        return NoContent();
    }

    private static string? ValidarDatos(string nombre, string apellido, string carnet, string? telefono)
    {
        if (!DomainValidation.IsPersonName(nombre))
            return "El nombre solo puede contener letras, espacios, apóstrofes y guiones.";
        if (!DomainValidation.IsPersonName(apellido))
            return "El apellido solo puede contener letras, espacios, apóstrofes y guiones.";
        if (!DomainValidation.IsCarnet(carnet))
            return "El carnet debe usar el formato ST-0001: prefijo ST, guion y cuatro dígitos.";
        if (!DomainValidation.IsPhone(telefono))
            return "El teléfono debe contener exactamente 8 dígitos, por ejemplo 8888-1111.";
        return null;
    }

    private static string NormalizarCarnet(string carnet) => carnet.Trim().ToUpperInvariant();

    private static string? NormalizarTelefono(string? telefono)
    {
        if (string.IsNullOrWhiteSpace(telefono)) return null;
        var digitos = telefono.Trim().Replace("-", string.Empty);
        return $"{digitos[..4]}-{digitos[4..]}";
    }

    private static DateOnly ObtenerFechaActualCentro() => DateOnly.FromDateTime(DateTime.UtcNow.AddHours(-6));
}
