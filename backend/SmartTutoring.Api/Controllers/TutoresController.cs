using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartTutoring.Api.Data;
using SmartTutoring.Api.Models.DTOs;
using SmartTutoring.Api.Models.Entities;

namespace SmartTutoring.Api.Controllers;

[Authorize(
    Roles = RolesUsuario.Administrador + "," +
            RolesUsuario.PersonalAdministrativo)]
[ApiController]
[Route("api/[controller]")]
public class TutoresController : ControllerBase
{
    private readonly SmartTutoringDbContext _context;
    private readonly IPasswordHasher<Usuario> _passwordHasher;

    public TutoresController(
        SmartTutoringDbContext context,
        IPasswordHasher<Usuario> passwordHasher)
    {
        _context = context;
        _passwordHasher = passwordHasher;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<TutorDto>>> ObtenerTodos()
    {
        var tutores = await _context.Tutores
            .AsNoTracking()
            .OrderBy(t => t.Apellido)
            .ThenBy(t => t.Nombre)
            .Select(t => new TutorDto
            {
                IdTutor = t.IdTutor,
                IdUsuario = t.IdUsuario,
                Nombre = t.Nombre,
                Apellido = t.Apellido,
                CorreoElectronico = t.Usuario.CorreoElectronico,
                Especialidad = t.Especialidad,
                Experiencia = t.Experiencia,

                Materias = t.TutorMaterias
                    .OrderBy(tm => tm.Materia.NombreMateria)
                    .Select(tm => new MateriaDto
                    {
                        IdMateria = tm.Materia.IdMateria,
                        NombreMateria = tm.Materia.NombreMateria,
                        Descripcion = tm.Materia.Descripcion,
                        Nivel = tm.Materia.Nivel
                    })
                    .ToList()
            })
            .ToListAsync();

        return Ok(tutores);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<TutorDto>> ObtenerPorId(int id)
    {
        var tutor = await _context.Tutores
            .AsNoTracking()
            .Where(t => t.IdTutor == id)
            .Select(t => new TutorDto
            {
                IdTutor = t.IdTutor,
                IdUsuario = t.IdUsuario,
                Nombre = t.Nombre,
                Apellido = t.Apellido,
                CorreoElectronico = t.Usuario.CorreoElectronico,
                Especialidad = t.Especialidad,
                Experiencia = t.Experiencia,

                Materias = t.TutorMaterias
                    .OrderBy(tm => tm.Materia.NombreMateria)
                    .Select(tm => new MateriaDto
                    {
                        IdMateria = tm.Materia.IdMateria,
                        NombreMateria = tm.Materia.NombreMateria,
                        Descripcion = tm.Materia.Descripcion,
                        Nivel = tm.Materia.Nivel
                    })
                    .ToList()
            })
            .FirstOrDefaultAsync();

        if (tutor is null)
        {
            return NotFound(new
            {
                mensaje = "Tutor no encontrado."
            });
        }

        return Ok(tutor);
    }

    [HttpPost]
    public async Task<ActionResult<TutorDto>> Crear(
        CrearTutorDto dto)
    {
        var correo = dto.CorreoElectronico
            .Trim()
            .ToLowerInvariant();

        var correoExiste = await _context.Usuarios
            .AnyAsync(u => u.CorreoElectronico == correo);

        if (correoExiste)
        {
            return Conflict(new
            {
                mensaje = "El correo electrónico ya está registrado."
            });
        }

        var usuario = new Usuario
        {
            CorreoElectronico = correo,
            Rol = RolesUsuario.Tutor,
            Activo = true
        };

        usuario.PasswordHash =
            _passwordHasher.HashPassword(
                usuario,
                dto.Password);

        var tutor = new Tutor
        {
            Usuario = usuario,
            Nombre = dto.Nombre.Trim(),
            Apellido = dto.Apellido.Trim(),

            Especialidad =
                string.IsNullOrWhiteSpace(dto.Especialidad)
                    ? null
                    : dto.Especialidad.Trim(),

            Experiencia = dto.Experiencia
        };

        _context.Tutores.Add(tutor);

        await _context.SaveChangesAsync();

        var resultado = new TutorDto
        {
            IdTutor = tutor.IdTutor,
            IdUsuario = tutor.IdUsuario,
            Nombre = tutor.Nombre,
            Apellido = tutor.Apellido,
            CorreoElectronico = usuario.CorreoElectronico,
            Especialidad = tutor.Especialidad,
            Experiencia = tutor.Experiencia
        };

        return CreatedAtAction(
            nameof(ObtenerPorId),
            new { id = tutor.IdTutor },
            resultado);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Actualizar(
        int id,
        ActualizarTutorDto dto)
    {
        var tutor = await _context.Tutores
            .FindAsync(id);

        if (tutor is null)
        {
            return NotFound(new
            {
                mensaje = "Tutor no encontrado."
            });
        }

        tutor.Nombre = dto.Nombre.Trim();
        tutor.Apellido = dto.Apellido.Trim();

        tutor.Especialidad =
            string.IsNullOrWhiteSpace(dto.Especialidad)
                ? null
                : dto.Especialidad.Trim();

        tutor.Experiencia = dto.Experiencia;

        await _context.SaveChangesAsync();

        return NoContent();
    }

    [HttpPost("{idTutor:int}/materias/{idMateria:int}")]
    public async Task<IActionResult> AsignarMateria(
        int idTutor,
        int idMateria)
    {
        var tutorExiste = await _context.Tutores
            .AnyAsync(t => t.IdTutor == idTutor);

        if (!tutorExiste)
        {
            return NotFound(new
            {
                mensaje = "Tutor no encontrado."
            });
        }

        var materiaExiste = await _context.Materias
            .AnyAsync(m => m.IdMateria == idMateria);

        if (!materiaExiste)
        {
            return NotFound(new
            {
                mensaje = "Materia no encontrada."
            });
        }

        var asignacionExiste = await _context.TutorMaterias
            .AnyAsync(tm =>
                tm.IdTutor == idTutor &&
                tm.IdMateria == idMateria);

        if (asignacionExiste)
        {
            return Conflict(new
            {
                mensaje = "El tutor ya tiene asignada esta materia."
            });
        }

        var asignacion = new TutorMateria
        {
            IdTutor = idTutor,
            IdMateria = idMateria
        };

        _context.TutorMaterias.Add(asignacion);

        await _context.SaveChangesAsync();

        return NoContent();
    }
}