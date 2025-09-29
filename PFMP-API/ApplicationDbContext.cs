using Microsoft.EntityFrameworkCore;
using PFMP_API.Models;

namespace PFMP_API
{
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options)
        {
        }

        // Core Entities
        public DbSet<User> Users { get; set; }
        public DbSet<Account> Accounts { get; set; }
        public DbSet<Holding> Holdings { get; set; }
        public DbSet<Transaction> Transactions { get; set; }
        public DbSet<Goal> Goals { get; set; }
        public DbSet<GoalMilestone> GoalMilestones { get; set; }

        // Income and Insurance
        public DbSet<IncomeSource> IncomeSources { get; set; }
        public DbSet<Insurance> InsurancePolicies { get; set; }
        public DbSet<RealEstate> RealEstateProperties { get; set; }

        // API and Security
        public DbSet<APICredential> APICredentials { get; set; }

        // Notifications
        public DbSet<Alert> Alerts { get; set; }

        // Task Management
        public DbSet<UserTask> Tasks { get; set; }

    // Advisory / Recommendations
    public DbSet<Advice> Advice { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // User Configuration
            modelBuilder.Entity<User>(entity =>
            {
                entity.HasKey(e => e.UserId);
                entity.HasIndex(e => e.Email).IsUnique();
                entity.Property(e => e.Email).IsRequired().HasMaxLength(255);
                entity.Property(e => e.FirstName).IsRequired().HasMaxLength(100);
                entity.Property(e => e.LastName).IsRequired().HasMaxLength(100);
            });

            // Account Configuration
            modelBuilder.Entity<Account>(entity =>
            {
                entity.HasKey(e => e.AccountId);
                entity.HasOne(e => e.User)
                    .WithMany(e => e.Accounts)
                    .HasForeignKey(e => e.UserId)
                    .OnDelete(DeleteBehavior.Cascade);
                
                entity.OwnsOne(e => e.TSPAllocation, tsp =>
                {
                    tsp.Property(t => t.GFundPercentage).HasColumnName("TSP_GFundPercentage");
                    tsp.Property(t => t.FFundPercentage).HasColumnName("TSP_FFundPercentage");
                    tsp.Property(t => t.CFundPercentage).HasColumnName("TSP_CFundPercentage");
                    tsp.Property(t => t.SFundPercentage).HasColumnName("TSP_SFundPercentage");
                    tsp.Property(t => t.IFundPercentage).HasColumnName("TSP_IFundPercentage");
                    tsp.Property(t => t.LastUpdated).HasColumnName("TSP_LastUpdated");
                });
            });

            // Holding Configuration
            modelBuilder.Entity<Holding>(entity =>
            {
                entity.HasKey(e => e.HoldingId);
                entity.HasOne(e => e.Account)
                    .WithMany(e => e.Holdings)
                    .HasForeignKey(e => e.AccountId)
                    .OnDelete(DeleteBehavior.Cascade);
                
                entity.HasIndex(e => new { e.AccountId, e.Symbol });
                entity.Property(e => e.Symbol).IsRequired().HasMaxLength(20);
            });

            // Transaction Configuration
            modelBuilder.Entity<Transaction>(entity =>
            {
                entity.HasKey(e => e.TransactionId);
                entity.HasOne(e => e.Account)
                    .WithMany(e => e.Transactions)
                    .HasForeignKey(e => e.AccountId)
                    .OnDelete(DeleteBehavior.Cascade);
                
                entity.HasOne(e => e.Holding)
                    .WithMany(e => e.Transactions)
                    .HasForeignKey(e => e.HoldingId)
                    .OnDelete(DeleteBehavior.SetNull);
                
                entity.HasIndex(e => e.TransactionDate);
                entity.HasIndex(e => e.TransactionType);
            });

            // Goal Configuration
            modelBuilder.Entity<Goal>(entity =>
            {
                entity.HasKey(e => e.GoalId);
                entity.HasOne(e => e.User)
                    .WithMany(e => e.Goals)
                    .HasForeignKey(e => e.UserId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            // Goal Milestone Configuration
            modelBuilder.Entity<GoalMilestone>(entity =>
            {
                entity.HasKey(e => e.MilestoneId);
                entity.HasOne(e => e.Goal)
                    .WithMany(e => e.Milestones)
                    .HasForeignKey(e => e.GoalId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            // Income Source Configuration
            modelBuilder.Entity<IncomeSource>(entity =>
            {
                entity.HasKey(e => e.IncomeSourceId);
                entity.HasOne(e => e.User)
                    .WithMany(e => e.IncomeSources)
                    .HasForeignKey(e => e.UserId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            // Insurance Configuration
            modelBuilder.Entity<Insurance>(entity =>
            {
                entity.HasKey(e => e.InsuranceId);
                entity.HasOne(e => e.User)
                    .WithMany(e => e.InsurancePolicies)
                    .HasForeignKey(e => e.UserId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            // Real Estate Configuration
            modelBuilder.Entity<RealEstate>(entity =>
            {
                entity.HasKey(e => e.RealEstateId);
                entity.HasOne(e => e.User)
                    .WithMany(e => e.RealEstateProperties)
                    .HasForeignKey(e => e.UserId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            // API Credential Configuration
            modelBuilder.Entity<APICredential>(entity =>
            {
                entity.HasKey(e => e.APICredentialId);
                entity.HasOne(e => e.Account)
                    .WithOne(e => e.APICredentials)
                    .HasForeignKey<APICredential>(e => e.AccountId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            // Alert Configuration
            modelBuilder.Entity<Alert>(entity =>
            {
                entity.HasKey(e => e.AlertId);
                entity.HasOne(e => e.User)
                    .WithMany(e => e.Alerts)
                    .HasForeignKey(e => e.UserId)
                    .OnDelete(DeleteBehavior.Cascade);
                
                entity.HasIndex(e => e.CreatedAt);
                entity.HasIndex(e => new { e.UserId, e.IsRead });
            });

            // Task Configuration
            modelBuilder.Entity<UserTask>(entity =>
            {
                entity.HasKey(e => e.TaskId);
                entity.HasOne(e => e.User)
                    .WithMany(u => u.Tasks)
                    .HasForeignKey(e => e.UserId)
                    .OnDelete(DeleteBehavior.Cascade);
                
                entity.HasOne(e => e.SourceAlert)
                    .WithMany()
                    .HasForeignKey(e => e.SourceAlertId)
                    .OnDelete(DeleteBehavior.SetNull);
                
                entity.HasIndex(e => e.CreatedDate);
                entity.HasIndex(e => new { e.UserId, e.Status });
                entity.HasIndex(e => e.DueDate);
                
                entity.Property(e => e.Title).IsRequired().HasMaxLength(200);
                entity.Property(e => e.Description).IsRequired();
            });

            // Advice Configuration
            modelBuilder.Entity<Advice>(entity =>
            {
                entity.HasKey(e => e.AdviceId);
                entity.HasOne(e => e.User)
                    .WithMany()
                    .HasForeignKey(e => e.UserId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.Property(e => e.Status).IsRequired().HasMaxLength(40);
                entity.Property(e => e.Theme).HasMaxLength(100);
                entity.HasIndex(e => e.UserId);
                entity.HasIndex(e => e.CreatedAt);
            });

            // Configure decimal precision globally
            foreach (var entityType in modelBuilder.Model.GetEntityTypes())
            {
                foreach (var property in entityType.GetProperties())
                {
                    if (property.ClrType == typeof(decimal) || property.ClrType == typeof(decimal?))
                    {
                        var columnType = property.GetColumnType();
                        if (columnType != null && !columnType.Contains("decimal"))
                        {
                            property.SetColumnType("decimal(18,2)");
                        }
                    }
                }
            }
        }
    }
}