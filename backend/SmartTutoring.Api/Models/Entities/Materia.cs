using System.ComponentModel.DataAnnotations;

namespace SmartTutoring.Api.Models.Entities;

public class Materia
{
    [Key]
    public int IdMateria { get; set; }

    [Required]
    [MaxLength(120)]
    public string NombreMateria { get; set; } = string.Empty;

    [MaxLength(300)]
    public string? Descripcion { get; set; }

    [MaxLength(50)]
    public string? Nivel { get; set; }

    public ICollection<TutorMateria> TutorMaterias { get; set; }
        = new List<TutorMateria>();
}