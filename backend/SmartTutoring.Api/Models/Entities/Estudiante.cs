using System.ComponentModel.DataAnnotations;

namespace SmartTutoring.Api.Models.Entities;

public class Estudiante
{
    [Key]
    public int IdEstudiante { get; set; }

    [Required]
    [MaxLength(100)]
    public string Nombre { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    public string Apellido { get; set; } = string.Empty;

    [Required]
    public DateOnly FechaNacimiento { get; set; }

    [Required]
    [MaxLength(50)]
    public string Carnet { get; set; } = string.Empty;

    [MaxLength(20)]
    public string? Telefono { get; set; }
}