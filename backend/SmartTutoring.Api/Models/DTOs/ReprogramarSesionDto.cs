using System.ComponentModel.DataAnnotations;

namespace SmartTutoring.Api.Models.DTOs;

public class ReprogramarSesionDto
{
    [Required]
    public DateOnly? Fecha { get; set; }

    [Required]
    public TimeOnly? HoraInicio { get; set; }

    [Required]
    public TimeOnly? HoraFin { get; set; }
}