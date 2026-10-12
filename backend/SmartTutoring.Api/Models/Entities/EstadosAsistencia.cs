namespace SmartTutoring.Api.Models.Entities;

public static class EstadosAsistencia
{
    public const string Presente = "Presente";
    public const string Ausente = "Ausente";

    public static readonly string[] Todos =
    [
        Presente,
        Ausente
    ];
}