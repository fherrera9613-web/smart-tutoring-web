using System.ComponentModel.DataAnnotations;

namespace SmartTutoring.Api.Models.DTOs;

public class CrearSesionDto
{
    [Range(1, int.MaxValue)]
    public int IdEstudiante { get; set; }

    [Range(1, int.MaxValue)]
    public int IdTutor { get; set; }

    [Range(1, int.MaxValue)]
    public int IdMateria { get; set; }

    [Required]
    public DateOnly? Fecha { get; set; }

    [Required]
    public TimeOnly? HoraInicio { get; set; }

    [Required]
    public TimeOnly? HoraFin { get; set; }
}