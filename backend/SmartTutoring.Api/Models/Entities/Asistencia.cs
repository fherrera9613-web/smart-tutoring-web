using System.ComponentModel.DataAnnotations;

namespace SmartTutoring.Api.Models.Entities;

public class Asistencia
{
    [Key]
    public int IdAsistencia { get; set; }

    [Required]
    public int IdSesion { get; set; }

    [Required]
    [MaxLength(20)]
    public string EstadoAsistencia { get; set; } = string.Empty;

    [MaxLength(500)]
    public string? Observaciones { get; set; }

    public SesionTutoria Sesion { get; set; } = null!;
}