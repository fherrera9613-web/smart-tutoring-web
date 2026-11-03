using System.ComponentModel.DataAnnotations;

namespace SmartTutoring.Api.Models.Entities;

public class HorarioTutor
{
    [Key]
    public int IdHorario { get; set; }
    public int IdTutor { get; set; }
    public int DiaSemana { get; set; }
    public TimeOnly HoraInicio { get; set; }
    public TimeOnly HoraFin { get; set; }
    public Tutor Tutor { get; set; } = null!;
}
