using System.ComponentModel.DataAnnotations;

namespace SmartTutoring.Api.Models.Entities;

public class Tutor
{
    [Key]
    public int IdTutor { get; set; }

    [Required]
    public int IdUsuario { get; set; }

    [Required]
    [MaxLength(100)]
    public string Nombre { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    public string Apellido { get; set; } = string.Empty;

    [MaxLength(150)]
    public string? Especialidad { get; set; }

    public int? Experiencia { get; set; }

    public Usuario Usuario { get; set; } = null!;
    public ICollection<TutorMateria> TutorMaterias { get; set; }
        = new List<TutorMateria>();
}