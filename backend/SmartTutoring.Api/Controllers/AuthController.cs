using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartTutoring.Api.Data;
using SmartTutoring.Api.Models.DTOs;
using SmartTutoring.Api.Models.Entities;
using SmartTutoring.Api.Services;

namespace SmartTutoring.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly SmartTutoringDbContext _context;
    private readonly IPasswordHasher<Usuario> _passwordHasher;
    private readonly JwtTokenService _jwtTokenService;

    public AuthController(
        SmartTutoringDbContext context,
        IPasswordHasher<Usuario> passwordHasher,
        JwtTokenService jwtTokenService)
    {
        _context = context;
        _passwordHasher = passwordHasher;
        _jwtTokenService = jwtTokenService;
    }

    [HttpPost("login")]
    public async Task<ActionResult<LoginResponseDto>> Login(
        LoginRequestDto dto)
    {
        var correo = dto.CorreoElectronico
            .Trim()
            .ToLowerInvariant();

        var usuario = await _context.Usuarios
            .FirstOrDefaultAsync(
                u => u.CorreoElectronico == correo);

        if (usuario is null || !usuario.Activo)
        {
            return Unauthorized(new
            {
                mensaje = "Credenciales inválidas."
            });
        }

        var resultado = _passwordHasher.VerifyHashedPassword(
            usuario,
            usuario.PasswordHash,
            dto.Password);

        if (resultado == PasswordVerificationResult.Failed)
        {
            return Unauthorized(new
            {
                mensaje = "Credenciales inválidas."
            });
        }

        var (token, expiraEn) =
            _jwtTokenService.GenerarToken(usuario);

        return Ok(new LoginResponseDto
        {
            Token = token,
            ExpiraEn = expiraEn,
            CorreoElectronico = usuario.CorreoElectronico,
            Rol = usuario.Rol
        });
    }
}