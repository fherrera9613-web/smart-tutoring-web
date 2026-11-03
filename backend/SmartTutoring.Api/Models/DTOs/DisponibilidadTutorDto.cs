using System.ComponentModel.DataAnnotations;

namespace SmartTutoring.Api.Models.DTOs;

public class HorarioTutorDto
{
    [Range(0, 6)]
    public int DiaSemana { get; set; }

    public TimeOnly HoraInicio { get; set; }
    public TimeOnly HoraFin { get; set; }
}

public class ActualizarHorariosTutorDto
{
    [Required]
    public List<HorarioTutorDto> Horarios { get; set; } = [];
}

public class CrearBloqueoTutorDto
{
    [Required]
    public DateOnly? Fecha { get; set; }

    [Required]
    public TimeOnly? HoraInicio { get; set; }

    [Required]
    public TimeOnly? HoraFin { get; set; }

    [MaxLength(150)]
    public string? Motivo { get; set; }
}
