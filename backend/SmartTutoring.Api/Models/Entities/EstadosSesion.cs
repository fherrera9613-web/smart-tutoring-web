namespace SmartTutoring.Api.Models.Entities;

public static class EstadosSesion
{
    public const string Programada = "Programada";
    public const string Completada = "Completada";
    public const string Cancelada = "Cancelada";

    public static readonly string[] Todos =
    [
        Programada,
        Completada,
        Cancelada
    ];
}