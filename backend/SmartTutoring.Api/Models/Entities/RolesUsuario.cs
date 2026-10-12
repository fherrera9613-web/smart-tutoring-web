namespace SmartTutoring.Api.Models.Entities;

public static class RolesUsuario
{
    public const string Administrador = "Administrador";
    public const string PersonalAdministrativo = "PersonalAdministrativo";
    public const string Tutor = "Tutor";

    public static readonly string[] Todos =
    [
        Administrador,
        PersonalAdministrativo,
        Tutor
    ];
}