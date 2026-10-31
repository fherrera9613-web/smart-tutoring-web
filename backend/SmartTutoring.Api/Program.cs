using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Npgsql;
using SmartTutoring.Api.Data;
using SmartTutoring.Api.Models.Entities;
using SmartTutoring.Api.OpenApi;
using SmartTutoring.Api.Services;

static string NormalizePostgresConnectionString(string connectionString)
{
    if (!Uri.TryCreate(connectionString, UriKind.Absolute, out var uri) ||
        (uri.Scheme != "postgres" && uri.Scheme != "postgresql"))
    {
        return connectionString;
    }

    var userInfo = uri.UserInfo.Split(':', 2);
    if (userInfo.Length != 2 || string.IsNullOrWhiteSpace(uri.Host))
    {
        throw new InvalidOperationException("La URL de conexión PostgreSQL no es válida.");
    }

    var database = Uri.UnescapeDataString(uri.AbsolutePath.TrimStart('/'));
    if (string.IsNullOrWhiteSpace(database))
    {
        throw new InvalidOperationException("La URL de conexión PostgreSQL no contiene una base de datos.");
    }

    var builder = new NpgsqlConnectionStringBuilder
    {
        Host = uri.Host,
        Port = uri.IsDefaultPort ? 5432 : uri.Port,
        Username = Uri.UnescapeDataString(userInfo[0]),
        Password = Uri.UnescapeDataString(userInfo[1]),
        Database = database,
        Pooling = true
    };

    return builder.ConnectionString;
}

var builder = WebApplication.CreateBuilder(args);

// Los secretos de desarrollo se leen desde User Secrets y, en producción,
// desde variables de entorno administradas por la plataforma de despliegue.
var rawConnectionString = builder.Configuration
    .GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException(
        "No se encontró la cadena de conexión DefaultConnection.");

// Render entrega su conexión administrada en formato postgresql://...
// mientras que Npgsql utiliza el formato clave=valor. En desarrollo se
// conserva sin cambios la cadena tradicional de Npgsql.
var connectionString = NormalizePostgresConnectionString(rawConnectionString);

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

var allowedOrigins = new List<string>
{
    "http://localhost:5173",
    "http://localhost:3000"
};

var frontendUrl = builder.Configuration["FrontendUrl"];
if (!string.IsNullOrWhiteSpace(frontendUrl))
{
    if (!Uri.TryCreate(frontendUrl, UriKind.Absolute, out var frontendUri) ||
        (frontendUri.Scheme != Uri.UriSchemeHttp && frontendUri.Scheme != Uri.UriSchemeHttps))
    {
        throw new InvalidOperationException("FrontendUrl no contiene un origen HTTP/HTTPS válido.");
    }

    allowedOrigins.Add(frontendUri.GetLeftPart(UriPartial.Authority).TrimEnd('/'));
}

// CORS queda restringido a los orígenes conocidos del frontend.
builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
    {
        policy
            .WithOrigins(allowedOrigins
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToArray())
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

builder.Services.AddControllers();

// OpenAPI documenta el esquema Bearer y marca únicamente los endpoints
// que requieren autorización para que Swagger UI pueda enviar el JWT.
builder.Services.AddOpenApi(options =>
{
    options.AddDocumentTransformer<BearerSecuritySchemeTransformer>();
    options.AddOperationTransformer<BearerSecurityRequirementTransformer>();
});

var app = builder.Build();

var openApiEnabled = app.Environment.IsDevelopment() ||
    builder.Configuration.GetValue<bool>("OpenApi:Enabled");

if (openApiEnabled)
{
    app.MapOpenApi();

    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/openapi/v1.json", "SMART Tutoring API v1");
        options.DocumentTitle = "SMART Tutoring API";
    });
}

// En desarrollo Kestrel gestiona la redirección configurada localmente.
// En Render, TLS termina en el proxy de borde y la plataforma redirige HTTP a HTTPS.
if (app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

app.UseCors("Frontend");

// El orden es intencional: primero se autentica la identidad y luego se evalúan permisos.
app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/health", () => Results.Ok(new { status = "ok" }));
app.MapControllers();

// Para este despliegue académico de una sola instancia se aplican las migraciones
// pendientes al iniciar. EF Core mantiene el historial y evita reaplicarlas.
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<SmartTutoringDbContext>();
    await db.Database.MigrateAsync();
}

await DatabaseSeeder.SeedAdminAsync(
    app.Services,
    builder.Configuration);

app.Run();
