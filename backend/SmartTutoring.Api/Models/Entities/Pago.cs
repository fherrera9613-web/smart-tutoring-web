using System.ComponentModel.DataAnnotations;

namespace SmartTutoring.Api.Models.Entities;

public class Pago
{
    [Key]
    public int IdPago { get; set; }

    [Required]
    public int IdEstudiante { get; set; }

    public int? IdSesion { get; set; }

    [Required]
    public decimal Monto { get; set; }

    [Required]
    public DateOnly FechaPago { get; set; }

    [Required]
    [MaxLength(30)]
    public string MetodoPago { get; set; } = "Efectivo";

    [MaxLength(150)]
    public string? Concepto { get; set; }

    [MaxLength(500)]
    public string? Observaciones { get; set; }

    public Estudiante Estudiante { get; set; } = null!;
    public SesionTutoria? Sesion { get; set; }
}
