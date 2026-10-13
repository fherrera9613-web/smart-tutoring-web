namespace SmartTutoring.Api.Models.DTOs;

public class UsuarioDto
{
    public int IdUsuario { get; set; }

    public string CorreoElectronico { get; set; } = string.Empty;

    public string Rol { get; set; } = string.Empty;

    public bool Activo { get; set; }

    public DateTimeOffset FechaRegistro { get; set; }
}