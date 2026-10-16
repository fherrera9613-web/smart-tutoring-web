using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using SmartTutoring.Api.Data;
using SmartTutoring.Api.Models.Entities;
using SmartTutoring.Api.Services;

var builder = WebApplication.CreateBuilder(args);

// Los secretos de desarrollo se leen desde la configuración (User Secrets en local)
// para evitar almacenar credenciales o claves JWT dentro del repositorio.
var connectionString = builder.Configuration
    .GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException(
        "No se encontró la cadena de conexión DefaultConnection.");

var jwtKeyBase64 = builder.Configuration["Jwt:Key"]
    ?? throw new InvalidOperationException(
        "No se encontró la configuración Jwt:Key.");

var jwtIssuer = builder.Configuration["Jwt:Issuer"]
    ?? throw new InvalidOperationException(
        "No se encontró la configuración Jwt:Issuer.");

var jwtAudience = builder.Configuration["Jwt:Audience"]
    ?? throw new InvalidOperationException(
        "No se encontró la configuración Jwt:Audience.");

var jwtKey = Convert.FromBase64String(jwtKeyBase64);

// EF Core usa Npgsql como proveedor para traducir las operaciones del DbContext
// a consultas compatibles con PostgreSQL.
builder.Services.AddDbContext<SmartTutoringDbContext>(options =>
    options.UseNpgsql(connectionString));

builder.Services.AddScoped<
    IPasswordHasher<Usuario>,
    PasswordHasher<Usuario>>();

builder.Services.AddScoped<JwtTokenService>();

// La autenticación JWT valida firma, emisor, audiencia y expiración.
// ClockSkew = 0 evita aceptar tokens más allá de su vencimiento configurado.
builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters =
            new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidateAudience = true,
                ValidateLifetime = true,
                ValidateIssuerSigningKey = true,

                ValidIssuer = jwtIssuer,
                ValidAudience = jwtAudience,

                IssuerSigningKey =
                    new SymmetricSecurityKey(jwtKey),

                ClockSkew = TimeSpan.Zero
            };
    });

builder.Services.AddAuthorization();

// CORS permite únicamente los orígenes de desarrollo conocidos del frontend.
// No sustituye la autenticación ni la autorización por roles.
builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
    {
        policy
            .WithOrigins(
                "http://localhost:5173",
                "http://localhost:3000")
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

builder.Services.AddControllers();
builder.Services.AddOpenApi();

var app = builder.Build();

// OpenAPI y Swagger UI se habilitan solo en desarrollo para documentar y probar la API.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();

    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/openapi/v1.json", "SMART Tutoring API v1");
        options.DocumentTitle = "SMART Tutoring API";
    });
}

app.UseHttpsRedirection();

app.UseCors("Frontend");

// El orden es intencional: primero se autentica la identidad y luego se evalúan permisos.
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// En desarrollo se garantiza la existencia del usuario administrador inicial.
await DatabaseSeeder.SeedAdminAsync(
    app.Services,
    builder.Configuration);

app.Run();