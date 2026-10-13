using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartTutoring.Api.Data;
using SmartTutoring.Api.Models.DTOs;
using SmartTutoring.Api.Models.Entities;

namespace SmartTutoring.Api.Controllers;

[Authorize(Roles = "Administrador,PersonalAdministrativo")]
[ApiController]
[Route("api/[controller]")]
public class MateriasController : ControllerBase
{
    private readonly SmartTutoringDbContext _context;

    public MateriasController(SmartTutoringDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<MateriaDto>>> ObtenerTodas()
    {
        var materias = await _context.Materias
            .AsNoTracking()
            .OrderBy(m => m.NombreMateria)
            .Select(m => new MateriaDto
            {
                IdMateria = m.IdMateria,
                NombreMateria = m.NombreMateria,
                Descripcion = m.Descripcion,
                Nivel = m.Nivel
            })
            .ToListAsync();

        return Ok(materias);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<MateriaDto>> ObtenerPorId(int id)
    {
        var materia = await _context.Materias
            .AsNoTracking()
            .Where(m => m.IdMateria == id)
            .Select(m => new MateriaDto
            {
                IdMateria = m.IdMateria,
                NombreMateria = m.NombreMateria,
                Descripcion = m.Descripcion,
                Nivel = m.Nivel
            })
            .FirstOrDefaultAsync();

        if (materia is null)
        {
            return NotFound();
        }

        return Ok(materia);
    }

    [HttpPost]
    public async Task<ActionResult<MateriaDto>> Crear(
        CrearMateriaDto dto)
    {
        var materia = new Materia
        {
            NombreMateria = dto.NombreMateria.Trim(),

            Descripcion = string.IsNullOrWhiteSpace(dto.Descripcion)
                ? null
                : dto.Descripcion.Trim(),

            Nivel = string.IsNullOrWhiteSpace(dto.Nivel)
                ? null
                : dto.Nivel.Trim()
        };

        _context.Materias.Add(materia);
        await _context.SaveChangesAsync();

        var resultado = new MateriaDto
        {
            IdMateria = materia.IdMateria,
            NombreMateria = materia.NombreMateria,
            Descripcion = materia.Descripcion,
            Nivel = materia.Nivel
        };

        return CreatedAtAction(
            nameof(ObtenerPorId),
            new { id = materia.IdMateria },
            resultado);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Actualizar(
        int id,
        ActualizarMateriaDto dto)
    {
        var materia = await _context.Materias.FindAsync(id);

        if (materia is null)
        {
            return NotFound();
        }

        materia.NombreMateria = dto.NombreMateria.Trim();

        materia.Descripcion =
            string.IsNullOrWhiteSpace(dto.Descripcion)
                ? null
                : dto.Descripcion.Trim();

        materia.Nivel =
            string.IsNullOrWhiteSpace(dto.Nivel)
                ? null
                : dto.Nivel.Trim();

        await _context.SaveChangesAsync();

        return NoContent();
    }
}