namespace SmartTutoring.Api.Models.Entities;

public class TutorMateria
{
    public int IdTutor { get; set; }
    public int IdMateria { get; set; }

    public Tutor Tutor { get; set; } = null!;
    public Materia Materia { get; set; } = null!;
}