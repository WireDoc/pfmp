using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using PFMP_API.Models;
using PFMP_API.Models.FinancialProfile;

namespace PFMP_API.Services.FinancialProfile
{
    public class FinancialProfileService : IFinancialProfileService
    {
        private static readonly string[] SectionKeys = new[]
        {
            "household",
            "risk-goals",
            "tsp",
            "cash",
            "investments",
            "real-estate",
            "liabilities",
            "expenses",
            "tax",
            "insurance",
            "benefits",
            "income",
            "long-term-obligations",
            "equity"
        };

        private readonly ApplicationDbContext _db;
        private readonly ILogger<FinancialProfileService> _logger;
        private readonly TSPService _tspService;

        public FinancialProfileService(ApplicationDbContext db, ILogger<FinancialProfileService> logger, TSPService tspService)
        {
            _db = db;
            _logger = logger;
            _tspService = tspService;
        }

        // Normalize UI/DB fund codes to TSPService dictionary keys (G, F, C, S, I, LIncome, L2030, etc.)
        private static string NormalizeTspPriceKey(string code)
        {
            return TSPService.NormalizeFundCode(code);
        }

        // Compute the TSP snapshot "as-of" day (prior close). We approximate close as 22:00 UTC and skip weekends.
        private static DateTime GetTspAsOfUtc(DateTime nowUtc)
        {
            DateTime date = nowUtc;

            // If before approx 22:00 UTC (4-6pm ET, DST-adjusted), use previous business day
            if (date.TimeOfDay < TimeSpan.FromHours(22))
            {
                date = date.Date.AddDays(-1);
            }
            else
            {
                date = date.Date; // today
            }

            // Roll back to previous Friday if weekend
            while (date.DayOfWeek == DayOfWeek.Saturday || date.DayOfWeek == DayOfWeek.Sunday)
            {
                date = date.AddDays(-1);
            }

            // Return date aligned to midnight UTC for stable equality
            return DateTime.SpecifyKind(date, DateTimeKind.Utc);
        }

        public async Task UpsertHouseholdAsync(int userId, HouseholdProfileInput input, CancellationToken ct = default)
        {
            var user = await RequireUserAsync(userId, ct);

            if (input.OptOut?.IsOptedOut == true)
            {
                // Clear household specific optional fields when opting out.
                user.PreferredName = null;
                user.MaritalStatus = null;
                user.DependentCount = null;
                user.HouseholdServiceNotes = null;
            }
            else
            {
                if (!string.IsNullOrWhiteSpace(input.PreferredName))
                {
                    user.PreferredName = input.PreferredName.Trim();
                }
                if (!string.IsNullOrWhiteSpace(input.MaritalStatus))
                {
                    user.MaritalStatus = input.MaritalStatus.Trim();
                }
                user.DependentCount = input.DependentCount;
                if (!string.IsNullOrWhiteSpace(input.ServiceNotes))
                {
                    user.HouseholdServiceNotes = input.ServiceNotes.Trim();
                }
            }

            user.UpdatedAt = DateTime.UtcNow;

            await UpdateSectionStatusAsync(userId, "household", input.OptOut, input.OptOut?.IsOptedOut != true, ct);
            await _db.SaveChangesAsync(ct);
            await RecalculateSnapshotAsync(userId, ct);
        }

        public async Task UpsertRiskGoalsAsync(int userId, RiskGoalsInput input, CancellationToken ct = default)
        {
            var user = await RequireUserAsync(userId, ct);

            if (input.OptOut?.IsOptedOut == true)
            {
                // If opted out, clear goal-specific sliders but retain historical risk tolerance.
                user.RiskTolerance = user.RiskTolerance; // no-op, keep existing value
            }
            else
            {
                if (input.RiskTolerance.HasValue)
                {
                    user.RiskTolerance = Math.Clamp(input.RiskTolerance.Value, 1, 10);
                    user.LastRiskAssessment = DateTime.UtcNow;
                }
                if (input.TargetRetirementDate.HasValue)
                {
                    user.TargetRetirementDate = input.TargetRetirementDate;
                }
                if (input.PassiveIncomeGoal.HasValue)
                {
                    user.TargetMonthlyPassiveIncome = input.PassiveIncomeGoal.Value;
                }
                if (input.EmergencyFundTarget.HasValue)
                {
                    user.EmergencyFundTarget = input.EmergencyFundTarget.Value;
                }
                if (input.LiquidityBufferMonths.HasValue)
                {
                    user.LiquidityBufferMonths = input.LiquidityBufferMonths.Value;
                }
                if (input.TransactionalAccountDesiredBalance.HasValue)
                {
                    user.TransactionalAccountDesiredBalance = input.TransactionalAccountDesiredBalance.Value;
                }
            }

            user.UpdatedAt = DateTime.UtcNow;

            await UpdateSectionStatusAsync(userId, "risk-goals", input.OptOut, input.OptOut?.IsOptedOut != true, ct);
            await _db.SaveChangesAsync(ct);
            await RecalculateSnapshotAsync(userId, ct);
        }

        public async Task UpsertTspAsync(int userId, TspAllocationInput input, CancellationToken ct = default)
        {
            var tsp = await _db.TspProfiles.FirstOrDefaultAsync(t => t.UserId == userId, ct);
            if (tsp == null)
            {
                tsp = new TspProfile { UserId = userId };
                _db.TspProfiles.Add(tsp);
            }

            if (input.OptOut?.IsOptedOut == true)
            {
                tsp.IsOptedOut = true;
                tsp.OptOutReason = NormalizeReason(input.OptOut.Reason);
                tsp.OptOutAcknowledgedAt = input.OptOut.AcknowledgedAt ?? DateTime.UtcNow;
            }
            else
            {
                tsp.IsOptedOut = false;
                tsp.OptOutReason = null;
                tsp.OptOutAcknowledgedAt = null;

                tsp.ContributionRatePercent = input.ContributionRatePercent;
                // Compute employer match automatically: 1% automatic + match up to 4% dollar-for-dollar (cap 5%)
                var contrib = Math.Max(0m, input.ContributionRatePercent);
                var auto1 = 1m; // automatic 1%
                var match = Math.Min(4m, contrib); // up to 4% matched 1:1
                tsp.EmployerMatchPercent = Math.Min(5m, auto1 + match);
                tsp.CurrentBalance = input.CurrentBalance;
                tsp.TargetBalance = input.TargetBalance;
                tsp.GFundPercent = input.GFundPercent;
                tsp.FFundPercent = input.FFundPercent;
                tsp.CFundPercent = input.CFundPercent;
                tsp.SFundPercent = input.SFundPercent;
                tsp.IFundPercent = input.IFundPercent;
                tsp.LifecyclePercent = input.LifecyclePercent;
                tsp.LifecycleBalance = input.LifecycleBalance;
                tsp.LastUpdatedAt = DateTime.UtcNow;

                // Replace lifecycle positions for this user with provided set
                await _db.TspLifecyclePositions.Where(p => p.UserId == userId).ExecuteDeleteAsync(ct);
                if (input.LifecyclePositions != null && input.LifecyclePositions.Count > 0)
                {
                    var now = DateTime.UtcNow;
                    foreach (var p in input.LifecyclePositions)
                    {
                        if (string.IsNullOrWhiteSpace(p.FundCode)) continue;
                        _db.TspLifecyclePositions.Add(new Models.FinancialProfile.TspLifecyclePosition
                        {
                            UserId = userId,
                            FundCode = p.FundCode.Trim().ToUpperInvariant(),
                            ContributionPercent = p.ContributionPercent,
                            Units = p.Units,
                            DateUpdated = p.DateUpdated ?? now,
                            CreatedAt = now,
                            UpdatedAt = now
                        });
                    }
                }
            }

            await UpdateSectionStatusAsync(userId, "tsp", input.OptOut, input.OptOut?.IsOptedOut != true, ct);
            await _db.SaveChangesAsync(ct);
            await RecalculateSnapshotAsync(userId, ct);
        }

