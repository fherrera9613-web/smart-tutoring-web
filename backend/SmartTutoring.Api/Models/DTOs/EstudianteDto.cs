namespace SmartTutoring.Api.Models.DTOs;

public class EstudianteDto
{
    public int IdEstudiante { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string Apellido { get; set; } = string.Empty;
    public DateOnly FechaNacimiento { get; set; }
    public string Carnet { get; set; } = string.Empty;
    public string? Telefono { get; set; }
}