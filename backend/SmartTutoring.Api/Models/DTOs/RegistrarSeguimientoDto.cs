using System.ComponentModel.DataAnnotations;

namespace SmartTutoring.Api.Models.DTOs;

public class RegistrarSeguimientoDto
{
    [Required]
    [MaxLength(200)]
    public string TemaTrabajado { get; set; } = string.Empty;

    [Required]
    [MaxLength(1000)]
    public string Observaciones { get; set; } = string.Empty;
}