using System.ComponentModel.DataAnnotations;

namespace SmartTutoring.Api.Models.DTOs;

public class ActualizarTutorDto
{
    [Required]
    [MaxLength(100)]
    public string Nombre { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    public string Apellido { get; set; } = string.Empty;

    [MaxLength(150)]
    public string? Especialidad { get; set; }

    [Range(0, int.MaxValue)]
    public int? Experiencia { get; set; }
}