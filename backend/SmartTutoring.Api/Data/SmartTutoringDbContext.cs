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
    public DbSet<Tutor> Tutores => Set<Tutor>();
    public DbSet<Materia> Materias => Set<Materia>();
    public DbSet<TutorMateria> TutorMaterias => Set<TutorMateria>();
    public DbSet<SesionTutoria> SesionesTutoria => Set<SesionTutoria>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Estudiantes
        modelBuilder.Entity<Estudiante>()
            .HasIndex(e => e.Carnet)
            .IsUnique();

        // Usuarios
        modelBuilder.Entity<Usuario>()
            .HasIndex(u => u.CorreoElectronico)
            .IsUnique();

        // Tutor - Usuario
        modelBuilder.Entity<Tutor>()
            .HasIndex(t => t.IdUsuario)
            .IsUnique();

        modelBuilder.Entity<Tutor>()
            .HasOne(t => t.Usuario)
            .WithOne()
            .HasForeignKey<Tutor>(t => t.IdUsuario)
            .OnDelete(DeleteBehavior.Restrict);

        // Tutor - Materia
        modelBuilder.Entity<TutorMateria>()
            .HasKey(tm => new
            {
                tm.IdTutor,
                tm.IdMateria
            });

        modelBuilder.Entity<TutorMateria>()
            .HasOne(tm => tm.Tutor)
            .WithMany(t => t.TutorMaterias)
            .HasForeignKey(tm => tm.IdTutor)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<TutorMateria>()
            .HasOne(tm => tm.Materia)
            .WithMany(m => m.TutorMaterias)
            .HasForeignKey(tm => tm.IdMateria)
            .OnDelete(DeleteBehavior.Restrict);

        // Sesion - Estudiante
        modelBuilder.Entity<SesionTutoria>()
            .HasOne(s => s.Estudiante)
            .WithMany()
            .HasForeignKey(s => s.IdEstudiante)
            .OnDelete(DeleteBehavior.Restrict);

        // Sesion - Tutor
        modelBuilder.Entity<SesionTutoria>()
            .HasOne(s => s.Tutor)
            .WithMany()
            .HasForeignKey(s => s.IdTutor)
            .OnDelete(DeleteBehavior.Restrict);

        // Sesion - Materia
        modelBuilder.Entity<SesionTutoria>()
            .HasOne(s => s.Materia)
            .WithMany()
            .HasForeignKey(s => s.IdMateria)
            .OnDelete(DeleteBehavior.Restrict);

        // Índice utilizado para comprobar disponibilidad del tutor
        modelBuilder.Entity<SesionTutoria>()
            .HasIndex(s => new
            {
                s.IdTutor,
                s.Fecha
            });

        // Restricciones de integridad de Sesiones
        modelBuilder.Entity<SesionTutoria>()
            .ToTable(table =>
            {
                table.HasCheckConstraint(
                    "CK_SesionesTutoria_HorarioValido",
                    "\"HoraFin\" > \"HoraInicio\"");

                table.HasCheckConstraint(
                    "CK_SesionesTutoria_EstadoValido",
                    "\"Estado\" IN ('Programada', 'Completada', 'Cancelada')");
            });
    }
}