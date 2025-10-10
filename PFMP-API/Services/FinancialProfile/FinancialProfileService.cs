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
            "insurance",
            "income"
        };

        private readonly ApplicationDbContext _db;
        private readonly ILogger<FinancialProfileService> _logger;

        public FinancialProfileService(ApplicationDbContext db, ILogger<FinancialProfileService> logger)
        {
            _db = db;
            _logger = logger;
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
                tsp.EmployerMatchPercent = input.EmployerMatchPercent;
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
            }

            await UpdateSectionStatusAsync(userId, "tsp", input.OptOut, input.OptOut?.IsOptedOut != true, ct);
            await _db.SaveChangesAsync(ct);
            await RecalculateSnapshotAsync(userId, ct);
        }

        public async Task UpsertCashAccountsAsync(int userId, CashAccountsInput input, CancellationToken ct = default)
        {
            await using var tx = await _db.Database.BeginTransactionAsync(ct);

            await _db.CashAccounts.Where(a => a.UserId == userId).ExecuteDeleteAsync(ct);

            if (input.OptOut?.IsOptedOut != true)
            {
                var now = DateTime.UtcNow;
                foreach (var account in input.Accounts)
                {
                    _db.CashAccounts.Add(new CashAccount
                    {
                        UserId = userId,
                        Nickname = account.Nickname.Trim(),
                        AccountType = account.AccountType,
                        Institution = account.Institution?.Trim(),
                        Balance = account.Balance,
                        InterestRateApr = account.InterestRateApr,
                        IsEmergencyFund = account.IsEmergencyFund,
                        RateLastChecked = account.RateLastChecked,
                        CreatedAt = now,
                        UpdatedAt = now
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

            await _db.InvestmentAccounts.Where(a => a.UserId == userId).ExecuteDeleteAsync(ct);

            if (input.OptOut?.IsOptedOut != true)
            {
                var now = DateTime.UtcNow;
                foreach (var account in input.Accounts)
                {
                    _db.InvestmentAccounts.Add(new InvestmentAccount
                    {
                        UserId = userId,
                        AccountName = account.AccountName.Trim(),
                        AccountCategory = account.AccountCategory,
                        Institution = account.Institution?.Trim(),
                        AssetClass = account.AssetClass?.Trim(),
                        CurrentValue = account.CurrentValue,
                        CostBasis = account.CostBasis,
                        ContributionRatePercent = account.ContributionRatePercent,
                        IsTaxAdvantaged = account.IsTaxAdvantaged,
                        LastContributionDate = account.LastContributionDate,
                        CreatedAt = now,
                        UpdatedAt = now
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
                    _db.IncomeStreams.Add(new IncomeStreamProfile
                    {
                        UserId = userId,
                        Name = stream.Name.Trim(),
                        IncomeType = stream.IncomeType,
                        MonthlyAmount = stream.MonthlyAmount,
                        AnnualAmount = stream.AnnualAmount,
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

            var cashTotal = await _db.CashAccounts.Where(c => c.UserId == userId).SumAsync(c => (decimal?)c.Balance, ct) ?? 0m;
            var investmentTotal = await _db.InvestmentAccounts.Where(c => c.UserId == userId).SumAsync(c => (decimal?)c.CurrentValue, ct) ?? 0m;
            var propertyValue = await _db.Properties.Where(c => c.UserId == userId).SumAsync(c => (decimal?)c.EstimatedValue, ct) ?? 0m;
            var propertyDebt = await _db.Properties.Where(c => c.UserId == userId).SumAsync(c => (decimal?)(c.MortgageBalance ?? 0m), ct) ?? 0m;
            var netWorth = cashTotal + investmentTotal + propertyValue - propertyDebt;

            var monthlyCashFlow = await _db.IncomeStreams.Where(c => c.UserId == userId && c.IsActive).SumAsync(c => (decimal?)c.MonthlyAmount, ct) ?? 0m;

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

        private static string? NormalizeReason(string? reason)
        {
            if (string.IsNullOrWhiteSpace(reason)) return null;
            var trimmed = reason.Trim();
            return string.IsNullOrEmpty(trimmed) ? null : trimmed;
        }
    }
}
