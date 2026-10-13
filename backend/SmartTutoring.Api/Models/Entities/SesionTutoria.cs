using System.ComponentModel.DataAnnotations;

namespace SmartTutoring.Api.Models.Entities;

public class SesionTutoria
{
    [Key]
    public int IdSesion { get; set; }

    [Required]
    public int IdEstudiante { get; set; }

    [Required]
    public int IdTutor { get; set; }

    [Required]
    public int IdMateria { get; set; }

    [Required]
    public DateOnly Fecha { get; set; }

    [Required]
    public TimeOnly HoraInicio { get; set; }

    [Required]
    public TimeOnly HoraFin { get; set; }

    [Required]
    [MaxLength(20)]
    public string Estado { get; set; } = EstadosSesion.Programada;

    public Estudiante Estudiante { get; set; } = null!;
    public Tutor Tutor { get; set; } = null!;
    public Materia Materia { get; set; } = null!;
}