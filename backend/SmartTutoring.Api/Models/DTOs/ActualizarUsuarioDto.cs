using System.ComponentModel.DataAnnotations;

namespace SmartTutoring.Api.Models.DTOs;

public class ActualizarUsuarioDto
{
    [Required]
    [EmailAddress]
    [MaxLength(150)]
    public string CorreoElectronico { get; set; } = string.Empty;

    [Required]
    [MaxLength(30)]
    public string Rol { get; set; } = string.Empty;
}