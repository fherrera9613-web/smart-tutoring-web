using System.ComponentModel.DataAnnotations;

namespace SmartTutoring.Api.Models.DTOs;

public class RegistrarAsistenciaDto
{
    [Required]
    [MaxLength(20)]
    public string EstadoAsistencia { get; set; } = string.Empty;

    [MaxLength(500)]
    public string? Observaciones { get; set; }
}