        public async Task UpsertCashAccountsAsync(int userId, CashAccountsInput input, CancellationToken ct = default)
        {
            await using var tx = await _db.Database.BeginTransactionAsync(ct);

            // Delete existing cash accounts from unified Accounts table
            await _db.Accounts
                .Where(a => a.UserId == userId && 
                    (a.AccountType == AccountType.Checking || 
                     a.AccountType == AccountType.Savings || 
                     a.AccountType == AccountType.MoneyMarket ||
                     a.AccountType == AccountType.CertificateOfDeposit))
                .ExecuteDeleteAsync(ct);

            if (input.OptOut?.IsOptedOut != true)
            {
                var now = DateTime.UtcNow;
                foreach (var account in input.Accounts)
                {
                    // Map old account type strings to new enum
                    var accountType = account.AccountType?.ToLower() switch
                    {
                        "checking" => AccountType.Checking,
                        "savings" => AccountType.Savings,
                        "money_market" or "money market" => AccountType.MoneyMarket,
                        "cd" or "certificate_of_deposit" => AccountType.CertificateOfDeposit,
                        _ => AccountType.Checking // Default to checking
                    };

                    var category = accountType == AccountType.MoneyMarket || accountType == AccountType.Savings 
                        ? AccountCategory.Cash 
                        : AccountCategory.Cash;

                    _db.Accounts.Add(new Account
                    {
                        UserId = userId,
                        AccountName = account.Nickname.Trim(),
                        AccountType = accountType,
                        Category = category,
                        Institution = account.Institution?.Trim(),
                        CurrentBalance = account.Balance,
                        InterestRate = account.InterestRateApr.HasValue ? account.InterestRateApr.Value / 100m : null, // Convert APR% to decimal
                        InterestRateUpdatedAt = account.RateLastChecked,
                        IsEmergencyFund = account.IsEmergencyFund,
                        RateLastChecked = account.RateLastChecked,
                        Purpose = account.Purpose?.Trim(),
                        CreatedAt = now,
                        UpdatedAt = now,
                        LastBalanceUpdate = now,
                        IsActive = true
                    });
                }
            }

            await UpdateSectionStatusAsync(userId, "cash", input.OptOut, input.OptOut?.IsOptedOut != true && input.Accounts.Count > 0, ct);
            await _db.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);
            await RecalculateSnapshotAsync(userId, ct);
        }

