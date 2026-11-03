using System.ComponentModel.DataAnnotations;

namespace SmartTutoring.Api.Models.Entities;

public class BloqueoTutor
{
    [Key]
    public int IdBloqueo { get; set; }
    public int IdTutor { get; set; }
    public DateOnly Fecha { get; set; }
    public TimeOnly HoraInicio { get; set; }
    public TimeOnly HoraFin { get; set; }
    [MaxLength(150)]
    public string? Motivo { get; set; }
    public Tutor Tutor { get; set; } = null!;
}
