using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.IdentityModel.Tokens;
using SmartTutoring.Api.Models.Entities;

namespace SmartTutoring.Api.Services;

public class JwtTokenService
{
    private readonly IConfiguration _configuration;

    public JwtTokenService(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public (string Token, DateTime ExpiraEn) GenerarToken(Usuario usuario)
    {
        var keyBase64 = _configuration["Jwt:Key"]
            ?? throw new InvalidOperationException(
                "No se encontró la clave JWT.");

        var issuer = _configuration["Jwt:Issuer"]
            ?? throw new InvalidOperationException(
                "No se encontró el emisor JWT.");

        var audience = _configuration["Jwt:Audience"]
            ?? throw new InvalidOperationException(
                "No se encontró la audiencia JWT.");

        var securityKey = new SymmetricSecurityKey(
            Convert.FromBase64String(keyBase64));

        var credentials = new SigningCredentials(
            securityKey,
            SecurityAlgorithms.HmacSha256);

        var expiration = DateTime.UtcNow.AddHours(2);

        var claims = new[]
        {
            new Claim(
                JwtRegisteredClaimNames.Sub,
                usuario.IdUsuario.ToString()),

            new Claim(
                JwtRegisteredClaimNames.Email,
                usuario.CorreoElectronico),

            new Claim(
                ClaimTypes.Role,
                usuario.Rol),

            new Claim(
                JwtRegisteredClaimNames.Jti,
                Guid.NewGuid().ToString())
        };

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            expires: expiration,
            signingCredentials: credentials);

        return (
            new JwtSecurityTokenHandler().WriteToken(token),
            expiration
        );
    }
}