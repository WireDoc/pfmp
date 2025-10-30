using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;
using PFMP_API.Models.Temp;

namespace PFMP_API;

public partial class PfmpDevContext : DbContext
{
    public PfmpDevContext()
    {
    }

    public PfmpDevContext(DbContextOptions<PfmpDevContext> options)
        : base(options)
    {
    }

    public virtual DbSet<Account> Accounts { get; set; }

    public virtual DbSet<Advice> Advices { get; set; }

    public virtual DbSet<AiactionMemory> AiactionMemories { get; set; }

    public virtual DbSet<Aiconversation> Aiconversations { get; set; }

    public virtual DbSet<Aimessage> Aimessages { get; set; }

    public virtual DbSet<AiuserMemory> AiuserMemories { get; set; }

    public virtual DbSet<Alert> Alerts { get; set; }

    public virtual DbSet<Apicredential> Apicredentials { get; set; }

    public virtual DbSet<CashAccount> CashAccounts { get; set; }

    public virtual DbSet<FinancialProfileBenefitCoverage> FinancialProfileBenefitCoverages { get; set; }

    public virtual DbSet<FinancialProfileEquityInterest> FinancialProfileEquityInterests { get; set; }

    public virtual DbSet<FinancialProfileExpense> FinancialProfileExpenses { get; set; }

    public virtual DbSet<FinancialProfileInsurancePolicy> FinancialProfileInsurancePolicies { get; set; }

    public virtual DbSet<FinancialProfileLiability> FinancialProfileLiabilities { get; set; }

    public virtual DbSet<FinancialProfileLongTermObligation> FinancialProfileLongTermObligations { get; set; }

    public virtual DbSet<FinancialProfileSectionStatus> FinancialProfileSectionStatuses { get; set; }

    public virtual DbSet<FinancialProfileSnapshot> FinancialProfileSnapshots { get; set; }

    public virtual DbSet<FinancialProfileTaxProfile> FinancialProfileTaxProfiles { get; set; }

    public virtual DbSet<Goal> Goals { get; set; }

    public virtual DbSet<GoalMilestone> GoalMilestones { get; set; }

    public virtual DbSet<Holding> Holdings { get; set; }

    public virtual DbSet<IncomeSource> IncomeSources { get; set; }

    public virtual DbSet<IncomeStream> IncomeStreams { get; set; }

    public virtual DbSet<InsurancePolicy> InsurancePolicies { get; set; }

    public virtual DbSet<InvestmentAccount> InvestmentAccounts { get; set; }

    public virtual DbSet<MarketContext> MarketContexts { get; set; }

    public virtual DbSet<OnboardingProgress> OnboardingProgresses { get; set; }

    public virtual DbSet<Property> Properties { get; set; }

    public virtual DbSet<RealEstateProperty> RealEstateProperties { get; set; }

    public virtual DbSet<PFMP_API.Models.Temp.Task> Tasks { get; set; }

    public virtual DbSet<Transaction> Transactions { get; set; }

    public virtual DbSet<TspLifecyclePosition> TspLifecyclePositions { get; set; }

    public virtual DbSet<TspPositionSnapshot> TspPositionSnapshots { get; set; }

    public virtual DbSet<TspProfile> TspProfiles { get; set; }

    public virtual DbSet<TspfundPrice> TspfundPrices { get; set; }

    public virtual DbSet<User> Users { get; set; }

    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
#warning To protect potentially sensitive information in your connection string, you should move it out of source code. You can avoid scaffolding the connection string by using the Name= syntax to read it from configuration - see https://go.microsoft.com/fwlink/?linkid=2131148. For more guidance on storing connection strings, see https://go.microsoft.com/fwlink/?LinkId=723263.
        => optionsBuilder.UseNpgsql("Host=192.168.1.108;Port=5433;Database=pfmp_dev;Username=pfmp_user;Password=MediaPword.1");

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Account>(entity =>
        {
            entity.HasIndex(e => e.UserId, "IX_Accounts_UserId");

            entity.Property(e => e.AccountName).HasMaxLength(200);
            entity.Property(e => e.AccountNumber).HasMaxLength(50);
            entity.Property(e => e.ApiconnectionStatus).HasColumnName("APIConnectionStatus");
            entity.Property(e => e.Apiprovider).HasColumnName("APIProvider");
            entity.Property(e => e.CurrentBalance).HasPrecision(18, 2);
            entity.Property(e => e.HasApiintegration).HasColumnName("HasAPIIntegration");
            entity.Property(e => e.Institution).HasMaxLength(100);
            entity.Property(e => e.InterestRate).HasPrecision(18, 8);
            entity.Property(e => e.IsApiconnected).HasColumnName("IsAPIConnected");
            entity.Property(e => e.LastApisync).HasColumnName("LastAPISync");
            entity.Property(e => e.TspCfundPercentage)
                .HasPrecision(5, 2)
                .HasColumnName("TSP_CFundPercentage");
            entity.Property(e => e.TspFfundPercentage)
                .HasPrecision(5, 2)
                .HasColumnName("TSP_FFundPercentage");
            entity.Property(e => e.TspGfundPercentage)
                .HasPrecision(5, 2)
                .HasColumnName("TSP_GFundPercentage");
            entity.Property(e => e.TspIfundPercentage)
                .HasPrecision(5, 2)
                .HasColumnName("TSP_IFundPercentage");
            entity.Property(e => e.TspLastUpdated).HasColumnName("TSP_LastUpdated");
            entity.Property(e => e.TspSfundPercentage)
                .HasPrecision(5, 2)
                .HasColumnName("TSP_SFundPercentage");
            entity.Property(e => e.TspallocationL2030fundPercentage)
                .HasPrecision(5, 2)
                .HasColumnName("TSPAllocation_L2030FundPercentage");
            entity.Property(e => e.TspallocationL2035fundPercentage)
                .HasPrecision(5, 2)
                .HasColumnName("TSPAllocation_L2035FundPercentage");
            entity.Property(e => e.TspallocationL2040fundPercentage)
                .HasPrecision(5, 2)
                .HasColumnName("TSPAllocation_L2040FundPercentage");
            entity.Property(e => e.TspallocationL2045fundPercentage)
                .HasPrecision(5, 2)
                .HasColumnName("TSPAllocation_L2045FundPercentage");
            entity.Property(e => e.TspallocationL2050fundPercentage)
                .HasPrecision(5, 2)
                .HasColumnName("TSPAllocation_L2050FundPercentage");
            entity.Property(e => e.TspallocationL2055fundPercentage)
                .HasPrecision(5, 2)
                .HasColumnName("TSPAllocation_L2055FundPercentage");
            entity.Property(e => e.TspallocationL2060fundPercentage)
                .HasPrecision(5, 2)
                .HasColumnName("TSPAllocation_L2060FundPercentage");
            entity.Property(e => e.TspallocationL2065fundPercentage)
                .HasPrecision(5, 2)
                .HasColumnName("TSPAllocation_L2065FundPercentage");
            entity.Property(e => e.TspallocationL2070fundPercentage)
                .HasPrecision(5, 2)
                .HasColumnName("TSPAllocation_L2070FundPercentage");
            entity.Property(e => e.TspallocationL2075fundPercentage)
                .HasPrecision(5, 2)
                .HasColumnName("TSPAllocation_L2075FundPercentage");
            entity.Property(e => e.TspallocationLincomeFundPercentage)
                .HasPrecision(5, 2)
                .HasColumnName("TSPAllocation_LIncomeFundPercentage");
            entity.Property(e => e.TspemployerMatch)
                .HasPrecision(18, 2)
                .HasColumnName("TSPEmployerMatch");
            entity.Property(e => e.TspmonthlyContribution)
                .HasPrecision(18, 2)
                .HasColumnName("TSPMonthlyContribution");

            entity.HasOne(d => d.User).WithMany(p => p.Accounts).HasForeignKey(d => d.UserId);
        });

