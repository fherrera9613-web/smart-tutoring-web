using System.ComponentModel.DataAnnotations;

namespace SmartTutoring.Api.Models.DTOs;

public class CrearPagoDto
{
    [Range(1, int.MaxValue)]
    public int IdSesion { get; set; }

    [Required]
    public DateOnly? FechaPago { get; set; }

    [Required]
    [MaxLength(30)]
    public string MetodoPago { get; set; } = string.Empty;

    [MaxLength(500)]
    public string? Observaciones { get; set; }
}
