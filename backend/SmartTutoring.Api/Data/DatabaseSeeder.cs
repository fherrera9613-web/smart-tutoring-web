using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using SmartTutoring.Api.Models.Entities;

namespace SmartTutoring.Api.Data;

public static class DatabaseSeeder
{
    public static async Task SeedAdminAsync(
        IServiceProvider services,
        IConfiguration configuration)
    {
        using var scope = services.CreateScope();

        var context = scope.ServiceProvider
            .GetRequiredService<SmartTutoringDbContext>();

        var passwordHasher = scope.ServiceProvider
            .GetRequiredService<IPasswordHasher<Usuario>>();

        var email = configuration["SeedAdmin:Email"];
        var password = configuration["SeedAdmin:Password"];

        if (string.IsNullOrWhiteSpace(email) ||
            string.IsNullOrWhiteSpace(password))
        {
            return;
        }

        email = email.Trim().ToLowerInvariant();

        var existe = await context.Usuarios
            .AnyAsync(u => u.CorreoElectronico == email);

        if (existe)
        {
            return;
        }

        var usuario = new Usuario
        {
            CorreoElectronico = email,
            Rol = RolesUsuario.Administrador,
            Activo = true
        };

        usuario.PasswordHash =
            passwordHasher.HashPassword(usuario, password);

        context.Usuarios.Add(usuario);
        await context.SaveChangesAsync();
    }
}