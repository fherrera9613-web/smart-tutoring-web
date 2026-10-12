namespace SmartTutoring.Api.Models.DTOs;

public class SesionDto
{
    public int IdSesion { get; set; }

    public int IdEstudiante { get; set; }
    public string NombreEstudiante { get; set; } = string.Empty;

    public int IdTutor { get; set; }
    public string NombreTutor { get; set; } = string.Empty;

    public int IdMateria { get; set; }
    public string NombreMateria { get; set; } = string.Empty;

    public DateOnly Fecha { get; set; }
    public TimeOnly HoraInicio { get; set; }
    public TimeOnly HoraFin { get; set; }

    public string Estado { get; set; } = string.Empty;
}