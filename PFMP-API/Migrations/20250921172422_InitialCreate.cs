using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace PFMP_API.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Users",
                columns: table => new
                {
                    UserId = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    FirstName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    LastName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Email = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    PhoneNumber = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    RiskTolerance = table.Column<int>(type: "integer", nullable: false),
                    LastRiskAssessment = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    RetirementGoalAmount = table.Column<decimal>(type: "numeric(18,2)", nullable: true),
                    TargetMonthlyPassiveIncome = table.Column<decimal>(type: "numeric(18,2)", nullable: true),
                    TargetRetirementDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    EmergencyFundTarget = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    VADisabilityMonthlyAmount = table.Column<decimal>(type: "numeric(18,2)", nullable: true),
                    VADisabilityPercentage = table.Column<int>(type: "integer", nullable: true),
                    IsGovernmentEmployee = table.Column<bool>(type: "boolean", nullable: false),
                    GovernmentAgency = table.Column<string>(type: "text", nullable: true),
                    EnableRebalancingAlerts = table.Column<bool>(type: "boolean", nullable: false),
                    RebalancingThreshold = table.Column<decimal>(type: "numeric", nullable: false),
                    EnableTaxOptimization = table.Column<bool>(type: "boolean", nullable: false),
                    EnablePushNotifications = table.Column<bool>(type: "boolean", nullable: false),
                    EnableEmailAlerts = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Users", x => x.UserId);
                });

            migrationBuilder.CreateTable(
                name: "Accounts",
                columns: table => new
                {
                    AccountId = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UserId = table.Column<int>(type: "integer", nullable: false),
                    AccountName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    AccountType = table.Column<int>(type: "integer", nullable: false),
                    Category = table.Column<int>(type: "integer", nullable: false),
                    Institution = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    AccountNumber = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    CurrentBalance = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    InterestRate = table.Column<decimal>(type: "numeric(18,8)", nullable: true),
                    InterestRateUpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    HasAPIIntegration = table.Column<bool>(type: "boolean", nullable: false),
                    APIProvider = table.Column<string>(type: "text", nullable: true),
                    IsAPIConnected = table.Column<bool>(type: "boolean", nullable: false),
                    LastAPISync = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    APIConnectionStatus = table.Column<string>(type: "text", nullable: true),
                    TSPMonthlyContribution = table.Column<decimal>(type: "numeric(18,2)", nullable: true),
                    TSPEmployerMatch = table.Column<decimal>(type: "numeric(18,2)", nullable: true),
                    TSP_GFundPercentage = table.Column<decimal>(type: "numeric(5,2)", nullable: true),
                    TSP_FFundPercentage = table.Column<decimal>(type: "numeric(5,2)", nullable: true),
                    TSP_CFundPercentage = table.Column<decimal>(type: "numeric(5,2)", nullable: true),
                    TSP_SFundPercentage = table.Column<decimal>(type: "numeric(5,2)", nullable: true),
                    TSP_IFundPercentage = table.Column<decimal>(type: "numeric(5,2)", nullable: true),
                    TSP_LastUpdated = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsEmergencyFund = table.Column<bool>(type: "boolean", nullable: false),
                    OptimalInterestRate = table.Column<decimal>(type: "numeric", nullable: true),
                    RateLastChecked = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    LastBalanceUpdate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    Notes = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Accounts", x => x.AccountId);
                    table.ForeignKey(
                        name: "FK_Accounts_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Alerts",
                columns: table => new
                {
                    AlertId = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UserId = table.Column<int>(type: "integer", nullable: false),
                    Title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Message = table.Column<string>(type: "text", nullable: false),
                    Severity = table.Column<int>(type: "integer", nullable: false),
                    Category = table.Column<int>(type: "integer", nullable: false),
                    IsRead = table.Column<bool>(type: "boolean", nullable: false),
                    IsActionable = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ReadAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ExpiresAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ActionUrl = table.Column<string>(type: "text", nullable: true),
                    Metadata = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Alerts", x => x.AlertId);
                    table.ForeignKey(
                        name: "FK_Alerts_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Goals",
                columns: table => new
                {
                    GoalId = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UserId = table.Column<int>(type: "integer", nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    Type = table.Column<int>(type: "integer", nullable: false),
                    Category = table.Column<int>(type: "integer", nullable: false),
                    TargetAmount = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    CurrentAmount = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    TargetDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    MonthlyContribution = table.Column<decimal>(type: "numeric(18,2)", nullable: true),
                    RequiredMonthlyContribution = table.Column<decimal>(type: "numeric(18,2)", nullable: true),
                    TargetMonthlyIncome = table.Column<decimal>(type: "numeric(18,2)", nullable: true),
                    ExpectedAnnualReturn = table.Column<decimal>(type: "numeric(8,4)", nullable: true),
                    WithdrawalRate = table.Column<decimal>(type: "numeric(8,4)", nullable: true),
                    RetirementAgeTarget = table.Column<int>(type: "integer", nullable: true),
                    MonthsOfExpenses = table.Column<int>(type: "integer", nullable: true),
                    MonthlyExpenses = table.Column<decimal>(type: "numeric(18,2)", nullable: true),
                    RiskTolerance = table.Column<int>(type: "integer", nullable: false),
                    Strategy = table.Column<int>(type: "integer", nullable: false),
                    Priority = table.Column<int>(type: "integer", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CompletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Notes = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Goals", x => x.GoalId);
                    table.ForeignKey(
                        name: "FK_Goals_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "IncomeSources",
                columns: table => new
                {
                    IncomeSourceId = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UserId = table.Column<int>(type: "integer", nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Type = table.Column<int>(type: "integer", nullable: false),
                    Frequency = table.Column<int>(type: "integer", nullable: false),
                    Amount = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    Reliability = table.Column<int>(type: "integer", nullable: false),
                    IsGuaranteed = table.Column<bool>(type: "boolean", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    IsTaxable = table.Column<bool>(type: "boolean", nullable: false),
                    IsW2Income = table.Column<bool>(type: "boolean", nullable: false),
                    Is1099Income = table.Column<bool>(type: "boolean", nullable: false),
                    VADisabilityPercentage = table.Column<int>(type: "integer", nullable: true),
                    IsVACombined = table.Column<bool>(type: "boolean", nullable: false),
                    GovernmentAgency = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    GS_PayScale = table.Column<string>(type: "text", nullable: true),
                    Symbol = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    DividendYield = table.Column<decimal>(type: "numeric", nullable: true),
                    StartDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    EndDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    NextPaymentDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    AnnualGrowthRate = table.Column<decimal>(type: "numeric(8,4)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Notes = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_IncomeSources", x => x.IncomeSourceId);
                    table.ForeignKey(
                        name: "FK_IncomeSources_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "InsurancePolicies",
                columns: table => new
                {
                    InsuranceId = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UserId = table.Column<int>(type: "integer", nullable: false),
                    PolicyName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Type = table.Column<int>(type: "integer", nullable: false),
                    InsuranceCompany = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    PolicyNumber = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    CoverageAmount = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    Deductible = table.Column<decimal>(type: "numeric(18,2)", nullable: true),
                    OutOfPocketMax = table.Column<decimal>(type: "numeric(18,2)", nullable: true),
                    PremiumAmount = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    PremiumFrequency = table.Column<int>(type: "integer", nullable: false),
                    PolicyStartDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    PolicyEndDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    RenewalDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    LastPremiumPayment = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    NextPremiumDue = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CashValue = table.Column<decimal>(type: "numeric(18,2)", nullable: true),
                    CashValueGrowthRate = table.Column<decimal>(type: "numeric(8,4)", nullable: true),
                    IsTerm = table.Column<bool>(type: "boolean", nullable: false),
                    TermLengthYears = table.Column<int>(type: "integer", nullable: true),
                    Beneficiaries = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    VehicleDescription = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    VIN = table.Column<string>(type: "character varying(17)", maxLength: 17, nullable: true),
                    VehicleValue = table.Column<decimal>(type: "numeric(18,2)", nullable: true),
                    PropertyAddress = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    PropertyValue = table.Column<decimal>(type: "numeric(18,2)", nullable: true),
                    ReplacementCost = table.Column<decimal>(type: "numeric(18,2)", nullable: true),
                    MonthlyBenefit = table.Column<decimal>(type: "numeric(18,2)", nullable: true),
                    BenefitPeriodMonths = table.Column<int>(type: "integer", nullable: true),
                    WaitingPeriodDays = table.Column<int>(type: "integer", nullable: true),
                    NetworkType = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    HasHSA = table.Column<bool>(type: "boolean", nullable: false),
                    HSAContributionLimit = table.Column<decimal>(type: "numeric(18,2)", nullable: true),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    NeedsReview = table.Column<bool>(type: "boolean", nullable: false),
                    LastReviewDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsAdequateCoverage = table.Column<bool>(type: "boolean", nullable: false),
                    RecommendedCoverageAmount = table.Column<decimal>(type: "numeric(18,2)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Notes = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_InsurancePolicies", x => x.InsuranceId);
                    table.ForeignKey(
                        name: "FK_InsurancePolicies_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "RealEstateProperties",
                columns: table => new
                {
                    RealEstateId = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UserId = table.Column<int>(type: "integer", nullable: false),
                    PropertyName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Address = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    PropertyType = table.Column<int>(type: "integer", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    PurchasePrice = table.Column<decimal>(type: "numeric", nullable: false),
                    PurchaseDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CurrentMarketValue = table.Column<decimal>(type: "numeric", nullable: false),
                    LastAppraisalDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    MortgageBalance = table.Column<decimal>(type: "numeric", nullable: false),
                    MortgageInterestRate = table.Column<decimal>(type: "numeric", nullable: false),
                    MortgageMaturityDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    MonthlyMortgagePayment = table.Column<decimal>(type: "numeric", nullable: false),
                    MonthlyRentalIncome = table.Column<decimal>(type: "numeric", nullable: false),
                    MonthlyExpenses = table.Column<decimal>(type: "numeric", nullable: false),
                    SecurityDeposit = table.Column<decimal>(type: "numeric", nullable: false),
                    LeaseStartDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    LeaseEndDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    SquareFootage = table.Column<int>(type: "integer", nullable: true),
                    Bedrooms = table.Column<int>(type: "integer", nullable: true),
                    Bathrooms = table.Column<int>(type: "integer", nullable: true),
                    YearBuilt = table.Column<int>(type: "integer", nullable: true),
                    AnnualPropertyTaxes = table.Column<decimal>(type: "numeric", nullable: false),
                    AnnualInsurance = table.Column<decimal>(type: "numeric", nullable: false),
                    Notes = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RealEstateProperties", x => x.RealEstateId);
                    table.ForeignKey(
                        name: "FK_RealEstateProperties_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "APICredentials",
                columns: table => new
                {
                    APICredentialId = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    AccountId = table.Column<int>(type: "integer", nullable: false),
                    ProviderName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    EncryptedApiKey = table.Column<string>(type: "text", nullable: false),
                    EncryptedApiSecret = table.Column<string>(type: "text", nullable: true),
                    RefreshToken = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    LastUsed = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ExpiresAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_APICredentials", x => x.APICredentialId);
                    table.ForeignKey(
                        name: "FK_APICredentials_Accounts_AccountId",
                        column: x => x.AccountId,
                        principalTable: "Accounts",
                        principalColumn: "AccountId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Holdings",
                columns: table => new
                {
                    HoldingId = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    AccountId = table.Column<int>(type: "integer", nullable: false),
                    Symbol = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    AssetType = table.Column<int>(type: "integer", nullable: false),
                    Quantity = table.Column<decimal>(type: "numeric(18,8)", nullable: false),
                    AverageCostBasis = table.Column<decimal>(type: "numeric(18,8)", nullable: false),
                    CurrentPrice = table.Column<decimal>(type: "numeric(18,8)", nullable: false),
                    AnnualDividendYield = table.Column<decimal>(type: "numeric(8,4)", nullable: true),
                    StakingAPY = table.Column<decimal>(type: "numeric(8,4)", nullable: true),
                    AnnualDividendIncome = table.Column<decimal>(type: "numeric(18,2)", nullable: true),
                    LastDividendDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    NextDividendDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Beta = table.Column<decimal>(type: "numeric", nullable: true),
                    SectorAllocation = table.Column<string>(type: "text", nullable: true),
                    GeographicAllocation = table.Column<string>(type: "text", nullable: true),
                    IsQualifiedDividend = table.Column<bool>(type: "boolean", nullable: false),
                    PurchaseDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsLongTermCapitalGains = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    LastPriceUpdate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Notes = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Holdings", x => x.HoldingId);
                    table.ForeignKey(
                        name: "FK_Holdings_Accounts_AccountId",
                        column: x => x.AccountId,
                        principalTable: "Accounts",
                        principalColumn: "AccountId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "GoalMilestones",
                columns: table => new
                {
                    MilestoneId = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    GoalId = table.Column<int>(type: "integer", nullable: false),
                    Title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "text", nullable: true),
                    TargetAmount = table.Column<decimal>(type: "numeric", nullable: false),
                    CurrentAmount = table.Column<decimal>(type: "numeric", nullable: false),
                    TargetDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CompletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GoalMilestones", x => x.MilestoneId);
                    table.ForeignKey(
                        name: "FK_GoalMilestones_Goals_GoalId",
                        column: x => x.GoalId,
                        principalTable: "Goals",
                        principalColumn: "GoalId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Transactions",
                columns: table => new
                {
                    TransactionId = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    AccountId = table.Column<int>(type: "integer", nullable: false),
                    HoldingId = table.Column<int>(type: "integer", nullable: true),
                    TransactionType = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Symbol = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    Quantity = table.Column<decimal>(type: "numeric(18,8)", nullable: true),
                    Price = table.Column<decimal>(type: "numeric(18,8)", nullable: true),
                    Amount = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    Fee = table.Column<decimal>(type: "numeric(18,2)", nullable: true),
                    TransactionDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    SettlementDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    IsTaxable = table.Column<bool>(type: "boolean", nullable: false),
                    IsLongTermCapitalGains = table.Column<bool>(type: "boolean", nullable: false),
                    TaxableAmount = table.Column<decimal>(type: "numeric(18,2)", nullable: true),
                    CostBasis = table.Column<decimal>(type: "numeric(18,2)", nullable: true),
                    CapitalGainLoss = table.Column<decimal>(type: "numeric(18,2)", nullable: true),
                    Source = table.Column<int>(type: "integer", nullable: false),
                    ExternalTransactionId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    Description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    IsDividendReinvestment = table.Column<bool>(type: "boolean", nullable: false),
                    IsQualifiedDividend = table.Column<bool>(type: "boolean", nullable: false),
                    StakingReward = table.Column<decimal>(type: "numeric(18,2)", nullable: true),
                    StakingAPY = table.Column<decimal>(type: "numeric(8,4)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Notes = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Transactions", x => x.TransactionId);
                    table.ForeignKey(
                        name: "FK_Transactions_Accounts_AccountId",
                        column: x => x.AccountId,
                        principalTable: "Accounts",
                        principalColumn: "AccountId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Transactions_Holdings_HoldingId",
                        column: x => x.HoldingId,
                        principalTable: "Holdings",
                        principalColumn: "HoldingId",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Accounts_UserId",
                table: "Accounts",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_Alerts_CreatedAt",
                table: "Alerts",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_Alerts_UserId_IsRead",
                table: "Alerts",
                columns: new[] { "UserId", "IsRead" });

            migrationBuilder.CreateIndex(
                name: "IX_APICredentials_AccountId",
                table: "APICredentials",
                column: "AccountId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_GoalMilestones_GoalId",
                table: "GoalMilestones",
                column: "GoalId");

            migrationBuilder.CreateIndex(
                name: "IX_Goals_UserId",
                table: "Goals",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_Holdings_AccountId_Symbol",
                table: "Holdings",
                columns: new[] { "AccountId", "Symbol" });

            migrationBuilder.CreateIndex(
                name: "IX_IncomeSources_UserId",
                table: "IncomeSources",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_InsurancePolicies_UserId",
                table: "InsurancePolicies",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_RealEstateProperties_UserId",
                table: "RealEstateProperties",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_Transactions_AccountId",
                table: "Transactions",
                column: "AccountId");

            migrationBuilder.CreateIndex(
                name: "IX_Transactions_HoldingId",
                table: "Transactions",
                column: "HoldingId");

            migrationBuilder.CreateIndex(
                name: "IX_Transactions_TransactionDate",
                table: "Transactions",
                column: "TransactionDate");

            migrationBuilder.CreateIndex(
                name: "IX_Transactions_TransactionType",
                table: "Transactions",
                column: "TransactionType");

            migrationBuilder.CreateIndex(
                name: "IX_Users_Email",
                table: "Users",
                column: "Email",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Alerts");

            migrationBuilder.DropTable(
                name: "APICredentials");

            migrationBuilder.DropTable(
                name: "GoalMilestones");

            migrationBuilder.DropTable(
                name: "IncomeSources");

            migrationBuilder.DropTable(
                name: "InsurancePolicies");

            migrationBuilder.DropTable(
                name: "RealEstateProperties");

            migrationBuilder.DropTable(
                name: "Transactions");

            migrationBuilder.DropTable(
                name: "Goals");

            migrationBuilder.DropTable(
                name: "Holdings");

            migrationBuilder.DropTable(
                name: "Accounts");

            migrationBuilder.DropTable(
                name: "Users");
        }
    }
}
