using System.ComponentModel.DataAnnotations;

namespace SmartTutoring.Api.Models.DTOs;

public class ActualizarEstudianteDto
{
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