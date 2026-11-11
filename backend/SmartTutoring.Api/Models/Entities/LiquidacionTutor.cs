using System.ComponentModel.DataAnnotations;

namespace SmartTutoring.Api.Models.Entities;

public class LiquidacionTutor
{
    [Key] public int IdLiquidacion { get; set; }
    [Required] public int IdSesion { get; set; }
    [Required] public decimal MontoNio { get; set; }
    [Required] [MaxLength(25)] public string Estado { get; set; } = "Pendiente";
    [Required] public DateOnly FechaRegistro { get; set; }
    public DateOnly? FechaAprobacion { get; set; }
    public DateOnly? FechaPago { get; set; }
    [MaxLength(500)] public string? Observaciones { get; set; }
    public SesionTutoria Sesion { get; set; } = null!;
}
