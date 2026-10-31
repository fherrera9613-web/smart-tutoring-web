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
public class MateriasController : ControllerBase
{
    private readonly SmartTutoringDbContext _context;
    public MateriasController(SmartTutoringDbContext context) => _context = context;

    [HttpGet]
    public async Task<ActionResult<IEnumerable<MateriaDto>>> ObtenerTodas()
    {
        var materias = await _context.Materias.AsNoTracking().OrderBy(m => m.NombreMateria)
            .Select(m => new MateriaDto
            {
                IdMateria = m.IdMateria, NombreMateria = m.NombreMateria,
                Descripcion = m.Descripcion, Nivel = m.Nivel
            }).ToListAsync();
        return Ok(materias);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<MateriaDto>> ObtenerPorId(int id)
    {
        var materia = await _context.Materias.AsNoTracking().Where(m => m.IdMateria == id)
            .Select(m => new MateriaDto
            {
                IdMateria = m.IdMateria, NombreMateria = m.NombreMateria,
                Descripcion = m.Descripcion, Nivel = m.Nivel
            }).FirstOrDefaultAsync();
        return materia is null ? NotFound(new { mensaje = "Materia no encontrada." }) : Ok(materia);
    }

    [HttpPost]
    public async Task<ActionResult<MateriaDto>> Crear(CrearMateriaDto dto)
    {
        var nombre = dto.NombreMateria.Trim();
        if (!DomainValidation.IsSubjectName(nombre))
            return BadRequest(new { mensaje = "El nombre de la materia debe contener letras y usar únicamente caracteres académicos válidos." });

        var nivel = NormalizarOpcional(dto.Nivel);
        if (await ExisteDuplicadoAsync(nombre, nivel))
            return Conflict(new { mensaje = "Ya existe una materia con el mismo nombre y nivel." });

        var materia = new Materia
        {
            NombreMateria = nombre,
            Descripcion = NormalizarOpcional(dto.Descripcion),
            Nivel = nivel
        };
        _context.Materias.Add(materia);
        await _context.SaveChangesAsync();

        var resultado = new MateriaDto
        {
            IdMateria = materia.IdMateria, NombreMateria = materia.NombreMateria,
            Descripcion = materia.Descripcion, Nivel = materia.Nivel
        };
        return CreatedAtAction(nameof(ObtenerPorId), new { id = materia.IdMateria }, resultado);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Actualizar(int id, ActualizarMateriaDto dto)
    {
        var materia = await _context.Materias.FindAsync(id);
        if (materia is null) return NotFound(new { mensaje = "Materia no encontrada." });

        var nombre = dto.NombreMateria.Trim();
        if (!DomainValidation.IsSubjectName(nombre))
            return BadRequest(new { mensaje = "El nombre de la materia debe contener letras y usar únicamente caracteres académicos válidos." });

        var nivel = NormalizarOpcional(dto.Nivel);
        if (await ExisteDuplicadoAsync(nombre, nivel, id))
            return Conflict(new { mensaje = "Ya existe otra materia con el mismo nombre y nivel." });

        materia.NombreMateria = nombre;
        materia.Descripcion = NormalizarOpcional(dto.Descripcion);
        materia.Nivel = nivel;
        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Eliminar(int id)
    {
        var materia = await _context.Materias.FindAsync(id);
        if (materia is null) return NotFound(new { mensaje = "Materia no encontrada." });

        if (await _context.SesionesTutoria.AnyAsync(s => s.IdMateria == id))
            return Conflict(new { mensaje = "La materia no puede eliminarse porque ya tiene sesiones registradas." });

        var asignaciones = await _context.TutorMaterias.Where(tm => tm.IdMateria == id).ToListAsync();
        if (asignaciones.Count > 0) _context.TutorMaterias.RemoveRange(asignaciones);

        _context.Materias.Remove(materia);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    private async Task<bool> ExisteDuplicadoAsync(string nombre, string? nivel, int? excluirId = null)
    {
        var query = _context.Materias.AsQueryable();
        if (excluirId.HasValue) query = query.Where(m => m.IdMateria != excluirId.Value);

        return await query.AnyAsync(m =>
            EF.Functions.ILike(m.NombreMateria, nombre) &&
            (nivel == null
                ? m.Nivel == null || m.Nivel == ""
                : m.Nivel != null && EF.Functions.ILike(m.Nivel, nivel)));
    }

    private static string? NormalizarOpcional(string? valor) =>
        string.IsNullOrWhiteSpace(valor) ? null : valor.Trim();
}
