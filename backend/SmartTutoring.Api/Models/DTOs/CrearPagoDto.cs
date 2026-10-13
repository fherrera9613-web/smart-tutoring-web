using System.ComponentModel.DataAnnotations;

namespace SmartTutoring.Api.Models.DTOs;

public class CrearPagoDto
{
    [Range(1, int.MaxValue)]
    public int IdEstudiante { get; set; }

    public decimal Monto { get; set; }

    [Required]
    public DateOnly? FechaPago { get; set; }

    [MaxLength(150)]
    public string? Concepto { get; set; }

    [MaxLength(500)]
    public string? Observaciones { get; set; }
}