namespace SmartTutoring.Api.Models.DTOs;

public class PagoDto
{
    public int IdPago { get; set; }

    public int IdEstudiante { get; set; }

    public string NombreEstudiante { get; set; } = string.Empty;

    public decimal Monto { get; set; }

    public DateOnly FechaPago { get; set; }

    public string? Concepto { get; set; }

    public string? Observaciones { get; set; }
}