        modelBuilder.Entity<Advice>(entity =>
        {
            entity.ToTable("Advice");

            entity.HasIndex(e => e.CreatedAt, "IX_Advice_CreatedAt");

            entity.HasIndex(e => e.MarketContextId, "IX_Advice_MarketContextId");

            entity.HasIndex(e => e.UserId, "IX_Advice_UserId");

            entity.Property(e => e.AggressiveRecommendation).HasMaxLength(5000);
            entity.Property(e => e.AgreementScore).HasPrecision(5, 2);
            entity.Property(e => e.AigenerationCost)
                .HasPrecision(10, 6)
                .HasColumnName("AIGenerationCost");
            entity.Property(e => e.ConservativeRecommendation).HasMaxLength(5000);
            entity.Property(e => e.GenerationMethod).HasMaxLength(40);
            entity.Property(e => e.ModelsUsed).HasMaxLength(200);
            entity.Property(e => e.PreviousStatus).HasMaxLength(40);
            entity.Property(e => e.Status).HasMaxLength(40);
            entity.Property(e => e.Theme).HasMaxLength(100);

            entity.HasOne(d => d.MarketContext).WithMany(p => p.Advices).HasForeignKey(d => d.MarketContextId);

            entity.HasOne(d => d.User).WithMany(p => p.Advices).HasForeignKey(d => d.UserId);
        });

        modelBuilder.Entity<AiactionMemory>(entity =>
        {
            entity.HasKey(e => e.ActionMemoryId);

            entity.ToTable("AIActionMemories");

            entity.HasIndex(e => e.SourceAdviceId, "IX_AIActionMemories_SourceAdviceId");

            entity.HasIndex(e => e.SourceAlertId, "IX_AIActionMemories_SourceAlertId");

            entity.HasIndex(e => e.UserId, "IX_AIActionMemories_UserId");

            entity.Property(e => e.AccountsAffected).HasColumnType("jsonb");
            entity.Property(e => e.ActionSummary).HasMaxLength(500);
            entity.Property(e => e.ActionType).HasMaxLength(50);
            entity.Property(e => e.AmountMoved).HasPrecision(18, 2);
            entity.Property(e => e.AssetClass).HasMaxLength(50);

            entity.HasOne(d => d.SourceAdvice).WithMany(p => p.AiactionMemories).HasForeignKey(d => d.SourceAdviceId);

            entity.HasOne(d => d.SourceAlert).WithMany(p => p.AiactionMemories).HasForeignKey(d => d.SourceAlertId);

            entity.HasOne(d => d.User).WithMany(p => p.AiactionMemories).HasForeignKey(d => d.UserId);
        });

        modelBuilder.Entity<Aiconversation>(entity =>
        {
            entity.HasKey(e => e.ConversationId);

            entity.ToTable("AIConversations");

            entity.HasIndex(e => e.RelatedAdviceId, "IX_AIConversations_RelatedAdviceId");

            entity.HasIndex(e => e.UserId, "IX_AIConversations_UserId");

            entity.Property(e => e.ConversationSummary).HasMaxLength(1000);
            entity.Property(e => e.ConversationType).HasMaxLength(20);
            entity.Property(e => e.TotalCost).HasPrecision(10, 6);

            entity.HasOne(d => d.RelatedAdvice).WithMany(p => p.Aiconversations).HasForeignKey(d => d.RelatedAdviceId);

            entity.HasOne(d => d.User).WithMany(p => p.Aiconversations).HasForeignKey(d => d.UserId);
        });

