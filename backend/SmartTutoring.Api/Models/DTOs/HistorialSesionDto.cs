namespace SmartTutoring.Api.Models.DTOs;

public class HistorialSesionDto
{
    public int IdSesion { get; set; }

    public DateOnly Fecha { get; set; }

    public TimeOnly HoraInicio { get; set; }

    public TimeOnly HoraFin { get; set; }

    public string EstadoSesion { get; set; } = string.Empty;

    public int IdTutor { get; set; }

    public string NombreTutor { get; set; } = string.Empty;

    public int IdMateria { get; set; }

    public string NombreMateria { get; set; } = string.Empty;

    public string? EstadoAsistencia { get; set; }

    public string? ObservacionesAsistencia { get; set; }

    public string? TemaTrabajado { get; set; }

    public string? ObservacionesAcademicas { get; set; }
}