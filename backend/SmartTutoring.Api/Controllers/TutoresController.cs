using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartTutoring.Api.Data;
using SmartTutoring.Api.Models;
using SmartTutoring.Api.Models.DTOs;
using SmartTutoring.Api.Models.Entities;

namespace SmartTutoring.Api.Controllers;

[Authorize(Roles = RolesUsuario.Administrador + "," + RolesUsuario.PersonalAdministrativo)]
[ApiController]
[Route("api/[controller]")]
public class TutoresController : ControllerBase
{
    private readonly SmartTutoringDbContext _context;
    private readonly IPasswordHasher<Usuario> _passwordHasher;

    public TutoresController(SmartTutoringDbContext context, IPasswordHasher<Usuario> passwordHasher)
    {
        _context = context;
        _passwordHasher = passwordHasher;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<TutorDto>>> ObtenerTodos()
    {
        var tutores = await _context.Tutores.AsNoTracking()
            .OrderBy(t => t.Apellido).ThenBy(t => t.Nombre)
            .Select(t => new TutorDto
            {
                IdTutor = t.IdTutor, IdUsuario = t.IdUsuario, Nombre = t.Nombre,
                Apellido = t.Apellido, CorreoElectronico = t.Usuario.CorreoElectronico,
                Especialidad = t.Especialidad, Experiencia = t.Experiencia,
                Materias = t.TutorMaterias.OrderBy(tm => tm.Materia.NombreMateria)
                    .Select(tm => new MateriaDto
                    {
                        IdMateria = tm.Materia.IdMateria, NombreMateria = tm.Materia.NombreMateria,
                        Descripcion = tm.Materia.Descripcion, Nivel = tm.Materia.Nivel
                    }).ToList()
            }).ToListAsync();
        return Ok(tutores);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<TutorDto>> ObtenerPorId(int id)
    {
        var tutor = await _context.Tutores.AsNoTracking().Where(t => t.IdTutor == id)
            .Select(t => new TutorDto
            {
                IdTutor = t.IdTutor, IdUsuario = t.IdUsuario, Nombre = t.Nombre,
                Apellido = t.Apellido, CorreoElectronico = t.Usuario.CorreoElectronico,
                Especialidad = t.Especialidad, Experiencia = t.Experiencia,
                Materias = t.TutorMaterias.OrderBy(tm => tm.Materia.NombreMateria)
                    .Select(tm => new MateriaDto
                    {
                        IdMateria = tm.Materia.IdMateria, NombreMateria = tm.Materia.NombreMateria,
                        Descripcion = tm.Materia.Descripcion, Nivel = tm.Materia.Nivel
                    }).ToList()
            }).FirstOrDefaultAsync();

        return tutor is null ? NotFound(new { mensaje = "Tutor no encontrado." }) : Ok(tutor);
    }

    [HttpPost]
    public async Task<ActionResult<TutorDto>> Crear(CrearTutorDto dto)
    {
        var errorValidacion = ValidarNombre(dto.Nombre, dto.Apellido);
        if (errorValidacion is not null) return BadRequest(new { mensaje = errorValidacion });

        var correo = dto.CorreoElectronico.Trim().ToLowerInvariant();
        if (await _context.Usuarios.AnyAsync(u => u.CorreoElectronico == correo))
            return Conflict(new { mensaje = "El correo electrónico ya está registrado." });

        var usuario = new Usuario
        {
            CorreoElectronico = correo,
            Rol = RolesUsuario.Tutor,
            Activo = true
        };
        usuario.PasswordHash = _passwordHasher.HashPassword(usuario, dto.Password);

        var tutor = new Tutor
        {
            Usuario = usuario,
            Nombre = dto.Nombre.Trim(),
            Apellido = dto.Apellido.Trim(),
            Especialidad = string.IsNullOrWhiteSpace(dto.Especialidad) ? null : dto.Especialidad.Trim(),
            Experiencia = dto.Experiencia
        };

        _context.Tutores.Add(tutor);
        await _context.SaveChangesAsync();

        var resultado = new TutorDto
        {
            IdTutor = tutor.IdTutor, IdUsuario = tutor.IdUsuario, Nombre = tutor.Nombre,
            Apellido = tutor.Apellido, CorreoElectronico = usuario.CorreoElectronico,
            Especialidad = tutor.Especialidad, Experiencia = tutor.Experiencia
        };
        return CreatedAtAction(nameof(ObtenerPorId), new { id = tutor.IdTutor }, resultado);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Actualizar(int id, ActualizarTutorDto dto)
    {
        var tutor = await _context.Tutores.FindAsync(id);
        if (tutor is null) return NotFound(new { mensaje = "Tutor no encontrado." });

        var errorValidacion = ValidarNombre(dto.Nombre, dto.Apellido);
        if (errorValidacion is not null) return BadRequest(new { mensaje = errorValidacion });

        tutor.Nombre = dto.Nombre.Trim();
        tutor.Apellido = dto.Apellido.Trim();
        tutor.Especialidad = string.IsNullOrWhiteSpace(dto.Especialidad) ? null : dto.Especialidad.Trim();
        tutor.Experiencia = dto.Experiencia;
        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("{idTutor:int}/materias/{idMateria:int}")]
    public async Task<IActionResult> AsignarMateria(int idTutor, int idMateria)
    {
        if (!await _context.Tutores.AnyAsync(t => t.IdTutor == idTutor))
            return NotFound(new { mensaje = "Tutor no encontrado." });
        if (!await _context.Materias.AnyAsync(m => m.IdMateria == idMateria))
            return NotFound(new { mensaje = "Materia no encontrada." });
        if (await _context.TutorMaterias.AnyAsync(tm => tm.IdTutor == idTutor && tm.IdMateria == idMateria))
            return Conflict(new { mensaje = "El tutor ya tiene asignada esta materia." });

        _context.TutorMaterias.Add(new TutorMateria { IdTutor = idTutor, IdMateria = idMateria });
        await _context.SaveChangesAsync();
        return NoContent();
    }

    private static string? ValidarNombre(string nombre, string apellido)
    {
        if (!DomainValidation.IsPersonName(nombre))
            return "El nombre solo puede contener letras, espacios, apóstrofes y guiones.";
        if (!DomainValidation.IsPersonName(apellido))
            return "El apellido solo puede contener letras, espacios, apóstrofes y guiones.";
        return null;
    }
}