        modelBuilder.Entity<Aimessage>(entity =>
        {
            entity.HasKey(e => e.MessageId);

            entity.ToTable("AIMessages");

            entity.HasIndex(e => e.ConversationId, "IX_AIMessages_ConversationId");

            entity.Property(e => e.AgreementScore).HasPrecision(5, 2);
            entity.Property(e => e.Content).HasMaxLength(5000);
            entity.Property(e => e.MessageCost).HasPrecision(10, 6);
            entity.Property(e => e.ModelUsed).HasMaxLength(50);
            entity.Property(e => e.Role).HasMaxLength(20);

            entity.HasOne(d => d.Conversation).WithMany(p => p.Aimessages).HasForeignKey(d => d.ConversationId);
        });

        modelBuilder.Entity<AiuserMemory>(entity =>
        {
            entity.HasKey(e => e.UserMemoryId);

            entity.ToTable("AIUserMemories");

            entity.HasIndex(e => e.SourceAdviceId, "IX_AIUserMemories_SourceAdviceId");

            entity.HasIndex(e => e.SourceConversationId, "IX_AIUserMemories_SourceConversationId");

            entity.HasIndex(e => e.UserId, "IX_AIUserMemories_UserId");

            entity.Property(e => e.Context).HasMaxLength(500);
            entity.Property(e => e.DeprecationReason).HasMaxLength(200);
            entity.Property(e => e.MemoryKey).HasMaxLength(100);
            entity.Property(e => e.MemoryType).HasMaxLength(50);
            entity.Property(e => e.MemoryValue).HasMaxLength(500);

            entity.HasOne(d => d.SourceAdvice).WithMany(p => p.AiuserMemories).HasForeignKey(d => d.SourceAdviceId);

            entity.HasOne(d => d.SourceConversation).WithMany(p => p.AiuserMemories).HasForeignKey(d => d.SourceConversationId);

            entity.HasOne(d => d.User).WithMany(p => p.AiuserMemories).HasForeignKey(d => d.UserId);
        });

        modelBuilder.Entity<Alert>(entity =>
        {
            entity.HasIndex(e => e.CreatedAt, "IX_Alerts_CreatedAt");

            entity.HasIndex(e => e.MarketContextId, "IX_Alerts_MarketContextId");

            entity.HasIndex(e => new { e.UserId, e.IsRead }, "IX_Alerts_UserId_IsRead");

            entity.Property(e => e.Aianalyzed)
                .HasDefaultValue(false)
                .HasColumnName("AIAnalyzed");
            entity.Property(e => e.AianalyzedAt).HasColumnName("AIAnalyzedAt");
            entity.Property(e => e.Aicontext)
                .HasMaxLength(500)
                .HasColumnName("AIContext");
            entity.Property(e => e.IsDismissed).HasDefaultValue(false);
            entity.Property(e => e.PortfolioImpactScore).HasDefaultValue(0);
            entity.Property(e => e.Title).HasMaxLength(200);

            entity.HasOne(d => d.MarketContext).WithMany(p => p.Alerts).HasForeignKey(d => d.MarketContextId);

            entity.HasOne(d => d.User).WithMany(p => p.Alerts).HasForeignKey(d => d.UserId);
        });

        modelBuilder.Entity<Apicredential>(entity =>
        {
            entity.ToTable("APICredentials");

            entity.HasIndex(e => e.AccountId, "IX_APICredentials_AccountId").IsUnique();

            entity.Property(e => e.ApicredentialId).HasColumnName("APICredentialId");
            entity.Property(e => e.ProviderName).HasMaxLength(100);

            entity.HasOne(d => d.Account).WithOne(p => p.Apicredential).HasForeignKey<Apicredential>(d => d.AccountId);
        });

        modelBuilder.Entity<CashAccount>(entity =>
        {
            entity.HasIndex(e => new { e.UserId, e.Nickname, e.AccountType }, "IX_CashAccounts_UserId_Nickname_AccountType");

            entity.Property(e => e.CashAccountId).ValueGeneratedNever();
            entity.Property(e => e.AccountType).HasMaxLength(40);
            entity.Property(e => e.Balance).HasPrecision(18, 2);
            entity.Property(e => e.Institution).HasMaxLength(150);
            entity.Property(e => e.InterestRateApr).HasPrecision(8, 4);
            entity.Property(e => e.Nickname).HasMaxLength(200);

            entity.HasOne(d => d.User).WithMany(p => p.CashAccounts).HasForeignKey(d => d.UserId);
        });

        modelBuilder.Entity<FinancialProfileBenefitCoverage>(entity =>
        {
            entity.HasKey(e => e.BenefitCoverageId);

            entity.HasIndex(e => new { e.UserId, e.BenefitType, e.Provider }, "IX_FinancialProfileBenefitCoverages_UserId_BenefitType_Provider");

            entity.Property(e => e.BenefitType).HasMaxLength(120);
            entity.Property(e => e.EmployerContributionPercent).HasPrecision(8, 4);
            entity.Property(e => e.MonthlyCost).HasPrecision(18, 2);
            entity.Property(e => e.Notes).HasMaxLength(300);
            entity.Property(e => e.Provider).HasMaxLength(120);

            entity.HasOne(d => d.User).WithMany(p => p.FinancialProfileBenefitCoverages).HasForeignKey(d => d.UserId);
        });

