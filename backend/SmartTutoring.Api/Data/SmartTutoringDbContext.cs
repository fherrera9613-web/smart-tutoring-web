using Microsoft.EntityFrameworkCore;
using SmartTutoring.Api.Models.Entities;

namespace SmartTutoring.Api.Data;

public class SmartTutoringDbContext : DbContext
{
    public SmartTutoringDbContext(
        DbContextOptions<SmartTutoringDbContext> options)
        : base(options)
    {
    }

    public DbSet<Estudiante> Estudiantes => Set<Estudiante>();
    public DbSet<Usuario> Usuarios => Set<Usuario>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Estudiante>()
            .HasIndex(e => e.Carnet)
            .IsUnique();

        modelBuilder.Entity<Usuario>()
            .HasIndex(u => u.CorreoElectronico)
            .IsUnique();
    }
}
