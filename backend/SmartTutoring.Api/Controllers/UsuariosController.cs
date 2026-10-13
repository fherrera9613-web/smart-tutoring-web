using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartTutoring.Api.Data;
using SmartTutoring.Api.Models.DTOs;
using SmartTutoring.Api.Models.Entities;

namespace SmartTutoring.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = RolesUsuario.Administrador)]
public class UsuariosController : ControllerBase
{
    private readonly SmartTutoringDbContext _context;
    private readonly IPasswordHasher<Usuario> _passwordHasher;

    public UsuariosController(
        SmartTutoringDbContext context,
        IPasswordHasher<Usuario> passwordHasher)
    {
        _context = context;
        _passwordHasher = passwordHasher;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<UsuarioDto>>> ObtenerTodos()
    {
        var usuarios = await _context.Usuarios
            .AsNoTracking()
            .OrderBy(u => u.IdUsuario)
            .Select(u => new UsuarioDto
            {
                IdUsuario = u.IdUsuario,
                CorreoElectronico = u.CorreoElectronico,
                Rol = u.Rol,
                Activo = u.Activo,
                FechaRegistro = u.FechaRegistro
            })
            .ToListAsync();

        return Ok(usuarios);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<UsuarioDto>> ObtenerPorId(int id)
    {
        var usuario = await _context.Usuarios
            .AsNoTracking()
            .Where(u => u.IdUsuario == id)
            .Select(u => new UsuarioDto
            {
                IdUsuario = u.IdUsuario,
                CorreoElectronico = u.CorreoElectronico,
                Rol = u.Rol,
                Activo = u.Activo,
                FechaRegistro = u.FechaRegistro
            })
            .FirstOrDefaultAsync();

        if (usuario is null)
        {
            return NotFound(new
            {
                mensaje = "Usuario no encontrado."
            });
        }

        return Ok(usuario);
    }

    [HttpPost]
    public async Task<ActionResult<UsuarioDto>> Crear(
        CrearUsuarioDto dto)
    {
        var correo = dto.CorreoElectronico
            .Trim()
            .ToLowerInvariant();

        var rol = NormalizarRol(dto.Rol);

        if (rol is null)
        {
            return BadRequest(new
            {
                mensaje =
                    "El rol debe ser Administrador o PersonalAdministrativo."
            });
        }

        var correoExiste = await _context.Usuarios
            .AnyAsync(u =>
                u.CorreoElectronico.ToLower() == correo);

        if (correoExiste)
        {
            return Conflict(new
            {
                mensaje =
                    "Ya existe un usuario con ese correo electrónico."
            });
        }

        var usuario = new Usuario
        {
            CorreoElectronico = correo,
            Rol = rol,
            Activo = true,
            FechaRegistro = DateTimeOffset.UtcNow
        };

        usuario.PasswordHash =
            _passwordHasher.HashPassword(
                usuario,
                dto.Password);

        _context.Usuarios.Add(usuario);

        await _context.SaveChangesAsync();

        var resultado = new UsuarioDto
        {
            IdUsuario = usuario.IdUsuario,
            CorreoElectronico = usuario.CorreoElectronico,
            Rol = usuario.Rol,
            Activo = usuario.Activo,
            FechaRegistro = usuario.FechaRegistro
        };

        return CreatedAtAction(
            nameof(ObtenerPorId),
            new { id = usuario.IdUsuario },
            resultado);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Actualizar(
    int id,
    ActualizarUsuarioDto dto)
    {
        var usuario = await _context.Usuarios
            .FirstOrDefaultAsync(u => u.IdUsuario == id);

        if (usuario is null)
        {
            return NotFound(new
            {
                mensaje = "Usuario no encontrado."
            });
        }

        var correo = dto.CorreoElectronico
            .Trim()
            .ToLowerInvariant();

        var rolSolicitado = NormalizarRolIncluyendoTutor(dto.Rol);

        if (rolSolicitado is null)
        {
            return BadRequest(new
            {
                mensaje = "Rol de usuario no válido."
            });
        }

        var correoExiste = await _context.Usuarios
            .AnyAsync(u =>
                u.IdUsuario != id &&
                u.CorreoElectronico.ToLower() == correo);

        if (correoExiste)
        {
            return Conflict(new
            {
                mensaje =
                    "Ya existe otro usuario con ese correo electrónico."
            });
        }

        var idUsuarioActual = ObtenerIdUsuarioActual();

        if (idUsuarioActual == id &&
            rolSolicitado != RolesUsuario.Administrador)
        {
            return Conflict(new
            {
                mensaje =
                    "No puede modificar su propio rol de Administrador."
            });
        }

        var estaVinculadoComoTutor = await _context.Tutores
            .AnyAsync(t => t.IdUsuario == id);

        if (estaVinculadoComoTutor &&
            rolSolicitado != RolesUsuario.Tutor)
        {
            return Conflict(new
            {
                mensaje =
                    "El rol de un usuario vinculado a un tutor no puede modificarse."
            });
        }

        if (!estaVinculadoComoTutor &&
            rolSolicitado == RolesUsuario.Tutor)
        {
            return Conflict(new
            {
                mensaje =
                    "Los usuarios Tutor deben registrarse mediante el módulo de Tutores."
            });
        }

        usuario.CorreoElectronico = correo;
        usuario.Rol = rolSolicitado;

        await _context.SaveChangesAsync();

        return NoContent();
    }

    [HttpPatch("{id:int}/desactivar")]
    public async Task<IActionResult> Desactivar(int id)
    {
        var usuario = await _context.Usuarios
            .FirstOrDefaultAsync(u => u.IdUsuario == id);

        if (usuario is null)
        {
            return NotFound(new
            {
                mensaje = "Usuario no encontrado."
            });
        }

        var idUsuarioActual = ObtenerIdUsuarioActual();

        if (idUsuarioActual == id)
        {
            return Conflict(new
            {
                mensaje =
                    "No puede desactivar su propio usuario mientras está autenticado."
            });
        }

        if (!usuario.Activo)
        {
            return NoContent();
        }

        usuario.Activo = false;

        await _context.SaveChangesAsync();

        return NoContent();
    }

    private static string? NormalizarRol(string rol)
    {
        var valor = rol.Trim();

        if (string.Equals(
                valor,
                RolesUsuario.Administrador,
                StringComparison.OrdinalIgnoreCase))
        {
            return RolesUsuario.Administrador;
        }

        if (string.Equals(
                valor,
                RolesUsuario.PersonalAdministrativo,
                StringComparison.OrdinalIgnoreCase))
        {
            return RolesUsuario.PersonalAdministrativo;
        }

        return null;
    }

    private static string? NormalizarRolIncluyendoTutor(string rol)
    {
        var rolNormalizado = NormalizarRol(rol);

        if (rolNormalizado is not null)
        {
            return rolNormalizado;
        }

        if (string.Equals(
                rol.Trim(),
                RolesUsuario.Tutor,
                StringComparison.OrdinalIgnoreCase))
        {
            return RolesUsuario.Tutor;
        }

        return null;
    }

    private int? ObtenerIdUsuarioActual()
    {
        var claimId =
            User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue(
                JwtRegisteredClaimNames.Sub);

        return int.TryParse(
            claimId,
            out var idUsuario)
                ? idUsuario
                : null;
    }
}