        public async Task UpsertInvestmentAccountsAsync(int userId, InvestmentAccountsInput input, CancellationToken ct = default)
        {
            await using var tx = await _db.Database.BeginTransactionAsync(ct);

            // Delete existing investment accounts from unified Accounts table
            await _db.Accounts
                .Where(a => a.UserId == userId && 
                    (a.AccountType == AccountType.Brokerage || 
                     a.AccountType == AccountType.RetirementAccountIRA || 
                     a.AccountType == AccountType.RetirementAccount401k || 
                     a.AccountType == AccountType.RetirementAccountRoth ||
                     a.AccountType == AccountType.HSA))
                .ExecuteDeleteAsync(ct);

            if (input.OptOut?.IsOptedOut != true)
            {
                var now = DateTime.UtcNow;
                foreach (var account in input.Accounts)
                {
                    // Map old account category strings to new enums
                    var accountType = account.AccountCategory?.ToLower() switch
                    {
                        "brokerage" or "taxable" => AccountType.Brokerage,
                        "401k" or "401(k)" => AccountType.RetirementAccount401k,
                        "ira" or "traditional_ira" => AccountType.RetirementAccountIRA,
                        "roth_ira" or "roth" => AccountType.RetirementAccountRoth,
                        "hsa" => AccountType.HSA,
                        _ => AccountType.Brokerage // Default to brokerage
                    };

                    var category = accountType switch
                    {
                        AccountType.Brokerage => AccountCategory.Taxable,
                        AccountType.RetirementAccountRoth => AccountCategory.TaxFree,
                        AccountType.HSA => AccountCategory.TaxAdvantaged,
                        _ => AccountCategory.TaxDeferred
                    };

                    _db.Accounts.Add(new Account
                    {
                        UserId = userId,
                        AccountName = account.AccountName.Trim(),
                        AccountType = accountType,
                        Category = category,
                        Institution = account.Institution?.Trim(),
                        CurrentBalance = account.CurrentValue,
                        CreatedAt = now,
                        UpdatedAt = now,
                        LastBalanceUpdate = now,
                        IsActive = true,
                        Notes = account.AssetClass != null ? $"Asset Class: {account.AssetClass}" : null
                    });
                }
            }

            await UpdateSectionStatusAsync(userId, "investments", input.OptOut, input.OptOut?.IsOptedOut != true && input.Accounts.Count > 0, ct);
            await _db.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);
            await RecalculateSnapshotAsync(userId, ct);
        }

        public async Task UpsertPropertiesAsync(int userId, PropertiesInput input, CancellationToken ct = default)
        {
            await using var tx = await _db.Database.BeginTransactionAsync(ct);

            await _db.Properties.Where(p => p.UserId == userId).ExecuteDeleteAsync(ct);

            if (input.OptOut?.IsOptedOut != true)
            {
                var now = DateTime.UtcNow;
                foreach (var property in input.Properties)
                {
                    _db.Properties.Add(new PropertyProfile
                    {
                        UserId = userId,
                        PropertyName = property.PropertyName.Trim(),
                        PropertyType = property.PropertyType,
                        Occupancy = property.Occupancy,
                        EstimatedValue = property.EstimatedValue,
                        MortgageBalance = property.MortgageBalance,
                        MonthlyMortgagePayment = property.MonthlyMortgagePayment,
                        MonthlyRentalIncome = property.MonthlyRentalIncome,
                        MonthlyExpenses = property.MonthlyExpenses,
                        HasHeloc = property.HasHeloc,
                        CreatedAt = now,
                        UpdatedAt = now
                    });
                }
            }

            await UpdateSectionStatusAsync(userId, "real-estate", input.OptOut, input.OptOut?.IsOptedOut != true && input.Properties.Count > 0, ct);
            await _db.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);
            await RecalculateSnapshotAsync(userId, ct);
        }

        public async Task UpsertLiabilitiesAsync(int userId, LiabilitiesInput input, CancellationToken ct = default)
        {
            await using var tx = await _db.Database.BeginTransactionAsync(ct);

            await _db.LiabilityAccounts.Where(l => l.UserId == userId).ExecuteDeleteAsync(ct);

            if (input.OptOut?.IsOptedOut != true)
            {
                var now = DateTime.UtcNow;
                foreach (var liability in input.Liabilities)
                {
                    _db.LiabilityAccounts.Add(new LiabilityAccount
                    {
                        UserId = userId,
                        LiabilityType = string.IsNullOrWhiteSpace(liability.LiabilityType) ? "other" : liability.LiabilityType.Trim(),
                        Lender = string.IsNullOrWhiteSpace(liability.Lender) ? null : liability.Lender.Trim(),
                        CurrentBalance = liability.CurrentBalance,
                        InterestRateApr = liability.InterestRateApr,
                        MinimumPayment = liability.MinimumPayment,
                        PayoffTargetDate = liability.PayoffTargetDate,
                        IsPriorityToEliminate = liability.IsPriorityToEliminate,
                        CreatedAt = now,
                        UpdatedAt = now
                    });
                }
            }

            await UpdateSectionStatusAsync(userId, "liabilities", input.OptOut, input.OptOut?.IsOptedOut != true && input.Liabilities.Count > 0, ct);
            await _db.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);
            await RecalculateSnapshotAsync(userId, ct);
        }

        public async Task UpsertExpensesAsync(int userId, ExpensesInput input, CancellationToken ct = default)
        {
            await using var tx = await _db.Database.BeginTransactionAsync(ct);

            await _db.ExpenseBudgets.Where(e => e.UserId == userId).ExecuteDeleteAsync(ct);

            if (input.OptOut?.IsOptedOut != true)
            {
                var now = DateTime.UtcNow;
                foreach (var expense in input.Expenses)
                {
                    _db.ExpenseBudgets.Add(new ExpenseBudget
                    {
                        UserId = userId,
                        Category = string.IsNullOrWhiteSpace(expense.Category) ? "general" : expense.Category.Trim(),
                        MonthlyAmount = expense.MonthlyAmount,
                        IsEstimated = expense.IsEstimated,
                        Notes = string.IsNullOrWhiteSpace(expense.Notes) ? null : expense.Notes.Trim(),
                        CreatedAt = now,
                        UpdatedAt = now
                    });
                }
            }

            await UpdateSectionStatusAsync(userId, "expenses", input.OptOut, input.OptOut?.IsOptedOut != true && input.Expenses.Count > 0, ct);
            await _db.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);
            await RecalculateSnapshotAsync(userId, ct);
        }

        public async Task UpsertTaxProfileAsync(int userId, TaxProfileInput input, CancellationToken ct = default)
        {
            if (input.OptOut?.IsOptedOut == true)
            {
                await _db.TaxProfiles.Where(t => t.UserId == userId).ExecuteDeleteAsync(ct);
                await UpdateSectionStatusAsync(userId, "tax", input.OptOut, false, ct);
                await _db.SaveChangesAsync(ct);
                await RecalculateSnapshotAsync(userId, ct);
                return;
            }

            var profile = await _db.TaxProfiles.FirstOrDefaultAsync(t => t.UserId == userId, ct);
            if (profile == null)
            {
                profile = new TaxProfile { UserId = userId };
                _db.TaxProfiles.Add(profile);
            }

            profile.FilingStatus = string.IsNullOrWhiteSpace(input.FilingStatus) ? "single" : input.FilingStatus.Trim();
            profile.StateOfResidence = string.IsNullOrWhiteSpace(input.StateOfResidence) ? null : input.StateOfResidence.Trim();
            profile.MarginalRatePercent = input.MarginalRatePercent;
            profile.EffectiveRatePercent = input.EffectiveRatePercent;
            profile.FederalWithholdingPercent = input.FederalWithholdingPercent;
            profile.ExpectedRefundAmount = input.ExpectedRefundAmount;
            profile.ExpectedPaymentAmount = input.ExpectedPaymentAmount;
            profile.UsesCpaOrPreparer = input.UsesCpaOrPreparer;
            profile.Notes = NormalizeReason(input.Notes);
            profile.UpdatedAt = DateTime.UtcNow;

            if (profile.CreatedAt == default)
            {
                profile.CreatedAt = DateTime.UtcNow;
            }

            await UpdateSectionStatusAsync(userId, "tax", input.OptOut, true, ct);
            await _db.SaveChangesAsync(ct);
            await RecalculateSnapshotAsync(userId, ct);
        }

        public async Task UpsertBenefitsAsync(int userId, BenefitsInput input, CancellationToken ct = default)
        {
            await using var tx = await _db.Database.BeginTransactionAsync(ct);

            await _db.BenefitCoverages.Where(b => b.UserId == userId).ExecuteDeleteAsync(ct);

            if (input.OptOut?.IsOptedOut != true)
            {
                var now = DateTime.UtcNow;
                foreach (var benefit in input.Benefits)
                {
                    _db.BenefitCoverages.Add(new BenefitCoverage
                    {
                        UserId = userId,
                        BenefitType = string.IsNullOrWhiteSpace(benefit.BenefitType) ? "benefit" : benefit.BenefitType.Trim(),
                        Provider = string.IsNullOrWhiteSpace(benefit.Provider) ? null : benefit.Provider.Trim(),
                        IsEnrolled = benefit.IsEnrolled,
                        EmployerContributionPercent = benefit.EmployerContributionPercent,
                        MonthlyCost = benefit.MonthlyCost,
                        Notes = string.IsNullOrWhiteSpace(benefit.Notes) ? null : benefit.Notes.Trim(),
                        CreatedAt = now,
                        UpdatedAt = now
                    });
                }
            }

            await UpdateSectionStatusAsync(userId, "benefits", input.OptOut, input.OptOut?.IsOptedOut != true && input.Benefits.Count > 0, ct);
            await _db.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);
            await RecalculateSnapshotAsync(userId, ct);
        }

        public async Task UpsertLongTermObligationsAsync(int userId, LongTermObligationsInput input, CancellationToken ct = default)
        {
            await using var tx = await _db.Database.BeginTransactionAsync(ct);

            await _db.LongTermObligations.Where(o => o.UserId == userId).ExecuteDeleteAsync(ct);

            if (input.OptOut?.IsOptedOut != true)
            {
                var now = DateTime.UtcNow;
                foreach (var obligation in input.Obligations)
                {
                    var normalizedName = string.IsNullOrWhiteSpace(obligation.ObligationName)
                        ? "Future obligation"
                        : obligation.ObligationName.Trim();

                    _db.LongTermObligations.Add(new LongTermObligation
                    {
                        UserId = userId,
                        ObligationName = normalizedName,
                        ObligationType = string.IsNullOrWhiteSpace(obligation.ObligationType) ? "general" : obligation.ObligationType.Trim(),
                        TargetDate = obligation.TargetDate,
                        EstimatedCost = obligation.EstimatedCost,
                        FundsAllocated = obligation.FundsAllocated,
                        FundingStatus = string.IsNullOrWhiteSpace(obligation.FundingStatus) ? null : obligation.FundingStatus.Trim(),
                        IsCritical = obligation.IsCritical,
                        Notes = NormalizeReason(obligation.Notes),
                        CreatedAt = now,
                        UpdatedAt = now
                    });
                }
            }

            await UpdateSectionStatusAsync(userId, "long-term-obligations", input.OptOut, input.OptOut?.IsOptedOut != true && input.Obligations.Count > 0, ct);
            await _db.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);
            await RecalculateSnapshotAsync(userId, ct);
        }

        public async Task UpsertEquityInterestAsync(int userId, EquityInterestInput input, CancellationToken ct = default)
        {
            if (input.OptOut?.IsOptedOut == true)
            {
                await _db.EquityCompensationInterests.Where(e => e.UserId == userId).ExecuteDeleteAsync(ct);
                await UpdateSectionStatusAsync(userId, "equity", input.OptOut, false, ct);
                await _db.SaveChangesAsync(ct);
                await RecalculateSnapshotAsync(userId, ct);
                return;
            }

            var existing = await _db.EquityCompensationInterests.FirstOrDefaultAsync(e => e.UserId == userId, ct);
            if (existing == null)
            {
                existing = new EquityCompensationInterest { UserId = userId };
                _db.EquityCompensationInterests.Add(existing);
            }

            existing.IsInterestedInTracking = input.IsInterestedInTracking;
            existing.Notes = NormalizeReason(input.Notes);
            existing.UpdatedAt = DateTime.UtcNow;
            if (existing.CreatedAt == default)
            {
                existing.CreatedAt = DateTime.UtcNow;
            }

            await UpdateSectionStatusAsync(userId, "equity", input.OptOut, true, ct);
            await _db.SaveChangesAsync(ct);
            await RecalculateSnapshotAsync(userId, ct);
        }

        public async Task UpsertInsurancePoliciesAsync(int userId, InsurancePoliciesInput input, CancellationToken ct = default)
        {
            await using var tx = await _db.Database.BeginTransactionAsync(ct);

            await _db.FinancialProfileInsurancePolicies.Where(p => p.UserId == userId).ExecuteDeleteAsync(ct);

            if (input.OptOut?.IsOptedOut != true)
            {
                var now = DateTime.UtcNow;
                foreach (var policy in input.Policies)
                {
                    _db.FinancialProfileInsurancePolicies.Add(new FinancialProfileInsurancePolicy
                    {
                        UserId = userId,
                        PolicyType = policy.PolicyType,
                        Carrier = policy.Carrier?.Trim(),
                        PolicyName = policy.PolicyName?.Trim(),
                        CoverageAmount = policy.CoverageAmount,
                        PremiumAmount = policy.PremiumAmount,
                        PremiumFrequency = policy.PremiumFrequency,
                        RenewalDate = policy.RenewalDate,
                        IsAdequateCoverage = policy.IsAdequateCoverage,
                        RecommendedCoverage = policy.RecommendedCoverage,
                        CreatedAt = now,
                        UpdatedAt = now
                    });
                }
            }

            await UpdateSectionStatusAsync(userId, "insurance", input.OptOut, input.OptOut?.IsOptedOut != true && input.Policies.Count > 0, ct);
            await _db.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);
            await RecalculateSnapshotAsync(userId, ct);
        }

        public async Task UpsertIncomeStreamsAsync(int userId, IncomeStreamsInput input, CancellationToken ct = default)
        {
            await using var tx = await _db.Database.BeginTransactionAsync(ct);

            await _db.IncomeStreams.Where(p => p.UserId == userId).ExecuteDeleteAsync(ct);

            if (input.OptOut?.IsOptedOut != true)
            {
                var now = DateTime.UtcNow;
                foreach (var stream in input.Streams)
                {
                    // Calculate missing amount if one is provided
                    decimal monthlyAmount = stream.MonthlyAmount ?? 0;
                    decimal annualAmount = stream.AnnualAmount ?? 0;
                    
                    if (monthlyAmount == 0 && annualAmount > 0)
                    {
                        monthlyAmount = annualAmount / 12;
                    }
                    else if (annualAmount == 0 && monthlyAmount > 0)
                    {
                        annualAmount = monthlyAmount * 12;
                    }
                    
                    _db.IncomeStreams.Add(new IncomeStreamProfile
                    {
                        UserId = userId,
                        Name = stream.Name.Trim(),
                        IncomeType = stream.IncomeType,
                        MonthlyAmount = monthlyAmount,
                        AnnualAmount = annualAmount,
                        IsGuaranteed = stream.IsGuaranteed,
                        StartDate = stream.StartDate,
                        EndDate = stream.EndDate,
                        IsActive = stream.IsActive,
                        CreatedAt = now,
                        UpdatedAt = now
                    });
                }
            }

            await UpdateSectionStatusAsync(userId, "income", input.OptOut, input.OptOut?.IsOptedOut != true && input.Streams.Count > 0, ct);
            await _db.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);
            await RecalculateSnapshotAsync(userId, ct);
        }

        public Task<FinancialProfileSnapshot?> GetSnapshotAsync(int userId, CancellationToken ct = default)
        {
            return _db.FinancialProfileSnapshots.AsNoTracking().FirstOrDefaultAsync(s => s.UserId == userId, ct);
        }

        public async Task<HouseholdProfileInput> GetHouseholdAsync(int userId, CancellationToken ct = default)
        {
            var user = await RequireUserAsync(userId, ct);
            var optOut = await GetSectionOptOutAsync(userId, "household", ct);

            return new HouseholdProfileInput
            {
                PreferredName = user.PreferredName,
                MaritalStatus = user.MaritalStatus,
                DependentCount = user.DependentCount,
                ServiceNotes = user.HouseholdServiceNotes,
                OptOut = optOut
            };
        }

        public async Task<RiskGoalsInput> GetRiskGoalsAsync(int userId, CancellationToken ct = default)
        {
            var user = await RequireUserAsync(userId, ct);
            var optOut = await GetSectionOptOutAsync(userId, "risk-goals", ct);

            return new RiskGoalsInput
            {
                RiskTolerance = user.RiskTolerance,
                TargetRetirementDate = user.TargetRetirementDate,
                PassiveIncomeGoal = user.TargetMonthlyPassiveIncome,
                EmergencyFundTarget = user.EmergencyFundTarget,
                LiquidityBufferMonths = user.LiquidityBufferMonths,
                TransactionalAccountDesiredBalance = user.TransactionalAccountDesiredBalance,
                OptOut = optOut
            };
        }

        public async Task<TspAllocationInput> GetTspAsync(int userId, CancellationToken ct = default)
        {
            var profile = await _db.TspProfiles.AsNoTracking().FirstOrDefaultAsync(t => t.UserId == userId, ct);
            var optOut = await GetSectionOptOutAsync(userId, "tsp", ct);

            if (optOut == null && profile?.IsOptedOut == true)
            {
                optOut = new SectionOptOut
                {
                    IsOptedOut = true,
                    Reason = profile.OptOutReason,
                    AcknowledgedAt = profile.OptOutAcknowledgedAt
                };
            }

            var input = new TspAllocationInput
            {
                ContributionRatePercent = profile?.ContributionRatePercent ?? 0m,
                EmployerMatchPercent = profile?.EmployerMatchPercent ?? 0m,
                CurrentBalance = profile?.CurrentBalance ?? 0m,
                TargetBalance = profile?.TargetBalance ?? 0m,
                GFundPercent = profile?.GFundPercent ?? 0m,
                FFundPercent = profile?.FFundPercent ?? 0m,
                CFundPercent = profile?.CFundPercent ?? 0m,
                SFundPercent = profile?.SFundPercent ?? 0m,
                IFundPercent = profile?.IFundPercent ?? 0m,
                LifecyclePercent = profile?.LifecyclePercent,
                LifecycleBalance = profile?.LifecycleBalance,
                OptOut = optOut
            };

            var positions = await _db.TspLifecyclePositions.AsNoTracking()
                .Where(p => p.UserId == userId)
                .OrderBy(p => p.FundCode)
                .Select(p => new TspLifecyclePositionInput
                {
                    FundCode = p.FundCode,
                    ContributionPercent = p.ContributionPercent,
                    Units = p.Units
                })
                .ToListAsync(ct);
            input.LifecyclePositions = positions;

            return input;
        }

        // Returns denormalized quick-read summary using TspLifecyclePositions and TspProfile.TotalBalance
        public async Task<TspSummaryLite> GetTspSummaryLiteAsync(int userId, CancellationToken ct = default)
        {
            var items = await _db.TspLifecyclePositions.AsNoTracking()
                .Where(p => p.UserId == userId)
                .OrderBy(p => p.FundCode)
                .Select(p => new TspSummaryLiteItem
                {
                    FundCode = p.FundCode,
                    CurrentPrice = p.CurrentPrice,
                    Units = p.Units,
                    CurrentMarketValue = p.CurrentMarketValue,
                    CurrentMixPercent = p.CurrentMixPercent
                })
                .ToListAsync(ct);

            var profile = await _db.TspProfiles.AsNoTracking().FirstOrDefaultAsync(t => t.UserId == userId, ct);

            // As-of: use the latest LastPricedAsOfUtc among positions
            DateTime? asOf = null;
            var dates = await _db.TspLifecyclePositions.AsNoTracking()
                .Where(p => p.UserId == userId)
                .Select(p => p.LastPricedAsOfUtc)
                .ToListAsync(ct);
            var nonNullDates = dates.Where(d => d.HasValue).Select(d => d!.Value).ToList();
            if (nonNullDates.Count > 0)
            {
                asOf = nonNullDates.Max();
            }

            return new TspSummaryLite
            {
                Items = items,
                TotalBalance = profile?.TotalBalance,
                AsOfUtc = asOf
            };
        }

        /// <summary>
        /// Get comprehensive TSP detail including user positions and all fund prices.
        /// Uses stored prices only - no external API calls. Prices updated by TspPriceRefreshJob.
        /// </summary>
        public async Task<TspDetailResponse> GetTspDetailAsync(int userId, CancellationToken ct = default)
        {
            // Get user's positions with stored prices (no API call)
            var positions = await _db.TspLifecyclePositions.AsNoTracking()
                .Where(p => p.UserId == userId)
                .OrderBy(p => p.FundCode)
                .Select(p => new TspSummaryLiteItem
                {
                    FundCode = p.FundCode,
                    CurrentPrice = p.CurrentPrice,
                    Units = p.Units,
                    CurrentMarketValue = p.CurrentMarketValue,
                    CurrentMixPercent = p.CurrentMixPercent
                })
                .ToListAsync(ct);

            // Get latest fund prices from TSPFundPrices table (updated by background job)
            var latestPrices = await _db.TSPFundPrices
                .OrderByDescending(p => p.PriceDate)
                .FirstOrDefaultAsync(ct);

            var allFundPrices = latestPrices != null ? new TspFundPricesSnapshot
            {
                PriceDate = latestPrices.PriceDate,
                GFundPrice = latestPrices.GFundPrice,
                FFundPrice = latestPrices.FFundPrice,
                CFundPrice = latestPrices.CFundPrice,
                SFundPrice = latestPrices.SFundPrice,
                IFundPrice = latestPrices.IFundPrice,
                LIncomeFundPrice = latestPrices.LIncomeFundPrice,
                L2030FundPrice = latestPrices.L2030FundPrice,
                L2035FundPrice = latestPrices.L2035FundPrice,
                L2040FundPrice = latestPrices.L2040FundPrice,
                L2045FundPrice = latestPrices.L2045FundPrice,
                L2050FundPrice = latestPrices.L2050FundPrice,
                L2055FundPrice = latestPrices.L2055FundPrice,
                L2060FundPrice = latestPrices.L2060FundPrice,
                L2065FundPrice = latestPrices.L2065FundPrice,
                L2070FundPrice = latestPrices.L2070FundPrice,
                L2075FundPrice = latestPrices.L2075FundPrice,
                DataSource = latestPrices.DataSource
            } : new TspFundPricesSnapshot();

            // Get user's TSP profile
            var profile = await _db.TspProfiles.AsNoTracking()
                .Where(p => p.UserId == userId)
                .Select(p => new TspProfileInfo
                {
                    ContributionRatePercent = p.ContributionRatePercent,
                    EmployerMatchPercent = p.EmployerMatchPercent,
                    TotalBalance = p.TotalBalance,
                    TargetBalance = p.TargetBalance,
                    UpdatedAt = p.LastUpdatedAt
                })
                .FirstOrDefaultAsync(ct);

            // Calculate total market value
            var totalMarketValue = positions
                .Where(p => p.CurrentMarketValue.HasValue)
                .Sum(p => p.CurrentMarketValue!.Value);

            // Get last priced timestamp
            var pricesAsOf = positions
                .Select(p => p.CurrentPrice.HasValue)
                .Any()
                ? await _db.TspLifecyclePositions.AsNoTracking()
                    .Where(p => p.UserId == userId && p.LastPricedAsOfUtc != null)
                    .Select(p => p.LastPricedAsOfUtc)
                    .MaxAsync(ct)
                : null;

            return new TspDetailResponse
            {
                Positions = positions,
                AllFundPrices = allFundPrices,
                Profile = profile,
                TotalMarketValue = totalMarketValue,
                PricesAsOfUtc = pricesAsOf
            };
        }

        public async Task<BackfillResult> BackfillTspBasePositionsAsync(int userId, bool dryRun = true, CancellationToken ct = default)
        {
            var fundCodes = new[] { "G", "F", "C", "S", "I", "L-INCOME" };
            var existing = await _db.TspLifecyclePositions.AsNoTracking()
                .Where(p => p.UserId == userId)
                .Select(p => p.FundCode)
                .ToListAsync(ct);
            var toCreate = fundCodes.Except(existing, StringComparer.OrdinalIgnoreCase).ToList();
            if (!toCreate.Any()) return new BackfillResult(0, existing.Count, dryRun);

            if (!dryRun)
            {
                var now = DateTime.UtcNow;
                foreach (var code in toCreate)
                {
                    _db.TspLifecyclePositions.Add(new Models.FinancialProfile.TspLifecyclePosition
                    {
                        UserId = userId,
                        FundCode = code,
                        ContributionPercent = 0m,
                        Units = 0m,
                        CreatedAt = now,
                        UpdatedAt = now,
                        DateUpdated = now
                    });
                }
                await _db.SaveChangesAsync(ct);
            }
            return new BackfillResult(toCreate.Count, existing.Count, dryRun);
        }

        public async Task<CashAccountsInput> GetCashAccountsAsync(int userId, CancellationToken ct = default)
        {
            var accounts = await _db.Accounts.AsNoTracking()
                .Where(a => a.UserId == userId && 
                    (a.AccountType == AccountType.Checking || 
                     a.AccountType == AccountType.Savings || 
                     a.AccountType == AccountType.MoneyMarket ||
                     a.AccountType == AccountType.CertificateOfDeposit))
                .OrderBy(a => a.CreatedAt)
                .Select(a => new CashAccountInput
                {
                    Nickname = a.AccountName,
                    AccountType = a.AccountType.ToString().ToLower(),
                    Institution = a.Institution,
                    Balance = a.CurrentBalance,
                    InterestRateApr = a.InterestRate.HasValue ? a.InterestRate.Value * 100m : null, // Convert decimal to APR%
                    IsEmergencyFund = a.IsEmergencyFund,
                    RateLastChecked = a.RateLastChecked,
                    Purpose = a.Purpose
                })
                .ToListAsync(ct);

            var optOut = await GetSectionOptOutAsync(userId, "cash", ct);

            return new CashAccountsInput
            {
                Accounts = accounts,
                OptOut = optOut
            };
        }

        public async Task<InvestmentAccountsInput> GetInvestmentAccountsAsync(int userId, CancellationToken ct = default)
        {
            var accounts = await _db.Accounts.AsNoTracking()
                .Where(a => a.UserId == userId && 
                    (a.AccountType == AccountType.Brokerage || 
                     a.AccountType == AccountType.RetirementAccountIRA || 
                     a.AccountType == AccountType.RetirementAccount401k || 
                     a.AccountType == AccountType.RetirementAccountRoth ||
                     a.AccountType == AccountType.HSA))
                .OrderBy(a => a.CreatedAt)
                .Select(a => new InvestmentAccountInput
                {
                    AccountName = a.AccountName,
                    AccountCategory = a.AccountType.ToString().ToLower(),
                    Institution = a.Institution,
                    AssetClass = a.Notes != null && a.Notes.StartsWith("Asset Class:") 
                        ? a.Notes.Substring("Asset Class:".Length).Trim() 
                        : null,
                    CurrentValue = a.CurrentBalance,
                    CostBasis = null, // Not stored in unified table yet
                    ContributionRatePercent = null, // Not stored in unified table yet
                    IsTaxAdvantaged = a.Category == AccountCategory.TaxDeferred || 
                                     a.Category == AccountCategory.TaxFree || 
                                     a.Category == AccountCategory.TaxAdvantaged,
                    LastContributionDate = null // Not stored in unified table yet
                })
                .ToListAsync(ct);

            var optOut = await GetSectionOptOutAsync(userId, "investments", ct);

            return new InvestmentAccountsInput
            {
                Accounts = accounts,
                OptOut = optOut
            };
        }

        public async Task<PropertiesInput> GetPropertiesAsync(int userId, CancellationToken ct = default)
        {
            var properties = await _db.Properties.AsNoTracking()
                .Where(p => p.UserId == userId)
                .OrderBy(p => p.CreatedAt)
                .Select(p => new PropertyInput
                {
                    PropertyName = p.PropertyName,
                    PropertyType = p.PropertyType,
                    Occupancy = p.Occupancy,
                    EstimatedValue = p.EstimatedValue,
                    MortgageBalance = p.MortgageBalance,
                    MonthlyMortgagePayment = p.MonthlyMortgagePayment,
                    MonthlyRentalIncome = p.MonthlyRentalIncome,
                    MonthlyExpenses = p.MonthlyExpenses,
                    HasHeloc = p.HasHeloc
                })
                .ToListAsync(ct);

            var optOut = await GetSectionOptOutAsync(userId, "real-estate", ct);

            return new PropertiesInput
            {
                Properties = properties,
                OptOut = optOut
            };
        }

        public async Task<InsurancePoliciesInput> GetInsurancePoliciesAsync(int userId, CancellationToken ct = default)
        {
            var policies = await _db.FinancialProfileInsurancePolicies.AsNoTracking()
                .Where(p => p.UserId == userId)
                .OrderBy(p => p.CreatedAt)
                .Select(p => new InsurancePolicyInput
                {
                    PolicyType = p.PolicyType,
                    Carrier = p.Carrier,
                    PolicyName = p.PolicyName,
                    CoverageAmount = p.CoverageAmount,
                    PremiumAmount = p.PremiumAmount,
                    PremiumFrequency = p.PremiumFrequency,
                    RenewalDate = p.RenewalDate,
                    IsAdequateCoverage = p.IsAdequateCoverage,
                    RecommendedCoverage = p.RecommendedCoverage
                })
                .ToListAsync(ct);

            var optOut = await GetSectionOptOutAsync(userId, "insurance", ct);

            return new InsurancePoliciesInput
            {
                Policies = policies,
                OptOut = optOut
            };
        }

        public async Task<IncomeStreamsInput> GetIncomeStreamsAsync(int userId, CancellationToken ct = default)
        {
            var streams = await _db.IncomeStreams.AsNoTracking()
                .Where(s => s.UserId == userId)
                .OrderBy(s => s.CreatedAt)
                .Select(s => new IncomeStreamInput
                {
                    Name = s.Name,
                    IncomeType = s.IncomeType,
                    MonthlyAmount = s.MonthlyAmount,
                    AnnualAmount = s.AnnualAmount,
                    IsGuaranteed = s.IsGuaranteed,
                    StartDate = s.StartDate,
                    EndDate = s.EndDate,
                    IsActive = s.IsActive
                })
                .ToListAsync(ct);

            var optOut = await GetSectionOptOutAsync(userId, "income", ct);

            return new IncomeStreamsInput
            {
                Streams = streams,
                OptOut = optOut
            };
        }

        public async Task<LiabilitiesInput> GetLiabilitiesAsync(int userId, CancellationToken ct = default)
        {
            var liabilities = await _db.LiabilityAccounts.AsNoTracking()
                .Where(l => l.UserId == userId)
                .OrderBy(l => l.CreatedAt)
                .Select(l => new LiabilityAccountInput
                {
                    LiabilityType = l.LiabilityType,
                    Lender = l.Lender,
                    CurrentBalance = l.CurrentBalance,
                    InterestRateApr = l.InterestRateApr,
                    MinimumPayment = l.MinimumPayment,
                    PayoffTargetDate = l.PayoffTargetDate,
                    IsPriorityToEliminate = l.IsPriorityToEliminate
                })
                .ToListAsync(ct);

            var optOut = await GetSectionOptOutAsync(userId, "liabilities", ct);

            return new LiabilitiesInput
            {
                Liabilities = liabilities,
                OptOut = optOut
            };
        }

        public async Task<ExpensesInput> GetExpensesAsync(int userId, CancellationToken ct = default)
        {
            var expenses = await _db.ExpenseBudgets.AsNoTracking()
                .Where(e => e.UserId == userId)
                .OrderBy(e => e.CreatedAt)
                .Select(e => new ExpenseBudgetInput
                {
                    Category = e.Category,
                    MonthlyAmount = e.MonthlyAmount,
                    IsEstimated = e.IsEstimated,
                    Notes = e.Notes
                })
                .ToListAsync(ct);

            var optOut = await GetSectionOptOutAsync(userId, "expenses", ct);

            return new ExpensesInput
            {
                Expenses = expenses,
                OptOut = optOut
            };
        }

        public async Task<TaxProfileInput> GetTaxProfileAsync(int userId, CancellationToken ct = default)
        {
            var profile = await _db.TaxProfiles.AsNoTracking().FirstOrDefaultAsync(t => t.UserId == userId, ct);
            var optOut = await GetSectionOptOutAsync(userId, "tax", ct);

            return new TaxProfileInput
            {
                FilingStatus = profile?.FilingStatus ?? "single",
                StateOfResidence = profile?.StateOfResidence,
                MarginalRatePercent = profile?.MarginalRatePercent,
                EffectiveRatePercent = profile?.EffectiveRatePercent,
                FederalWithholdingPercent = profile?.FederalWithholdingPercent,
                ExpectedRefundAmount = profile?.ExpectedRefundAmount,
                ExpectedPaymentAmount = profile?.ExpectedPaymentAmount,
                UsesCpaOrPreparer = profile?.UsesCpaOrPreparer ?? false,
                Notes = profile?.Notes,
                OptOut = optOut
            };
        }

        public async Task<BenefitsInput> GetBenefitsAsync(int userId, CancellationToken ct = default)
        {
            var benefits = await _db.BenefitCoverages.AsNoTracking()
                .Where(b => b.UserId == userId)
                .OrderBy(b => b.CreatedAt)
                .Select(b => new BenefitCoverageInput
                {
                    BenefitType = b.BenefitType,
                    Provider = b.Provider,
                    IsEnrolled = b.IsEnrolled,
                    EmployerContributionPercent = b.EmployerContributionPercent,
                    MonthlyCost = b.MonthlyCost,
                    Notes = b.Notes
                })
                .ToListAsync(ct);

            var optOut = await GetSectionOptOutAsync(userId, "benefits", ct);

            return new BenefitsInput
            {
                Benefits = benefits,
                OptOut = optOut
            };
        }

        public async Task<LongTermObligationsInput> GetLongTermObligationsAsync(int userId, CancellationToken ct = default)
        {
            var obligations = await _db.LongTermObligations.AsNoTracking()
                .Where(o => o.UserId == userId)
                .OrderBy(o => o.CreatedAt)
                .Select(o => new LongTermObligationInput
                {
                    ObligationName = o.ObligationName,
                    ObligationType = o.ObligationType,
                    TargetDate = o.TargetDate,
                    EstimatedCost = o.EstimatedCost,
                    FundsAllocated = o.FundsAllocated,
                    FundingStatus = o.FundingStatus,
                    IsCritical = o.IsCritical,
                    Notes = o.Notes
                })
                .ToListAsync(ct);

            var optOut = await GetSectionOptOutAsync(userId, "long-term-obligations", ct);

            return new LongTermObligationsInput
            {
                Obligations = obligations,
                OptOut = optOut
            };
        }

        public async Task<EquityInterestInput> GetEquityInterestAsync(int userId, CancellationToken ct = default)
        {
            var interest = await _db.EquityCompensationInterests.AsNoTracking().FirstOrDefaultAsync(e => e.UserId == userId, ct);
            var optOut = await GetSectionOptOutAsync(userId, "equity", ct);

            return new EquityInterestInput
            {
                IsInterestedInTracking = interest?.IsInterestedInTracking ?? false,
                Notes = interest?.Notes,
                OptOut = optOut
            };
        }

        private async Task<User> RequireUserAsync(int userId, CancellationToken ct)
        {
            var user = await _db.Users.FirstOrDefaultAsync(u => u.UserId == userId, ct);
            if (user == null)
            {
                throw new InvalidOperationException($"User {userId} not found");
            }
            return user;
        }

        private async Task UpdateSectionStatusAsync(int userId, string sectionKey, SectionOptOut? optOut, bool hasData, CancellationToken ct)
        {
            var status = await _db.FinancialProfileSectionStatuses.FirstOrDefaultAsync(s => s.UserId == userId && s.SectionKey == sectionKey, ct);
            if (status == null)
            {
                status = new FinancialProfileSectionStatus
                {
                    UserId = userId,
                    SectionKey = sectionKey,
                    CreatedAt = DateTime.UtcNow,
                };
                _db.FinancialProfileSectionStatuses.Add(status);
            }

            if (optOut?.IsOptedOut == true)
            {
                status.Status = FinancialProfileSectionStatuses.OptedOut;
                status.OptOutReason = NormalizeReason(optOut.Reason);
                status.OptOutAcknowledgedAt = optOut.AcknowledgedAt ?? DateTime.UtcNow;
            }
            else if (hasData)
            {
                status.Status = FinancialProfileSectionStatuses.Completed;
                status.OptOutReason = null;
                status.OptOutAcknowledgedAt = null;
            }
            else
            {
                status.Status = FinancialProfileSectionStatuses.NeedsInfo;
                status.OptOutReason = null;
                status.OptOutAcknowledgedAt = null;
            }

            status.UpdatedAt = DateTime.UtcNow;
        }

        private async Task RecalculateSnapshotAsync(int userId, CancellationToken ct)
        {
            var statuses = await _db.FinancialProfileSectionStatuses
                .Where(s => s.UserId == userId)
                .ToListAsync(ct);

            foreach (var key in SectionKeys)
            {
                if (!statuses.Any(s => s.SectionKey == key))
                {
                    statuses.Add(new FinancialProfileSectionStatus
                    {
                        UserId = userId,
                        SectionKey = key,
                        Status = FinancialProfileSectionStatuses.NeedsInfo,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    });
                }
            }

            var completed = statuses.Where(s => s.Status == FinancialProfileSectionStatuses.Completed).Select(s => s.SectionKey).Distinct().OrderBy(s => s).ToList();
            var optedOut = statuses.Where(s => s.Status == FinancialProfileSectionStatuses.OptedOut).Select(s => s.SectionKey).Distinct().OrderBy(s => s).ToList();
            var outstanding = SectionKeys.Where(k => !completed.Contains(k) && !optedOut.Contains(k)).ToList();

            var completionPercent = SectionKeys.Length == 0 ? 0 : Math.Round(((decimal)(completed.Count + optedOut.Count) / SectionKeys.Length) * 100, 2);

            // Updated to use unified Accounts table
            var cashTotal = await _db.Accounts
                .Where(c => c.UserId == userId && 
                    (c.AccountType == AccountType.Checking || 
                     c.AccountType == AccountType.Savings || 
                     c.AccountType == AccountType.MoneyMarket ||
                     c.AccountType == AccountType.CertificateOfDeposit))
                .SumAsync(c => (decimal?)c.CurrentBalance, ct) ?? 0m;
                
            var investmentTotal = await _db.Accounts
                .Where(c => c.UserId == userId && 
                    (c.AccountType == AccountType.Brokerage || 
                     c.AccountType == AccountType.RetirementAccountIRA || 
                     c.AccountType == AccountType.RetirementAccount401k || 
                     c.AccountType == AccountType.RetirementAccountRoth ||
                     c.AccountType == AccountType.HSA))
                .SumAsync(c => (decimal?)c.CurrentBalance, ct) ?? 0m;
                
            var propertyValue = await _db.Properties.Where(c => c.UserId == userId).SumAsync(c => (decimal?)c.EstimatedValue, ct) ?? 0m;
            var propertyDebt = await _db.Properties.Where(c => c.UserId == userId).SumAsync(c => (decimal?)(c.MortgageBalance ?? 0m), ct) ?? 0m;
            var liabilityTotal = await _db.LiabilityAccounts.Where(c => c.UserId == userId).SumAsync(c => (decimal?)c.CurrentBalance, ct) ?? 0m;
            var monthlyDebtService = await _db.LiabilityAccounts.Where(c => c.UserId == userId).SumAsync(c => (decimal?)(c.MinimumPayment ?? 0m), ct) ?? 0m;
            var monthlyMortgagePayments = await _db.Properties.Where(c => c.UserId == userId).SumAsync(c => (decimal?)(c.MonthlyMortgagePayment ?? 0m), ct) ?? 0m;
            var monthlyExpenses = await _db.ExpenseBudgets.Where(c => c.UserId == userId).SumAsync(c => (decimal?)c.MonthlyAmount, ct) ?? 0m;
            var taxProfile = await _db.TaxProfiles.FirstOrDefaultAsync(t => t.UserId == userId, ct);
            var obligations = await _db.LongTermObligations.Where(o => o.UserId == userId).ToListAsync(ct);

            var netWorth = cashTotal + investmentTotal + propertyValue - propertyDebt - liabilityTotal;

            var monthlyIncome = await _db.IncomeStreams.Where(c => c.UserId == userId && c.IsActive).SumAsync(c => (decimal?)c.MonthlyAmount, ct) ?? 0m;
            var monthlyCashFlow = monthlyIncome - monthlyExpenses - monthlyDebtService - monthlyMortgagePayments;
            var obligationTotal = obligations.Sum(o => o.EstimatedCost ?? 0m);
            var nextObligationDate = obligations
                .Where(o => o.TargetDate.HasValue)
                .OrderBy(o => o.TargetDate)
                .Select(o => o.TargetDate)
                .FirstOrDefault();

            var snapshot = await _db.FinancialProfileSnapshots.FirstOrDefaultAsync(s => s.UserId == userId, ct);
            if (snapshot == null)
            {
                snapshot = new FinancialProfileSnapshot { UserId = userId };
                _db.FinancialProfileSnapshots.Add(snapshot);
            }

            snapshot.CompletionPercent = completionPercent;
            snapshot.CompletedSectionCount = completed.Count;
            snapshot.OptedOutSectionCount = optedOut.Count;
            snapshot.OutstandingSectionCount = outstanding.Count;
            snapshot.CompletedSectionsJson = JsonSerializer.Serialize(completed);
            snapshot.OptedOutSectionsJson = JsonSerializer.Serialize(optedOut);
            snapshot.OutstandingSectionsJson = JsonSerializer.Serialize(outstanding);
            snapshot.NetWorthEstimate = netWorth;
            snapshot.MonthlyCashFlowEstimate = monthlyCashFlow;
            snapshot.TotalLiabilityBalance = liabilityTotal + propertyDebt;
            snapshot.MonthlyDebtServiceEstimate = monthlyDebtService + monthlyMortgagePayments;
            snapshot.MonthlyExpenseEstimate = monthlyExpenses;
            snapshot.MarginalTaxRatePercent = taxProfile?.MarginalRatePercent;
            snapshot.EffectiveTaxRatePercent = taxProfile?.EffectiveRatePercent;
            snapshot.FederalWithholdingPercent = taxProfile?.FederalWithholdingPercent;
            snapshot.UsesCpaOrPreparer = taxProfile?.UsesCpaOrPreparer ?? false;
            snapshot.LongTermObligationCount = obligations.Count;
            snapshot.LongTermObligationEstimate = obligationTotal;
            snapshot.NextObligationDueDate = nextObligationDate;
            snapshot.CalculatedAt = DateTime.UtcNow;
            snapshot.ProfileCompletedAt = outstanding.Count == 0 ? snapshot.ProfileCompletedAt ?? DateTime.UtcNow : null;

            var user = await _db.Users.FirstOrDefaultAsync(u => u.UserId == userId, ct);
            if (user != null)
            {
                user.ProfileSetupComplete = outstanding.Count == 0;
                user.ProfileCompletedAt = user.ProfileSetupComplete ? user.ProfileCompletedAt ?? DateTime.UtcNow : null;
                user.SetupProgressPercentage = (int)Math.Clamp(Math.Round((double)completionPercent), 0, 100);
                user.UpdatedAt = DateTime.UtcNow;
            }

            await _db.SaveChangesAsync(ct);
        }

    public async Task<TspSummary> GetTspSummaryAsync(int userId, CancellationToken ct = default)
        {
            // Preferred: use stored positions (now includes base + lifecycle funds). Fallback to legacy fields if none.
            var tsp = await _db.TspProfiles.FirstOrDefaultAsync(t => t.UserId == userId, ct);
            var positions = await _db.TspLifecyclePositions
                .Where(p => p.UserId == userId)
                .ToListAsync(ct);

            // Fetch market prices from DailyTSP API (authoritative source)
            var prices = await _tspService.GetTSPPricesAsDictionaryAsync();
            if (prices == null)
            {
                _logger.LogWarning("Failed to fetch TSP prices from DailyTSP API for user {UserId}", userId);
                prices = new Dictionary<string, decimal>();
            }

            // Build items
            var items = new List<TspSummaryItem>();
            decimal totalMarket = 0m;
            var asOf = GetTspAsOfUtc(DateTime.UtcNow);

            // All positions (base + lifecycle)
            foreach (var lf in positions)
            {
                var priceKey = NormalizeTspPriceKey(lf.FundCode);
                if (!prices.TryGetValue(priceKey, out var price)) continue;
                var mv = Math.Round(lf.Units * price, 2);
                items.Add(new TspSummaryItem
                {
                    FundCode = lf.FundCode,
                    Price = price,
                    Units = lf.Units,
                    MarketValue = mv,
                    AllocationPercent = lf.ContributionPercent,
                });
                totalMarket += mv;

                // Update denormalized values on the entity for fast reads
                lf.CurrentPrice = price;
                lf.CurrentMarketValue = mv;
                lf.LastPricedAsOfUtc = asOf;
            }

            // Removed: legacy proportional base-fund allocation here. We now synthesize legacy values below only if no positions exist.

            // Compute mix %
            if (totalMarket > 0)
            {
                foreach (var it in items)
                {
                    it.MixPercent = Math.Round((it.MarketValue / totalMarket) * 100m, 4);
                }

                // Push mix percents to denormalized lifecycle positions
                foreach (var lf in positions)
                {
                    var mv = lf.CurrentMarketValue ?? 0m;
                    lf.CurrentMixPercent = mv > 0 ? Math.Round((mv / totalMarket) * 100m, 4) : 0m;
                }
            }

            // Legacy fallback: synthesize from old profile if no stored positions
            if (items.Count == 0 && tsp != null && tsp.CurrentBalance > 0)
            {
                var baseFunds = new List<(string code, decimal percent)>
                {
                    ("G", tsp.GFundPercent),
                    ("F", tsp.FFundPercent),
                    ("C", tsp.CFundPercent),
                    ("S", tsp.SFundPercent),
                    ("I", tsp.IFundPercent)
                };
                foreach (var (code, pct) in baseFunds)
                {
                    if (pct <= 0) continue;
                    var priceKey = NormalizeTspPriceKey(code);
                    if (!prices.TryGetValue(priceKey, out var price)) continue;
                    var mv = Math.Round((tsp.CurrentBalance * (pct / 100m)), 2);
                    var units = price > 0 ? Math.Round(mv / price, 6) : 0m;
                    items.Add(new TspSummaryItem
                    {
                        FundCode = code,
                        Price = price,
                        Units = units,
                        MarketValue = mv,
                        AllocationPercent = pct
                    });
                    totalMarket += mv;
                }
                if (totalMarket > 0)
                {
                    foreach (var it in items)
                        it.MixPercent = Math.Round((it.MarketValue / totalMarket) * 100m, 4);
                }
            }

            // Update denormalized total on profile
            if (tsp != null)
            {
                tsp.TotalBalance = totalMarket;
                tsp.LastUpdatedAt = DateTime.UtcNow;
            }

            await _db.SaveChangesAsync(ct);

            return new TspSummary
            {
                Items = items.OrderBy(i => i.FundCode).ToList(),
                TotalMarketValue = totalMarket,
                AsOfUtc = asOf
            };
        }

        public async Task CreateTspSnapshotAsync(int userId, CancellationToken ct = default)
        {
            var asOf = GetTspAsOfUtc(DateTime.UtcNow);

            // Idempotency: if we've already captured a snapshot for this user+asOf, do nothing
            var exists = await _db.TspPositionSnapshots
                .AsNoTracking()
                .AnyAsync(s => s.UserId == userId && s.AsOfUtc == asOf, ct);
            if (exists)
            {
                return;
            }

            var summary = await GetTspSummaryAsync(userId, ct);

            // Nothing to snapshot
            if (summary.Items.Count == 0)
            {
                return;
            }

            await using var tx = await _db.Database.BeginTransactionAsync(ct);

            // Clean any partial rows for this day (defensive), then insert
            await _db.TspPositionSnapshots.Where(s => s.UserId == userId && s.AsOfUtc == asOf).ExecuteDeleteAsync(ct);

            foreach (var item in summary.Items)
            {
                _db.TspPositionSnapshots.Add(new Models.FinancialProfile.TspPositionSnapshot
                {
                    UserId = userId,
                    FundCode = item.FundCode,
                    Price = item.Price,
                    Units = item.Units,
                    MarketValue = item.MarketValue,
                    MixPercent = item.MixPercent,
                    AllocationPercent = item.AllocationPercent,
                    AsOfUtc = asOf,
                    CreatedAt = DateTime.UtcNow
                });
            }

            await _db.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);
        }

        public async Task<TspSnapshotMeta?> GetLatestTspSnapshotMetaAsync(int userId, CancellationToken ct = default)
        {
            // Find the most recent AsOfUtc date for which we have any snapshot rows for this user
            var latestAsOf = await _db.TspPositionSnapshots.AsNoTracking()
                .Where(s => s.UserId == userId)
                .OrderByDescending(s => s.AsOfUtc)
                .Select(s => s.AsOfUtc)
                .FirstOrDefaultAsync(ct);

            if (latestAsOf == default)
            {
                return null;
            }

            // Aggregate metadata for that as-of date
            var rows = await _db.TspPositionSnapshots.AsNoTracking()
                .Where(s => s.UserId == userId && s.AsOfUtc == latestAsOf)
                .ToListAsync(ct);

            if (rows.Count == 0)
            {
                return null;
            }

            var fundCount = rows
                .Select(r => r.FundCode)
                .Where(c => !string.IsNullOrWhiteSpace(c))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .Count();
            var totalMv = rows.Sum(r => r.MarketValue);
            var capturedAt = rows.Max(r => (DateTime?)r.CreatedAt) ?? null;

            return new TspSnapshotMeta
            {
                AsOfUtc = latestAsOf,
                FundCount = fundCount,
                TotalMarketValue = totalMv,
                CapturedAtUtc = capturedAt
            };
        }
        private static string? NormalizeReason(string? reason)
        {
            if (string.IsNullOrWhiteSpace(reason)) return null;
            var trimmed = reason.Trim();
            return string.IsNullOrEmpty(trimmed) ? null : trimmed;
        }

        private async Task<SectionOptOut?> GetSectionOptOutAsync(int userId, string sectionKey, CancellationToken ct)
        {
            var status = await _db.FinancialProfileSectionStatuses.AsNoTracking()
                .FirstOrDefaultAsync(s => s.UserId == userId && s.SectionKey == sectionKey, ct);

            if (status == null)
            {
                return null;
            }

            if (status.Status == FinancialProfileSectionStatuses.OptedOut)
            {
                return new SectionOptOut
                {
                    IsOptedOut = true,
                    Reason = status.OptOutReason,
                    AcknowledgedAt = status.OptOutAcknowledgedAt
                };
            }

            return null;
        }
    }
}