        modelBuilder.Entity<FinancialProfileEquityInterest>(entity =>
        {
            entity.HasKey(e => e.UserId);

            entity.ToTable("FinancialProfileEquityInterest");

            entity.Property(e => e.UserId).ValueGeneratedNever();
            entity.Property(e => e.Notes).HasMaxLength(300);

            entity.HasOne(d => d.User).WithOne(p => p.FinancialProfileEquityInterest).HasForeignKey<FinancialProfileEquityInterest>(d => d.UserId);
        });

        modelBuilder.Entity<FinancialProfileExpense>(entity =>
        {
            entity.HasKey(e => e.ExpenseBudgetId);

            entity.HasIndex(e => new { e.UserId, e.Category }, "IX_FinancialProfileExpenses_UserId_Category");

            entity.Property(e => e.Category).HasMaxLength(100);
            entity.Property(e => e.MonthlyAmount).HasPrecision(18, 2);
            entity.Property(e => e.Notes).HasMaxLength(300);

            entity.HasOne(d => d.User).WithMany(p => p.FinancialProfileExpenses).HasForeignKey(d => d.UserId);
        });

        modelBuilder.Entity<FinancialProfileInsurancePolicy>(entity =>
        {
            entity.HasKey(e => e.InsurancePolicyId);

            entity.HasIndex(e => new { e.UserId, e.PolicyType, e.PolicyName }, "IX_FinancialProfileInsurancePolicies_UserId_PolicyType_PolicyN~");

            entity.Property(e => e.InsurancePolicyId).ValueGeneratedNever();
            entity.Property(e => e.Carrier).HasMaxLength(120);
            entity.Property(e => e.CoverageAmount).HasPrecision(18, 2);
            entity.Property(e => e.PolicyName).HasMaxLength(200);
            entity.Property(e => e.PolicyType).HasMaxLength(120);
            entity.Property(e => e.PremiumAmount).HasPrecision(18, 2);
            entity.Property(e => e.PremiumFrequency).HasMaxLength(30);
            entity.Property(e => e.RecommendedCoverage).HasPrecision(18, 2);

            entity.HasOne(d => d.User).WithMany(p => p.FinancialProfileInsurancePolicies).HasForeignKey(d => d.UserId);
        });

        modelBuilder.Entity<FinancialProfileLiability>(entity =>
        {
            entity.HasKey(e => e.LiabilityAccountId);

            entity.HasIndex(e => new { e.UserId, e.LiabilityType, e.Lender }, "IX_FinancialProfileLiabilities_UserId_LiabilityType_Lender");

            entity.Property(e => e.CurrentBalance).HasPrecision(18, 2);
            entity.Property(e => e.InterestRateApr).HasPrecision(8, 4);
            entity.Property(e => e.Lender).HasMaxLength(150);
            entity.Property(e => e.LiabilityType).HasMaxLength(80);
            entity.Property(e => e.MinimumPayment).HasPrecision(18, 2);

            entity.HasOne(d => d.User).WithMany(p => p.FinancialProfileLiabilities).HasForeignKey(d => d.UserId);
        });

        modelBuilder.Entity<FinancialProfileLongTermObligation>(entity =>
        {
            entity.HasKey(e => e.LongTermObligationId);

            entity.HasIndex(e => new { e.UserId, e.ObligationName }, "IX_FinancialProfileLongTermObligations_UserId_ObligationName");

            entity.Property(e => e.EstimatedCost).HasPrecision(18, 2);
            entity.Property(e => e.FundingStatus).HasMaxLength(60);
            entity.Property(e => e.FundsAllocated).HasPrecision(18, 2);
            entity.Property(e => e.Notes).HasMaxLength(400);
            entity.Property(e => e.ObligationName).HasMaxLength(150);
            entity.Property(e => e.ObligationType).HasMaxLength(80);

            entity.HasOne(d => d.User).WithMany(p => p.FinancialProfileLongTermObligations).HasForeignKey(d => d.UserId);
        });

        modelBuilder.Entity<FinancialProfileSectionStatus>(entity =>
        {
            entity.HasKey(e => e.SectionStatusId);

            entity.HasIndex(e => new { e.UserId, e.SectionKey }, "IX_FinancialProfileSectionStatuses_UserId_SectionKey").IsUnique();

            entity.Property(e => e.SectionStatusId).ValueGeneratedNever();
            entity.Property(e => e.DataChecksum).HasMaxLength(80);
            entity.Property(e => e.OptOutReason).HasMaxLength(255);
            entity.Property(e => e.SectionKey).HasMaxLength(60);
            entity.Property(e => e.Status).HasMaxLength(20);

            entity.HasOne(d => d.User).WithMany(p => p.FinancialProfileSectionStatuses).HasForeignKey(d => d.UserId);
        });

        modelBuilder.Entity<FinancialProfileSnapshot>(entity =>
        {
            entity.HasKey(e => e.UserId);

            entity.Property(e => e.UserId).ValueGeneratedNever();
            entity.Property(e => e.CompletedSectionsJson).HasColumnType("jsonb");
            entity.Property(e => e.EffectiveTaxRatePercent).HasPrecision(8, 4);
            entity.Property(e => e.FederalWithholdingPercent).HasPrecision(8, 4);
            entity.Property(e => e.LongTermObligationCount).HasDefaultValue(0);
            entity.Property(e => e.LongTermObligationEstimate).HasPrecision(18, 2);
            entity.Property(e => e.MarginalTaxRatePercent).HasPrecision(8, 4);
            entity.Property(e => e.MonthlyCashFlowEstimate).HasPrecision(18, 2);
            entity.Property(e => e.MonthlyDebtServiceEstimate).HasPrecision(18, 2);
            entity.Property(e => e.MonthlyExpenseEstimate).HasPrecision(18, 2);
            entity.Property(e => e.NetWorthEstimate).HasPrecision(18, 2);
            entity.Property(e => e.OptedOutSectionsJson).HasColumnType("jsonb");
            entity.Property(e => e.OutstandingSectionsJson).HasColumnType("jsonb");
            entity.Property(e => e.TotalLiabilityBalance).HasPrecision(18, 2);
            entity.Property(e => e.UsesCpaOrPreparer).HasDefaultValue(false);

            entity.HasOne(d => d.User).WithOne(p => p.FinancialProfileSnapshot).HasForeignKey<FinancialProfileSnapshot>(d => d.UserId);
        });

