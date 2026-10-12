namespace SmartTutoring.Api.Models.DTOs;

public class TutorDto
{
    public int IdTutor { get; set; }
    public int IdUsuario { get; set; }

    public string Nombre { get; set; } = string.Empty;
    public string Apellido { get; set; } = string.Empty;
    public string CorreoElectronico { get; set; } = string.Empty;

    public string? Especialidad { get; set; }
    public int? Experiencia { get; set; }

    public List<MateriaDto> Materias { get; set; } = [];
}