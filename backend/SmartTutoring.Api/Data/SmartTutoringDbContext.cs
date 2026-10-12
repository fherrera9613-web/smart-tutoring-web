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

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Estudiante>()
            .HasIndex(e => e.Carnet)
            .IsUnique();

        modelBuilder.Entity<Usuario>()
            .HasIndex(u => u.CorreoElectronico)
            .IsUnique();

        modelBuilder.Entity<Tutor>()
            .HasIndex(t => t.IdUsuario)
            .IsUnique();

        modelBuilder.Entity<Tutor>()
            .HasOne(t => t.Usuario)
            .WithOne()
            .HasForeignKey<Tutor>(t => t.IdUsuario)
            .OnDelete(DeleteBehavior.Restrict);

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
    }
}