        modelBuilder.Entity<FinancialProfileTaxProfile>(entity =>
        {
            entity.HasKey(e => e.UserId);

            entity.Property(e => e.UserId).ValueGeneratedNever();
            entity.Property(e => e.EffectiveRatePercent).HasPrecision(8, 4);
            entity.Property(e => e.ExpectedPaymentAmount).HasPrecision(18, 2);
            entity.Property(e => e.ExpectedRefundAmount).HasPrecision(18, 2);
            entity.Property(e => e.FederalWithholdingPercent).HasPrecision(8, 4);
            entity.Property(e => e.FilingStatus).HasMaxLength(40);
            entity.Property(e => e.MarginalRatePercent).HasPrecision(8, 4);
            entity.Property(e => e.Notes).HasMaxLength(300);
            entity.Property(e => e.StateOfResidence).HasMaxLength(80);

            entity.HasOne(d => d.User).WithOne(p => p.FinancialProfileTaxProfile).HasForeignKey<FinancialProfileTaxProfile>(d => d.UserId);
        });

        modelBuilder.Entity<Goal>(entity =>
        {
            entity.HasIndex(e => e.UserId, "IX_Goals_UserId");

            entity.Property(e => e.CurrentAmount).HasPrecision(18, 2);
            entity.Property(e => e.Description).HasMaxLength(1000);
            entity.Property(e => e.ExpectedAnnualReturn).HasPrecision(8, 4);
            entity.Property(e => e.MonthlyContribution).HasPrecision(18, 2);
            entity.Property(e => e.MonthlyExpenses).HasPrecision(18, 2);
            entity.Property(e => e.Name).HasMaxLength(200);
            entity.Property(e => e.RequiredMonthlyContribution).HasPrecision(18, 2);
            entity.Property(e => e.TargetAmount).HasPrecision(18, 2);
            entity.Property(e => e.TargetMonthlyIncome).HasPrecision(18, 2);
            entity.Property(e => e.WithdrawalRate).HasPrecision(8, 4);

            entity.HasOne(d => d.User).WithMany(p => p.Goals).HasForeignKey(d => d.UserId);
        });

        modelBuilder.Entity<GoalMilestone>(entity =>
        {
            entity.HasKey(e => e.MilestoneId);

            entity.HasIndex(e => e.GoalId, "IX_GoalMilestones_GoalId");

            entity.Property(e => e.Title).HasMaxLength(200);

            entity.HasOne(d => d.Goal).WithMany(p => p.GoalMilestones).HasForeignKey(d => d.GoalId);
        });

        modelBuilder.Entity<Holding>(entity =>
        {
            entity.HasIndex(e => new { e.AccountId, e.Symbol }, "IX_Holdings_AccountId_Symbol");

            entity.Property(e => e.AnnualDividendIncome).HasPrecision(18, 2);
            entity.Property(e => e.AnnualDividendYield).HasPrecision(8, 4);
            entity.Property(e => e.AverageCostBasis).HasPrecision(18, 8);
            entity.Property(e => e.CurrentPrice).HasPrecision(18, 8);
            entity.Property(e => e.Name).HasMaxLength(200);
            entity.Property(e => e.Quantity).HasPrecision(18, 8);
            entity.Property(e => e.StakingApy)
                .HasPrecision(8, 4)
                .HasColumnName("StakingAPY");
            entity.Property(e => e.Symbol).HasMaxLength(20);

            entity.HasOne(d => d.Account).WithMany(p => p.Holdings).HasForeignKey(d => d.AccountId);
        });

        modelBuilder.Entity<IncomeSource>(entity =>
        {
            entity.HasIndex(e => e.UserId, "IX_IncomeSources_UserId");

            entity.Property(e => e.Amount).HasPrecision(18, 2);
            entity.Property(e => e.AnnualGrowthRate).HasPrecision(8, 4);
            entity.Property(e => e.GovernmentAgency).HasMaxLength(100);
            entity.Property(e => e.GsPayScale).HasColumnName("GS_PayScale");
            entity.Property(e => e.IsVacombined).HasColumnName("IsVACombined");
            entity.Property(e => e.IsW2income).HasColumnName("IsW2Income");
            entity.Property(e => e.Name).HasMaxLength(200);
            entity.Property(e => e.Symbol).HasMaxLength(20);
            entity.Property(e => e.VadisabilityPercentage).HasColumnName("VADisabilityPercentage");

            entity.HasOne(d => d.User).WithMany(p => p.IncomeSources).HasForeignKey(d => d.UserId);
        });

        modelBuilder.Entity<IncomeStream>(entity =>
        {
            entity.HasIndex(e => new { e.UserId, e.Name, e.IncomeType }, "IX_IncomeStreams_UserId_Name_IncomeType");

            entity.Property(e => e.IncomeStreamId).ValueGeneratedNever();
            entity.Property(e => e.AnnualAmount).HasPrecision(18, 2);
            entity.Property(e => e.IncomeType).HasMaxLength(100);
            entity.Property(e => e.MonthlyAmount).HasPrecision(18, 2);
            entity.Property(e => e.Name).HasMaxLength(200);

            entity.HasOne(d => d.User).WithMany(p => p.IncomeStreams).HasForeignKey(d => d.UserId);
        });

