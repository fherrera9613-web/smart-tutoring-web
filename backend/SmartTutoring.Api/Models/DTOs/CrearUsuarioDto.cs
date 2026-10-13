using System.ComponentModel.DataAnnotations;

namespace SmartTutoring.Api.Models.DTOs;

public class CrearUsuarioDto
{
    [Required]
    [EmailAddress]
    [MaxLength(150)]
    public string CorreoElectronico { get; set; } = string.Empty;

    [Required]
    [MinLength(8)]
    [MaxLength(100)]
    public string Password { get; set; } = string.Empty;

    [Required]
    [MaxLength(30)]
    public string Rol { get; set; } = string.Empty;
}