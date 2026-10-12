namespace SmartTutoring.Api.Models.DTOs;

public class MateriaDto
{
    public int IdMateria { get; set; }
    public string NombreMateria { get; set; } = string.Empty;
    public string? Descripcion { get; set; }
    public string? Nivel { get; set; }
}