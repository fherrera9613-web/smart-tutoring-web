namespace SmartTutoring.Api.Models.DTOs;

public class SeguimientoAcademicoDto
{
    public int IdSeguimiento { get; set; }

    public int IdSesion { get; set; }

    public string TemaTrabajado { get; set; } = string.Empty;

    public string Observaciones { get; set; } = string.Empty;
}