        modelBuilder.Entity<InsurancePolicy>(entity =>
        {
            entity.HasKey(e => e.InsuranceId);

            entity.HasIndex(e => e.UserId, "IX_InsurancePolicies_UserId");

            entity.Property(e => e.Beneficiaries).HasMaxLength(500);
            entity.Property(e => e.CashValue).HasPrecision(18, 2);
            entity.Property(e => e.CashValueGrowthRate).HasPrecision(8, 4);
            entity.Property(e => e.CoverageAmount).HasPrecision(18, 2);
            entity.Property(e => e.Deductible).HasPrecision(18, 2);
            entity.Property(e => e.HasHsa).HasColumnName("HasHSA");
            entity.Property(e => e.HsacontributionLimit)
                .HasPrecision(18, 2)
                .HasColumnName("HSAContributionLimit");
            entity.Property(e => e.InsuranceCompany).HasMaxLength(150);
            entity.Property(e => e.MonthlyBenefit).HasPrecision(18, 2);
            entity.Property(e => e.NetworkType).HasMaxLength(100);
            entity.Property(e => e.OutOfPocketMax).HasPrecision(18, 2);
            entity.Property(e => e.PolicyName).HasMaxLength(200);
            entity.Property(e => e.PolicyNumber).HasMaxLength(50);
            entity.Property(e => e.PremiumAmount).HasPrecision(18, 2);
            entity.Property(e => e.PropertyAddress).HasMaxLength(200);
            entity.Property(e => e.PropertyValue).HasPrecision(18, 2);
            entity.Property(e => e.RecommendedCoverageAmount).HasPrecision(18, 2);
            entity.Property(e => e.ReplacementCost).HasPrecision(18, 2);
            entity.Property(e => e.VehicleDescription).HasMaxLength(100);
            entity.Property(e => e.VehicleValue).HasPrecision(18, 2);
            entity.Property(e => e.Vin)
                .HasMaxLength(17)
                .HasColumnName("VIN");

            entity.HasOne(d => d.User).WithMany(p => p.InsurancePolicies).HasForeignKey(d => d.UserId);
        });

        modelBuilder.Entity<InvestmentAccount>(entity =>
        {
            entity.HasIndex(e => new { e.UserId, e.AccountName, e.AccountCategory }, "IX_InvestmentAccounts_UserId_AccountName_AccountCategory");

            entity.Property(e => e.InvestmentAccountId).ValueGeneratedNever();
            entity.Property(e => e.AccountCategory).HasMaxLength(60);
            entity.Property(e => e.AccountName).HasMaxLength(200);
            entity.Property(e => e.AssetClass).HasMaxLength(60);
            entity.Property(e => e.ContributionRatePercent).HasPrecision(8, 4);
            entity.Property(e => e.CostBasis).HasPrecision(18, 2);
            entity.Property(e => e.CurrentValue).HasPrecision(18, 2);
            entity.Property(e => e.Institution).HasMaxLength(150);

            entity.HasOne(d => d.User).WithMany(p => p.InvestmentAccounts).HasForeignKey(d => d.UserId);
        });

        modelBuilder.Entity<MarketContext>(entity =>
        {
            entity.Property(e => e.AffectedSectors).HasColumnType("jsonb");
            entity.Property(e => e.CryptoSentiment).HasMaxLength(20);
            entity.Property(e => e.DailySummary).HasMaxLength(2000);
            entity.Property(e => e.GenerationCost).HasPrecision(10, 6);
            entity.Property(e => e.MajorEvents).HasColumnType("jsonb");
            entity.Property(e => e.MarketSentiment).HasMaxLength(20);
            entity.Property(e => e.ModelUsed).HasMaxLength(50);
            entity.Property(e => e.Spychange)
                .HasPrecision(8, 4)
                .HasColumnName("SPYChange");
            entity.Property(e => e.TreasuryYield10Y).HasMaxLength(10);
            entity.Property(e => e.Vixlevel)
                .HasPrecision(8, 2)
                .HasColumnName("VIXLevel");
        });

        modelBuilder.Entity<OnboardingProgress>(entity =>
        {
            entity.HasKey(e => e.UserId);

            entity.ToTable("OnboardingProgress");

            entity.HasIndex(e => e.UpdatedUtc, "IX_OnboardingProgress_UpdatedUtc");

            entity.Property(e => e.UserId).ValueGeneratedNever();
            entity.Property(e => e.CompletedStepIds).HasColumnType("jsonb");
            entity.Property(e => e.CurrentStepId).HasMaxLength(100);
            entity.Property(e => e.StepPayloads).HasColumnType("jsonb");

            entity.HasOne(d => d.User).WithOne(p => p.OnboardingProgress).HasForeignKey<OnboardingProgress>(d => d.UserId);
        });

        modelBuilder.Entity<Property>(entity =>
        {
            entity.HasIndex(e => new { e.UserId, e.PropertyName }, "IX_Properties_UserId_PropertyName");

            entity.Property(e => e.PropertyId).ValueGeneratedNever();
            entity.Property(e => e.EstimatedValue).HasPrecision(18, 2);
            entity.Property(e => e.MonthlyExpenses).HasPrecision(18, 2);
            entity.Property(e => e.MonthlyMortgagePayment).HasPrecision(18, 2);
            entity.Property(e => e.MonthlyRentalIncome).HasPrecision(18, 2);
            entity.Property(e => e.MortgageBalance).HasPrecision(18, 2);
            entity.Property(e => e.Occupancy).HasMaxLength(60);
            entity.Property(e => e.PropertyName).HasMaxLength(200);
            entity.Property(e => e.PropertyType).HasMaxLength(100);

            entity.HasOne(d => d.User).WithMany(p => p.Properties).HasForeignKey(d => d.UserId);
        });

