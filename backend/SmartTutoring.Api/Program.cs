using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using SmartTutoring.Api.Data;
using SmartTutoring.Api.Models.Entities;
using SmartTutoring.Api.Services;

var builder = WebApplication.CreateBuilder(args);

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

builder.Services.AddDbContext<SmartTutoringDbContext>(options =>
    options.UseNpgsql(connectionString));

builder.Services.AddScoped<
    IPasswordHasher<Usuario>,
    PasswordHasher<Usuario>>();

builder.Services.AddScoped<JwtTokenService>();

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

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

await DatabaseSeeder.SeedAdminAsync(
    app.Services,
    builder.Configuration);

app.Run();