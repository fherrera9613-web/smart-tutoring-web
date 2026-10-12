using System.ComponentModel.DataAnnotations;

namespace SmartTutoring.Api.Models.DTOs;

public class ActualizarMateriaDto
{
    [Required]
    [MaxLength(120)]
    public string NombreMateria { get; set; } = string.Empty;

    [MaxLength(300)]
    public string? Descripcion { get; set; }

    [MaxLength(50)]
    public string? Nivel { get; set; }
}