        modelBuilder.Entity<RealEstateProperty>(entity =>
        {
            entity.HasKey(e => e.RealEstateId);

            entity.HasIndex(e => e.UserId, "IX_RealEstateProperties_UserId");

            entity.Property(e => e.Address).HasMaxLength(500);
            entity.Property(e => e.Notes).HasMaxLength(1000);
            entity.Property(e => e.PropertyName).HasMaxLength(200);

            entity.HasOne(d => d.User).WithMany(p => p.RealEstateProperties).HasForeignKey(d => d.UserId);
        });

        modelBuilder.Entity<PFMP_API.Models.Temp.Task>(entity =>
        {
            entity.HasIndex(e => e.CreatedDate, "IX_Tasks_CreatedDate");

            entity.HasIndex(e => e.DueDate, "IX_Tasks_DueDate");

            entity.HasIndex(e => e.SourceAlertId, "IX_Tasks_SourceAlertId");

            entity.HasIndex(e => new { e.UserId, e.Status }, "IX_Tasks_UserId_Status");

            entity.Property(e => e.ConfidenceScore).HasPrecision(5, 2);
            entity.Property(e => e.EstimatedImpact).HasPrecision(18, 2);
            entity.Property(e => e.SourceType).HasMaxLength(30);
            entity.Property(e => e.Title).HasMaxLength(200);

            entity.HasOne(d => d.SourceAlert).WithMany(p => p.Tasks)
                .HasForeignKey(d => d.SourceAlertId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(d => d.User).WithMany(p => p.Tasks).HasForeignKey(d => d.UserId);
        });

        modelBuilder.Entity<Transaction>(entity =>
        {
            entity.HasIndex(e => e.AccountId, "IX_Transactions_AccountId");

            entity.HasIndex(e => e.HoldingId, "IX_Transactions_HoldingId");

            entity.HasIndex(e => e.TransactionDate, "IX_Transactions_TransactionDate");

            entity.HasIndex(e => e.TransactionType, "IX_Transactions_TransactionType");

            entity.Property(e => e.Amount).HasPrecision(18, 2);
            entity.Property(e => e.CapitalGainLoss).HasPrecision(18, 2);
            entity.Property(e => e.CostBasis).HasPrecision(18, 2);
            entity.Property(e => e.Description).HasMaxLength(500);
            entity.Property(e => e.ExternalTransactionId).HasMaxLength(100);
            entity.Property(e => e.Fee).HasPrecision(18, 2);
            entity.Property(e => e.Price).HasPrecision(18, 8);
            entity.Property(e => e.Quantity).HasPrecision(18, 8);
            entity.Property(e => e.StakingApy)
                .HasPrecision(8, 4)
                .HasColumnName("StakingAPY");
            entity.Property(e => e.StakingReward).HasPrecision(18, 2);
            entity.Property(e => e.Symbol).HasMaxLength(20);
            entity.Property(e => e.TaxableAmount).HasPrecision(18, 2);
            entity.Property(e => e.TransactionType).HasMaxLength(100);

            entity.HasOne(d => d.Account).WithMany(p => p.Transactions).HasForeignKey(d => d.AccountId);

            entity.HasOne(d => d.Holding).WithMany(p => p.Transactions)
                .HasForeignKey(d => d.HoldingId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<TspLifecyclePosition>(entity =>
        {
            entity.HasIndex(e => new { e.UserId, e.FundCode }, "IX_TspLifecyclePositions_UserId_FundCode").IsUnique();

            entity.Property(e => e.ContributionPercent).HasPrecision(8, 4);
            entity.Property(e => e.CurrentMarketValue).HasPrecision(18, 2);
            entity.Property(e => e.CurrentMixPercent).HasPrecision(8, 4);
            entity.Property(e => e.CurrentPrice).HasPrecision(18, 6);
            entity.Property(e => e.FundCode).HasMaxLength(10);
            entity.Property(e => e.Units).HasPrecision(18, 6);

            entity.HasOne(d => d.User).WithMany(p => p.TspLifecyclePositions).HasForeignKey(d => d.UserId);
        });

        modelBuilder.Entity<TspPositionSnapshot>(entity =>
        {
            entity.HasIndex(e => new { e.UserId, e.AsOfUtc }, "IX_TspPositionSnapshots_UserId_AsOfUtc");

            entity.HasIndex(e => new { e.UserId, e.FundCode, e.AsOfUtc }, "IX_TspPositionSnapshots_UserId_FundCode_AsOfUtc");

            entity.Property(e => e.AllocationPercent).HasPrecision(8, 4);
            entity.Property(e => e.FundCode).HasMaxLength(10);
            entity.Property(e => e.MarketValue).HasPrecision(18, 2);
            entity.Property(e => e.MixPercent).HasPrecision(8, 4);
            entity.Property(e => e.Price).HasPrecision(18, 6);
            entity.Property(e => e.Units).HasPrecision(18, 6);

            entity.HasOne(d => d.User).WithMany(p => p.TspPositionSnapshots).HasForeignKey(d => d.UserId);
        });

        modelBuilder.Entity<TspProfile>(entity =>
        {
            entity.HasKey(e => e.UserId);

            entity.Property(e => e.UserId).ValueGeneratedNever();
            entity.Property(e => e.CfundPercent)
                .HasPrecision(8, 4)
                .HasColumnName("CFundPercent");
            entity.Property(e => e.ContributionRatePercent).HasPrecision(8, 4);
            entity.Property(e => e.CurrentBalance).HasPrecision(18, 2);
            entity.Property(e => e.EmployerMatchPercent).HasPrecision(8, 4);
            entity.Property(e => e.FfundPercent)
                .HasPrecision(8, 4)
                .HasColumnName("FFundPercent");
            entity.Property(e => e.GfundPercent)
                .HasPrecision(8, 4)
                .HasColumnName("GFundPercent");
            entity.Property(e => e.IfundPercent)
                .HasPrecision(8, 4)
                .HasColumnName("IFundPercent");
            entity.Property(e => e.LifecycleBalance).HasPrecision(18, 2);
            entity.Property(e => e.LifecyclePercent).HasPrecision(8, 4);
            entity.Property(e => e.OptOutReason).HasMaxLength(255);
            entity.Property(e => e.SfundPercent)
                .HasPrecision(8, 4)
                .HasColumnName("SFundPercent");
            entity.Property(e => e.TargetBalance).HasPrecision(18, 2);
            entity.Property(e => e.TotalBalance).HasPrecision(18, 2);

            entity.HasOne(d => d.User).WithOne(p => p.TspProfile).HasForeignKey<TspProfile>(d => d.UserId);
        });

        modelBuilder.Entity<TspfundPrice>(entity =>
        {
            entity.ToTable("TSPFundPrices");

            entity.Property(e => e.TspfundPriceId).HasColumnName("TSPFundPriceId");
            entity.Property(e => e.CfundPrice)
                .HasPrecision(18, 8)
                .HasColumnName("CFundPrice");
            entity.Property(e => e.DataSource).HasMaxLength(100);
            entity.Property(e => e.FfundPrice)
                .HasPrecision(18, 8)
                .HasColumnName("FFundPrice");
            entity.Property(e => e.GfundPrice)
                .HasPrecision(18, 8)
                .HasColumnName("GFundPrice");
            entity.Property(e => e.IfundPrice)
                .HasPrecision(18, 8)
                .HasColumnName("IFundPrice");
            entity.Property(e => e.L2030fundPrice)
                .HasPrecision(18, 8)
                .HasColumnName("L2030FundPrice");
            entity.Property(e => e.L2035fundPrice)
                .HasPrecision(18, 8)
                .HasColumnName("L2035FundPrice");
            entity.Property(e => e.L2040fundPrice)
                .HasPrecision(18, 8)
                .HasColumnName("L2040FundPrice");
            entity.Property(e => e.L2045fundPrice)
                .HasPrecision(18, 8)
                .HasColumnName("L2045FundPrice");
            entity.Property(e => e.L2050fundPrice)
                .HasPrecision(18, 8)
                .HasColumnName("L2050FundPrice");
            entity.Property(e => e.L2055fundPrice)
                .HasPrecision(18, 8)
                .HasColumnName("L2055FundPrice");
            entity.Property(e => e.L2060fundPrice)
                .HasPrecision(18, 8)
                .HasColumnName("L2060FundPrice");
            entity.Property(e => e.L2065fundPrice)
                .HasPrecision(18, 8)
                .HasColumnName("L2065FundPrice");
            entity.Property(e => e.L2070fundPrice)
                .HasPrecision(18, 8)
                .HasColumnName("L2070FundPrice");
            entity.Property(e => e.L2075fundPrice)
                .HasPrecision(18, 8)
                .HasColumnName("L2075FundPrice");
            entity.Property(e => e.LincomeFundPrice)
                .HasPrecision(18, 8)
                .HasColumnName("LIncomeFundPrice");
            entity.Property(e => e.SfundPrice)
                .HasPrecision(18, 8)
                .HasColumnName("SFundPrice");
        });

        modelBuilder.Entity<User>(entity =>
        {
            entity.HasIndex(e => e.Email, "IX_Users_Email").IsUnique();

            entity.Property(e => e.AnnualIncome).HasPrecision(18, 2);
            entity.Property(e => e.BypassAuthentication).HasDefaultValue(false);
            entity.Property(e => e.Email).HasMaxLength(255);
            entity.Property(e => e.EmergencyFundTarget).HasPrecision(18, 2);
            entity.Property(e => e.FailedLoginAttempts).HasDefaultValue(0);
            entity.Property(e => e.FirstName).HasMaxLength(100);
            entity.Property(e => e.HouseholdServiceNotes).HasMaxLength(500);
            entity.Property(e => e.IsActive).HasDefaultValue(false);
            entity.Property(e => e.IsTestAccount).HasDefaultValue(false);
            entity.Property(e => e.LastName).HasMaxLength(100);
            entity.Property(e => e.LiquidityBufferMonths).HasPrecision(5, 2);
            entity.Property(e => e.MaritalStatus).HasMaxLength(60);
            entity.Property(e => e.PhoneNumber).HasMaxLength(20);
            entity.Property(e => e.PreferredName).HasMaxLength(100);
            entity.Property(e => e.ProfileSetupComplete).HasDefaultValue(false);
            entity.Property(e => e.RetirementGoalAmount).HasPrecision(18, 2);
            entity.Property(e => e.SetupProgressPercentage).HasDefaultValue(0);
            entity.Property(e => e.TargetMonthlyPassiveIncome).HasPrecision(18, 2);
            entity.Property(e => e.VadisabilityMonthlyAmount)
                .HasPrecision(18, 2)
                .HasColumnName("VADisabilityMonthlyAmount");
            entity.Property(e => e.VadisabilityPercentage).HasColumnName("VADisabilityPercentage");
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
