using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using KarriarAPI.Models;

namespace KarriarAPI.Data
{
    public class AppDbContext : IdentityDbContext<ApplicationUser>
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        public DbSet<CvAnalysis> CvAnalyses { get; set; }
        public DbSet<Certificate> Certificates { get; set; }
        public DbSet<SkillGap> SkillGaps { get; set; }

        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);

            builder.Entity<CvAnalysis>()
                .HasOne(c => c.User)
                .WithMany(u => u.CvAnalyses)
                .HasForeignKey(c => c.UserId);

            builder.Entity<Certificate>()
                .HasOne(c => c.User)
                .WithMany(u => u.Certificates)
                .HasForeignKey(c => c.UserId);

            builder.Entity<CvAnalysis>()
                .Property(c => c.Strengths)
                .HasColumnType("jsonb");

            builder.Entity<CvAnalysis>()
                .Property(c => c.Improvements)
                .HasColumnType("jsonb");

            builder.Entity<CvAnalysis>()
                .Property(c => c.Keywords)
                .HasColumnType("jsonb");

            builder.Entity<SkillGap>()
                .Property(s => s.CandidateSkills)
                .HasColumnType("jsonb");

            builder.Entity<SkillGap>()
                .Property(s => s.RequiredSkills)
                .HasColumnType("jsonb");

            builder.Entity<SkillGap>()
                .Property(s => s.Gaps)
                .HasColumnType("jsonb");
        }
    }
}