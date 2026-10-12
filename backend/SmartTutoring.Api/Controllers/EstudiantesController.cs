using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartTutoring.Api.Data;
using SmartTutoring.Api.Models.DTOs;
using SmartTutoring.Api.Models.Entities;

namespace SmartTutoring.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class EstudiantesController : ControllerBase
{
    private readonly SmartTutoringDbContext _context;

    public EstudiantesController(SmartTutoringDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<EstudianteDto>>> ObtenerTodos()
    {
        var estudiantes = await _context.Estudiantes
            .AsNoTracking()
            .OrderBy(e => e.Apellido)
            .ThenBy(e => e.Nombre)
            .Select(e => new EstudianteDto
            {
                IdEstudiante = e.IdEstudiante,
                Nombre = e.Nombre,
                Apellido = e.Apellido,
                FechaNacimiento = e.FechaNacimiento,
                Carnet = e.Carnet,
                Telefono = e.Telefono
            })
            .ToListAsync();

        return Ok(estudiantes);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<EstudianteDto>> ObtenerPorId(int id)
    {
        var estudiante = await _context.Estudiantes
            .AsNoTracking()
            .Where(e => e.IdEstudiante == id)
            .Select(e => new EstudianteDto
            {
                IdEstudiante = e.IdEstudiante,
                Nombre = e.Nombre,
                Apellido = e.Apellido,
                FechaNacimiento = e.FechaNacimiento,
                Carnet = e.Carnet,
                Telefono = e.Telefono
            })
            .FirstOrDefaultAsync();

        if (estudiante is null)
        {
            return NotFound();
        }

        return Ok(estudiante);
    }

    [HttpPost]
    public async Task<ActionResult<EstudianteDto>> Crear(
        CrearEstudianteDto dto)
    {
        var carnetExiste = await _context.Estudiantes
            .AnyAsync(e => e.Carnet == dto.Carnet);

        if (carnetExiste)
        {
            return Conflict(new
            {
                mensaje = "Ya existe un estudiante registrado con ese carnet."
            });
        }

        var estudiante = new Estudiante
        {
            Nombre = dto.Nombre.Trim(),
            Apellido = dto.Apellido.Trim(),
            FechaNacimiento = dto.FechaNacimiento,
            Carnet = dto.Carnet.Trim(),
            Telefono = string.IsNullOrWhiteSpace(dto.Telefono)
                ? null
                : dto.Telefono.Trim()
        };

        _context.Estudiantes.Add(estudiante);
        await _context.SaveChangesAsync();

        var resultado = new EstudianteDto
        {
            IdEstudiante = estudiante.IdEstudiante,
            Nombre = estudiante.Nombre,
            Apellido = estudiante.Apellido,
            FechaNacimiento = estudiante.FechaNacimiento,
            Carnet = estudiante.Carnet,
            Telefono = estudiante.Telefono
        };

        return CreatedAtAction(
            nameof(ObtenerPorId),
            new { id = estudiante.IdEstudiante },
            resultado);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Actualizar(
        int id,
        ActualizarEstudianteDto dto)
    {
        var estudiante = await _context.Estudiantes.FindAsync(id);

        if (estudiante is null)
        {
            return NotFound();
        }

        var carnetExiste = await _context.Estudiantes
            .AnyAsync(e =>
                e.Carnet == dto.Carnet &&
                e.IdEstudiante != id);

        if (carnetExiste)
        {
            return Conflict(new
            {
                mensaje = "Ya existe otro estudiante registrado con ese carnet."
            });
        }

        estudiante.Nombre = dto.Nombre.Trim();
        estudiante.Apellido = dto.Apellido.Trim();
        estudiante.FechaNacimiento = dto.FechaNacimiento;
        estudiante.Carnet = dto.Carnet.Trim();
        estudiante.Telefono = string.IsNullOrWhiteSpace(dto.Telefono)
            ? null
            : dto.Telefono.Trim();

        await _context.SaveChangesAsync();

        return NoContent();
    }
}