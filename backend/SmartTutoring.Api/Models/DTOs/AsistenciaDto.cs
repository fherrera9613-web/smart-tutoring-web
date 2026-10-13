namespace SmartTutoring.Api.Models.DTOs;

public class AsistenciaDto
{
    public int IdAsistencia { get; set; }

    public int IdSesion { get; set; }

    public string EstadoAsistencia { get; set; } = string.Empty;

    public string? Observaciones { get; set; }
}