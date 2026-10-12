using System.ComponentModel.DataAnnotations;

namespace SmartTutoring.Api.Models.Entities;

public class Usuario
{
    [Key]
    public int IdUsuario { get; set; }

    [Required]
    [EmailAddress]
    [MaxLength(150)]
    public string CorreoElectronico { get; set; } = string.Empty;

    [Required]
    [MaxLength(500)]
    public string PasswordHash { get; set; } = string.Empty;

    [Required]
    [MaxLength(30)]
    public string Rol { get; set; } = string.Empty;

    public bool Activo { get; set; } = true;

    public DateTimeOffset FechaRegistro { get; set; } = DateTimeOffset.UtcNow;
}