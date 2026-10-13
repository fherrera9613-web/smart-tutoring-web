namespace SmartTutoring.Api.Models.DTOs;

public class HistorialAcademicoDto
{
    public int IdEstudiante { get; set; }

    public string NombreEstudiante { get; set; } = string.Empty;

    public string Carnet { get; set; } = string.Empty;

    public List<HistorialSesionDto> Sesiones { get; set; } = [];
}