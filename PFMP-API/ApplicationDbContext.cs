using Microsoft.EntityFrameworkCore;

namespace PFMP_API
{
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options)
        {
        }

        // Add DbSets for your entities here
        // Example: public DbSet<Portfolio> Portfolios { get; set; }
        // Example: public DbSet<Transaction> Transactions { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);
            
            // Configure entity relationships and constraints here
        }
    }
}