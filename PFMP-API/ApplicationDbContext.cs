using Microsoft.EntityFrameworkCore;
using PFMP_API.Models;
using PFMP_API.Models.FinancialProfile;
using PFMP_API.Models.Plaid;

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
        public DbSet<PriceHistory> PriceHistory { get; set; }
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

        // Wave 7: AI Intelligence & Memory
        public DbSet<MarketContext> MarketContexts { get; set; }
        public DbSet<AIConversation> AIConversations { get; set; }
        public DbSet<AIMessage> AIMessages { get; set; }
        public DbSet<AIActionMemory> AIActionMemories { get; set; }
        public DbSet<AIUserMemory> AIUserMemories { get; set; }

    // Onboarding (Wave 3)
        public DbSet<OnboardingProgress> OnboardingProgress { get; set; }

    // Market Data
        public DbSet<TSPFundPrice> TSPFundPrices { get; set; }

    // Financial profile (Wave 5)
    public DbSet<FinancialProfileSectionStatus> FinancialProfileSectionStatuses { get; set; }
    public DbSet<FinancialProfileSnapshot> FinancialProfileSnapshots { get; set; }
    // DEPRECATED (Wave 9.2): Still referenced by legacy endpoints, models in Archive folder
    public DbSet<CashAccount> CashAccounts { get; set; }
    public DbSet<CashTransaction> CashTransactions { get; set; }
    public DbSet<InvestmentAccount> InvestmentAccounts { get; set; }
    public DbSet<PropertyProfile> Properties { get; set; }
    public DbSet<LiabilityAccount> LiabilityAccounts { get; set; }
    public DbSet<ExpenseBudget> ExpenseBudgets { get; set; }
    public DbSet<TaxProfile> TaxProfiles { get; set; }
    public DbSet<FinancialProfileInsurancePolicy> FinancialProfileInsurancePolicies { get; set; }
    public DbSet<BenefitCoverage> BenefitCoverages { get; set; }
    public DbSet<IncomeStreamProfile> IncomeStreams { get; set; }
    public DbSet<EquityCompensationInterest> EquityCompensationInterests { get; set; }
    public DbSet<LongTermObligation> LongTermObligations { get; set; }
    public DbSet<TspProfile> TspProfiles { get; set; }
    public DbSet<TspLifecyclePosition> TspLifecyclePositions { get; set; }
    public DbSet<TspPositionSnapshot> TspPositionSnapshots { get; set; }

    // Background Jobs & Analytics (Wave 10)
    public DbSet<NetWorthSnapshot> NetWorthSnapshots { get; set; }

    // Plaid Integration (Wave 11)
    public DbSet<AccountConnection> AccountConnections { get; set; }
    public DbSet<SyncHistory> SyncHistory { get; set; }

    // Plaid Investments (Wave 12)
    public DbSet<PlaidSecurity> PlaidSecurities { get; set; }

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
                entity.Property(e => e.PreferredName).HasMaxLength(100);
                entity.Property(e => e.MaritalStatus).HasMaxLength(60);
                entity.Property(e => e.HouseholdServiceNotes).HasMaxLength(500);
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

            // OnboardingProgress Configuration
            modelBuilder.Entity<OnboardingProgress>(entity =>
            {
                entity.HasKey(e => e.UserId); // 1:1 with User
                entity.HasOne<User>()
                    .WithOne()
                    .HasForeignKey<OnboardingProgress>(e => e.UserId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.Property(e => e.CurrentStepId).HasMaxLength(100);
                // Store JSON as text (PostgreSQL jsonb via HasColumnType)
                entity.Property(e => e.CompletedStepIdsJson)
                    .HasColumnType("jsonb")
                    .HasColumnName("CompletedStepIds");
                entity.Property(e => e.StepPayloadsJson)
                    .HasColumnType("jsonb")
                    .HasColumnName("StepPayloads");
                entity.Property(e => e.UpdatedUtc).IsRequired();

                entity.HasIndex(e => e.UpdatedUtc);
            });

            // Financial profile configuration
            modelBuilder.Entity<FinancialProfileSectionStatus>(entity =>
            {
                entity.HasIndex(e => new { e.UserId, e.SectionKey }).IsUnique();
                entity.Property(e => e.SectionKey).IsRequired().HasMaxLength(60);
                entity.Property(e => e.Status).IsRequired().HasMaxLength(20);
                entity.Property(e => e.OptOutReason).HasMaxLength(255);
                entity.Property(e => e.DataChecksum).HasMaxLength(80);
                entity.Property(e => e.CreatedAt).IsRequired();
                entity.Property(e => e.UpdatedAt).IsRequired();
                entity.HasOne<User>()
                    .WithMany()
                    .HasForeignKey(e => e.UserId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<FinancialProfileSnapshot>(entity =>
            {
                entity.HasKey(e => e.UserId);
                entity.Property(e => e.UserId).ValueGeneratedNever();
                entity.Property(e => e.CompletedSectionsJson).HasColumnType("jsonb");
                entity.Property(e => e.OptedOutSectionsJson).HasColumnType("jsonb");
                entity.Property(e => e.OutstandingSectionsJson).HasColumnType("jsonb");
                entity.HasOne<User>()
                    .WithOne()
                    .HasForeignKey<FinancialProfileSnapshot>(e => e.UserId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<CashAccount>(entity =>
            {
                entity.HasIndex(e => new { e.UserId, e.Nickname, e.AccountType });
                entity.Property(e => e.Nickname).HasMaxLength(200).IsRequired();
                entity.Property(e => e.AccountType).HasMaxLength(40);
                entity.Property(e => e.Institution).HasMaxLength(150);
                entity.Property(e => e.Balance).HasColumnType("decimal(18,2)");
                entity.Property(e => e.InterestRateApr).HasColumnType("decimal(8,4)");
                entity.HasOne<User>()
                    .WithMany()
                    .HasForeignKey(e => e.UserId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            // CashTransaction Configuration
            modelBuilder.Entity<CashTransaction>(entity =>
            {
                entity.HasKey(e => e.CashTransactionId);
                entity.HasIndex(e => new { e.CashAccountId, e.TransactionDate });
                entity.HasIndex(e => e.Category);
                entity.HasIndex(e => e.TransactionType);
                
                entity.HasOne(e => e.CashAccount)
                    .WithMany()
                    .HasForeignKey(e => e.CashAccountId)
                    .OnDelete(DeleteBehavior.Cascade);
                
                entity.Property(e => e.TransactionType).IsRequired().HasMaxLength(50);
                entity.Property(e => e.Amount).HasColumnType("decimal(18,2)").IsRequired();
                entity.Property(e => e.TransactionDate).IsRequired();
                entity.Property(e => e.Description).HasMaxLength(500);
                entity.Property(e => e.Category).HasMaxLength(100);
                entity.Property(e => e.Merchant).HasMaxLength(200);
                entity.Property(e => e.CheckNumber).HasMaxLength(20);
                entity.Property(e => e.Fee).HasColumnType("decimal(18,2)");
                entity.Property(e => e.Tags).HasMaxLength(500);
                entity.Property(e => e.ExternalTransactionId).HasMaxLength(100);
                entity.Property(e => e.CreatedAt).IsRequired();
            });

            modelBuilder.Entity<InvestmentAccount>(entity =>
            {
                entity.HasIndex(e => new { e.UserId, e.AccountName, e.AccountCategory });
                entity.Property(e => e.AccountName).HasMaxLength(200).IsRequired();
                entity.Property(e => e.AccountCategory).HasMaxLength(60);
                entity.Property(e => e.AssetClass).HasMaxLength(60);
                entity.Property(e => e.CurrentValue).HasColumnType("decimal(18,2)");
                entity.Property(e => e.CostBasis).HasColumnType("decimal(18,2)");
                entity.Property(e => e.ContributionRatePercent).HasColumnType("decimal(8,4)");
                entity.HasOne<User>()
                    .WithMany()
                    .HasForeignKey(e => e.UserId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<PropertyProfile>(entity =>
            {
                entity.HasIndex(e => new { e.UserId, e.PropertyName });
                entity.Property(e => e.PropertyName).HasMaxLength(200).IsRequired();
                entity.Property(e => e.PropertyType).HasMaxLength(100);
                entity.Property(e => e.Occupancy).HasMaxLength(60);
                entity.Property(e => e.EstimatedValue).HasColumnType("decimal(18,2)");
                entity.Property(e => e.MortgageBalance).HasColumnType("decimal(18,2)");
                entity.Property(e => e.MonthlyMortgagePayment).HasColumnType("decimal(18,2)");
                entity.Property(e => e.MonthlyRentalIncome).HasColumnType("decimal(18,2)");
                entity.Property(e => e.MonthlyExpenses).HasColumnType("decimal(18,2)");
                entity.HasOne<User>()
                    .WithMany()
                    .HasForeignKey(e => e.UserId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<LiabilityAccount>(entity =>
            {
                entity.HasIndex(e => new { e.UserId, e.LiabilityType, e.Lender });
                entity.Property(e => e.LiabilityType).HasMaxLength(80).IsRequired();
                entity.Property(e => e.Lender).HasMaxLength(150);
                entity.Property(e => e.CurrentBalance).HasColumnType("decimal(18,2)");
                entity.Property(e => e.InterestRateApr).HasColumnType("decimal(8,4)");
                entity.Property(e => e.MinimumPayment).HasColumnType("decimal(18,2)");
                entity.HasOne<User>()
                    .WithMany()
                    .HasForeignKey(e => e.UserId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<ExpenseBudget>(entity =>
            {
                entity.HasIndex(e => new { e.UserId, e.Category });
                entity.Property(e => e.Category).HasMaxLength(100).IsRequired();
                entity.Property(e => e.MonthlyAmount).HasColumnType("decimal(18,2)");
                entity.Property(e => e.Notes).HasMaxLength(300);
                entity.HasOne<User>()
                    .WithMany()
                    .HasForeignKey(e => e.UserId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<FinancialProfileInsurancePolicy>(entity =>
            {
                entity.HasIndex(e => new { e.UserId, e.PolicyType, e.PolicyName });
                entity.Property(e => e.PolicyType).HasMaxLength(120).IsRequired();
                entity.Property(e => e.PolicyName).HasMaxLength(200);
                entity.Property(e => e.Carrier).HasMaxLength(120);
                entity.Property(e => e.PremiumFrequency).HasMaxLength(30);
                entity.Property(e => e.CoverageAmount).HasColumnType("decimal(18,2)");
                entity.Property(e => e.PremiumAmount).HasColumnType("decimal(18,2)");
                entity.Property(e => e.RecommendedCoverage).HasColumnType("decimal(18,2)");
                entity.HasOne<User>()
                    .WithMany()
                    .HasForeignKey(e => e.UserId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<TspPositionSnapshot>(entity =>
            {
                entity.HasIndex(e => new { e.UserId, e.AsOfUtc });
                entity.HasIndex(e => new { e.UserId, e.FundCode, e.AsOfUtc });
                entity.Property(e => e.FundCode).HasMaxLength(10).IsRequired();
                entity.Property(e => e.Price).HasColumnType("decimal(18,6)");
                entity.Property(e => e.Units).HasColumnType("decimal(18,6)");
                entity.Property(e => e.MarketValue).HasColumnType("decimal(18,2)");
                entity.Property(e => e.MixPercent).HasColumnType("decimal(8,4)");
                entity.Property(e => e.AllocationPercent).HasColumnType("decimal(8,4)");
                entity.Property(e => e.AsOfUtc).IsRequired();
                entity.Property(e => e.CreatedAt).IsRequired();
                entity.HasOne<User>()
                    .WithMany()
                    .HasForeignKey(e => e.UserId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<TspLifecyclePosition>(entity =>
            {
                entity.HasIndex(e => new { e.UserId, e.FundCode }).IsUnique();
                entity.Property(e => e.FundCode).HasMaxLength(10).IsRequired();
                // Renamed: AllocationPercent -> ContributionPercent
                entity.Property(e => e.ContributionPercent).HasColumnType("decimal(8,4)");
                entity.Property(e => e.Units).HasColumnType("decimal(18,6)");
                entity.Property(e => e.CreatedAt).IsRequired();
                entity.Property(e => e.UpdatedAt).IsRequired();
                entity.HasOne<User>()
                    .WithMany()
                    .HasForeignKey(e => e.UserId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<BenefitCoverage>(entity =>
            {
                entity.HasIndex(e => new { e.UserId, e.BenefitType, e.Provider });
                entity.Property(e => e.BenefitType).HasMaxLength(120).IsRequired();
                entity.Property(e => e.Provider).HasMaxLength(120);
                entity.Property(e => e.EmployerContributionPercent).HasColumnType("decimal(8,4)");
                entity.Property(e => e.MonthlyCost).HasColumnType("decimal(18,2)");
                entity.Property(e => e.Notes).HasMaxLength(300);
                entity.HasOne<User>()
                    .WithMany()
                    .HasForeignKey(e => e.UserId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<IncomeStreamProfile>(entity =>
            {
                entity.HasIndex(e => new { e.UserId, e.Name, e.IncomeType });
                entity.Property(e => e.Name).HasMaxLength(200).IsRequired();
                entity.Property(e => e.IncomeType).HasMaxLength(100);
                entity.Property(e => e.MonthlyAmount).HasColumnType("decimal(18,2)");
                entity.Property(e => e.AnnualAmount).HasColumnType("decimal(18,2)");
                entity.HasOne<User>()
                    .WithMany()
                    .HasForeignKey(e => e.UserId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<TaxProfile>(entity =>
            {
                entity.HasKey(e => e.UserId);
                entity.Property(e => e.FilingStatus).HasMaxLength(40);
                entity.Property(e => e.StateOfResidence).HasMaxLength(80);
                entity.Property(e => e.MarginalRatePercent).HasColumnType("decimal(8,4)");
                entity.Property(e => e.EffectiveRatePercent).HasColumnType("decimal(8,4)");
                entity.Property(e => e.FederalWithholdingPercent).HasColumnType("decimal(8,4)");
                entity.Property(e => e.ExpectedRefundAmount).HasColumnType("decimal(18,2)");
                entity.Property(e => e.ExpectedPaymentAmount).HasColumnType("decimal(18,2)");
                entity.Property(e => e.Notes).HasMaxLength(300);
                entity.HasOne<User>()
                    .WithOne()
                    .HasForeignKey<TaxProfile>(e => e.UserId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<TspProfile>(entity =>
            {
                entity.HasKey(e => e.UserId);
                entity.Property(e => e.UserId).ValueGeneratedNever();
                entity.Property(e => e.ContributionRatePercent).HasColumnType("decimal(8,4)");
                entity.Property(e => e.EmployerMatchPercent).HasColumnType("decimal(8,4)");
                entity.Property(e => e.CurrentBalance).HasColumnType("decimal(18,2)");
                entity.Property(e => e.TargetBalance).HasColumnType("decimal(18,2)");
                entity.Property(e => e.GFundPercent).HasColumnType("decimal(8,4)");
                entity.Property(e => e.FFundPercent).HasColumnType("decimal(8,4)");
                entity.Property(e => e.CFundPercent).HasColumnType("decimal(8,4)");
                entity.Property(e => e.SFundPercent).HasColumnType("decimal(8,4)");
                entity.Property(e => e.IFundPercent).HasColumnType("decimal(8,4)");
                entity.Property(e => e.LifecycleBalance).HasColumnType("decimal(18,2)");
                entity.Property(e => e.LifecyclePercent).HasColumnType("decimal(8,4)");
                entity.Property(e => e.OptOutReason).HasMaxLength(255);
                entity.HasOne<User>()
                    .WithOne()
                    .HasForeignKey<TspProfile>(e => e.UserId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<EquityCompensationInterest>(entity =>
            {
                entity.HasKey(e => e.UserId);
                entity.Property(e => e.Notes).HasMaxLength(300);
                entity.HasOne<User>()
                    .WithOne()
                    .HasForeignKey<EquityCompensationInterest>(e => e.UserId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<LongTermObligation>(entity =>
            {
                entity.HasIndex(e => new { e.UserId, e.ObligationName });
                entity.Property(e => e.ObligationName).HasMaxLength(150).IsRequired();
                entity.Property(e => e.ObligationType).HasMaxLength(80);
                entity.Property(e => e.FundingStatus).HasMaxLength(60);
                entity.Property(e => e.EstimatedCost).HasColumnType("decimal(18,2)");
                entity.Property(e => e.FundsAllocated).HasColumnType("decimal(18,2)");
                entity.Property(e => e.Notes).HasMaxLength(400);
                entity.HasOne<User>()
                    .WithMany()
                    .HasForeignKey(e => e.UserId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            // Net Worth Snapshots (Wave 10)
            modelBuilder.Entity<NetWorthSnapshot>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasIndex(e => new { e.UserId, e.SnapshotDate }).IsUnique();
                entity.HasIndex(e => e.SnapshotDate);
                entity.Property(e => e.TotalNetWorth).HasColumnType("decimal(18,2)");
                entity.Property(e => e.InvestmentsTotal).HasColumnType("decimal(18,2)");
                entity.Property(e => e.CashTotal).HasColumnType("decimal(18,2)");
                entity.Property(e => e.RealEstateEquity).HasColumnType("decimal(18,2)");
                entity.Property(e => e.RetirementTotal).HasColumnType("decimal(18,2)");
                entity.Property(e => e.LiabilitiesTotal).HasColumnType("decimal(18,2)");
                entity.Property(e => e.CreatedAt).IsRequired();
                entity.HasOne(e => e.User)
                    .WithMany()
                    .HasForeignKey(e => e.UserId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            // Plaid Integration (Wave 11)
            modelBuilder.Entity<AccountConnection>(entity =>
            {
                entity.HasKey(e => e.ConnectionId);
                entity.HasIndex(e => e.UserId);
                entity.HasIndex(e => e.PlaidItemId);
                entity.HasIndex(e => new { e.UserId, e.Source });
                entity.Property(e => e.PlaidItemId).HasMaxLength(100);
                entity.Property(e => e.PlaidAccessToken).HasMaxLength(1000);
                entity.Property(e => e.PlaidInstitutionId).HasMaxLength(50);
                entity.Property(e => e.PlaidInstitutionName).HasMaxLength(200);
                entity.Property(e => e.ErrorMessage).HasMaxLength(500);
                entity.Property(e => e.ConnectedAt).IsRequired();
                entity.HasOne(e => e.User)
                    .WithMany()
                    .HasForeignKey(e => e.UserId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<SyncHistory>(entity =>
            {
                entity.HasKey(e => e.SyncHistoryId);
                entity.HasIndex(e => e.ConnectionId);
                entity.HasIndex(e => e.SyncStartedAt);
                entity.Property(e => e.ErrorMessage).HasMaxLength(500);
                entity.Property(e => e.SyncStartedAt).IsRequired();
                entity.HasOne(e => e.Connection)
                    .WithMany()
                    .HasForeignKey(e => e.ConnectionId)
                    .OnDelete(DeleteBehavior.Cascade);
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