namespace SmartTutoring.Api.Models.DTOs;

public class PagoDto
{
    public int IdPago { get; set; }
    public int IdEstudiante { get; set; }
    public string NombreEstudiante { get; set; } = string.Empty;
    public int? IdSesion { get; set; }
    public string? NombreMateria { get; set; }
    public string? NombreTutor { get; set; }
    public DateOnly? FechaSesion { get; set; }
    public int? Minutos { get; set; }
    public decimal Monto { get; set; }
    public DateOnly FechaPago { get; set; }
    public string MetodoPago { get; set; } = string.Empty;
    public string? Concepto { get; set; }
    public string? Observaciones { get; set; }
}
