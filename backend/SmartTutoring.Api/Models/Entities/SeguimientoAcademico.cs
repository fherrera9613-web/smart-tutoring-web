using System.ComponentModel.DataAnnotations;

namespace SmartTutoring.Api.Models.Entities;

public class SeguimientoAcademico
{
    [Key]
    public int IdSeguimiento { get; set; }

    [Required]
    public int IdSesion { get; set; }

    [Required]
    [MaxLength(200)]
    public string TemaTrabajado { get; set; } = string.Empty;

    [Required]
    [MaxLength(1000)]
    public string Observaciones { get; set; } = string.Empty;

    public SesionTutoria Sesion { get; set; } = null!;
}