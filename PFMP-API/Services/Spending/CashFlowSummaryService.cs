using Microsoft.EntityFrameworkCore;
using PFMP_API.Models;
using PFMP_API.Models.FinancialProfile;

namespace PFMP_API.Services.Spending;

/// <summary>
/// Wave 14 P1: reconciles the user's Profile Baseline (IncomeSources +
/// ExpenseBudgets + InsurancePolicies) with Plaid Observed actuals (last
/// completed month, internal transfers excluded) into a single cash-flow
/// summary shape that the dashboard and AI context can read.
///
/// Allotment semantics (per IncomeSource.AllotmentType):
///   - <c>None</c>            → counts toward TotalMonthlyInflows
///   - <c>SavingsToLinkedAccount</c> → does NOT add to inflow total (already in
///     parent salary); appears as informational "savingsAllotments" line
///   - <c>ExternalOutflow</c> → counts toward TotalMonthlyOutflows as
///     "External Allotment"; visible in outflows breakdown
///   - <c>Other</c>           → counts as inflow + flagged
/// </summary>
public interface ICashFlowSummaryService
{
    Task<CashFlowSummary> GetAsync(int userId, CancellationToken ct = default);
}

public record CashFlowSummary(
    decimal TotalMonthlyInflows,
    decimal TotalMonthlyOutflows,
    decimal NetMonthlyCashFlow,
    InflowSection Inflows,
    OutflowSection Outflows,
    IReadOnlyList<CashFlowVariance> Variances,
    DateTime AsOfUtc);

public record InflowSection(
    IReadOnlyList<InflowByType> ByIncomeType,
    IReadOnlyList<SavingsAllotment> SavingsAllotments);

public record InflowByType(
    string Type,
    decimal Amount,
    string Source,
    bool IsProfileOnly,
    bool IsAmbiguousAllotment,
    string Basis,
    bool IsMissingNetAmount);

public record SavingsAllotment(
    Guid IncomeStreamId,
    string Name,
    decimal Amount,
    int? DestinationAccountId,
    string? DestinationName);

public record OutflowSection(
    IReadOnlyList<OutflowByCategory> ByPlaidPrimary,
    IReadOnlyList<InsurancePremium> InsurancePremiums,
    IReadOnlyList<ExternalAllotment> ExternalAllotments);

public record OutflowByCategory(
    string Category,
    decimal Actual,
    decimal? Budgeted,
    string Source,
    bool IsProfileOnly);

public record InsurancePremium(
    string PolicyType,
    string? PolicyName,
    decimal MonthlyAmount,
    DateTime? RenewalDate);

public record ExternalAllotment(
    Guid IncomeStreamId,
    string Name,
    decimal Amount,
    string? Notes);

public record CashFlowVariance(
    string Stream,
    decimal Profile,
    decimal Plaid,
    decimal DeltaPercent,
    string Severity);

public class CashFlowSummaryService : ICashFlowSummaryService
{
    private readonly ApplicationDbContext _db;
    private readonly ISpendingAnalyticsService _analytics;
    private readonly IBudgetService _budgetService;
    private readonly ILogger<CashFlowSummaryService> _logger;

    public CashFlowSummaryService(
        ApplicationDbContext db,
        ISpendingAnalyticsService analytics,
        IBudgetService budgetService,
        ILogger<CashFlowSummaryService> logger)
    {
        _db = db;
        _analytics = analytics;
        _budgetService = budgetService;
        _logger = logger;
    }

    public async Task<CashFlowSummary> GetAsync(int userId, CancellationToken ct = default)
    {
        var asOf = DateTime.UtcNow;
        var monthStart = new DateTime(asOf.Year, asOf.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var priorMonthStart = monthStart.AddMonths(-1);

        // Profile Baseline — read IncomeStreams (the model the Profile editor writes to).
        // IncomeSource is a legacy/parallel model retained for the dedicated IncomeSources
        // controller; CashFlowSummaryService standardizes on IncomeStreams.
        var streams = await _db.IncomeStreams.Where(i => i.UserId == userId && i.IsActive).ToListAsync(ct);
        var budgets = await _budgetService.EffectiveAsOfAsync(userId, monthStart, ct);
        var insurance = await _db.FinancialProfileInsurancePolicies.Where(p => p.UserId == userId).ToListAsync(ct);
        var ownedAccountIds = await _db.Accounts.Where(a => a.UserId == userId).Select(a => a.AccountId).ToListAsync(ct);
        var accountNames = await _db.Accounts.Where(a => a.UserId == userId)
            .ToDictionaryAsync(a => a.AccountId, a => a.AccountName, ct);
        // Cash accounts (savings / MM / checking) are the common DFAS-allotment
        // destination. Pull their names too so the allotment row can label them.
        var cashAccountNames = await _db.CashAccounts.Where(a => a.UserId == userId)
            .ToDictionaryAsync(
                a => a.CashAccountId,
                a => string.IsNullOrWhiteSpace(a.Nickname) ? a.AccountType : a.Nickname!,
                ct);

        var inflowsByType = new List<InflowByType>();
        var savingsAllotments = new List<SavingsAllotment>();
        var externalAllotments = new List<ExternalAllotment>();

        foreach (var s in streams)
        {
            // IncomeStream stores a free-form IncomeType string (e.g. "salary", "va_disability").
            // Surface it title-cased for display; the dashboard / AI prompt can lowercase if needed.
            var typeLabel = NormalizeIncomeTypeLabel(s.IncomeType);
            var (amount, basisLabel, missingNet) = ResolveCashFlowAmount(s);

            switch (s.AllotmentType)
            {
                case IncomeStreamAllotmentType.None:
                    inflowsByType.Add(new InflowByType(
                        Type: typeLabel,
                        Amount: amount,
                        Source: "Profile",
                        IsProfileOnly: true,
                        IsAmbiguousAllotment: false,
                        Basis: basisLabel,
                        IsMissingNetAmount: missingNet));
                    break;
                case IncomeStreamAllotmentType.SavingsToLinkedAccount:
                    // Informational only — paycheck already includes this routing.
                    // Destination may be an investment Account OR a CashAccount.
                    string? destName = null;
                    if (s.AllotmentDestinationAccountId is { } invId
                        && accountNames.TryGetValue(invId, out var invName))
                    {
                        destName = invName;
                    }
                    else if (s.AllotmentDestinationCashAccountId is { } cashId
                        && cashAccountNames.TryGetValue(cashId, out var cashName))
                    {
                        destName = cashName;
                    }
                    savingsAllotments.Add(new SavingsAllotment(
                        IncomeStreamId: s.IncomeStreamId,
                        Name: s.Name,
                        Amount: amount,
                        DestinationAccountId: s.AllotmentDestinationAccountId,
                        DestinationName: destName));
                    break;
                case IncomeStreamAllotmentType.ExternalOutflow:
                    externalAllotments.Add(new ExternalAllotment(
                        IncomeStreamId: s.IncomeStreamId,
                        Name: s.Name,
                        Amount: amount,
                        Notes: null));
                    break;
                case IncomeStreamAllotmentType.Other:
                    inflowsByType.Add(new InflowByType(
                        Type: typeLabel,
                        Amount: amount,
                        Source: "Profile",
                        IsProfileOnly: true,
                        IsAmbiguousAllotment: true,
                        Basis: basisLabel,
                        IsMissingNetAmount: missingNet));
                    break;
            }
        }

        var totalProfileInflow = inflowsByType.Sum(i => i.Amount);

        // Outflows: budgets + insurance premiums + external allotments
        var outflowsByCategory = budgets
            .Select(b => new OutflowByCategory(
                Category: b.PlaidPrimaryCategory ?? b.Category,
                Actual: 0m,
                Budgeted: _budgetService.ComputeMonthlyBudgeted(b),
                Source: "Profile",
                IsProfileOnly: true))
            .ToList();

        var insurancePremiums = insurance
            .Where(p => p.PremiumAmount.HasValue)
            .Select(p => new InsurancePremium(
                PolicyType: p.PolicyType,
                PolicyName: p.PolicyName,
                MonthlyAmount: NormalizePremiumToMonthly(p),
                RenewalDate: p.RenewalDate))
            .ToList();

        // Plaid Observed — last completed month
        var spendingByCategory = await _analytics.GetByCategoryAsync(userId, priorMonthStart, monthStart, ct);
        foreach (var s in spendingByCategory)
        {
            var existing = outflowsByCategory.FirstOrDefault(o =>
                string.Equals(o.Category, s.PlaidPrimaryCategory, StringComparison.OrdinalIgnoreCase));
            if (existing is null)
            {
                outflowsByCategory.Add(new OutflowByCategory(
                    Category: s.PlaidPrimaryCategory,
                    Actual: s.ActualAmount,
                    Budgeted: s.BudgetedAmount,
                    Source: "Plaid",
                    IsProfileOnly: false));
            }
            else
            {
                var idx = outflowsByCategory.IndexOf(existing);
                outflowsByCategory[idx] = existing with
                {
                    Actual = s.ActualAmount,
                    Budgeted = s.BudgetedAmount ?? existing.Budgeted,
                    Source = "Plaid",
                    IsProfileOnly = false,
                };
            }
        }
        outflowsByCategory = outflowsByCategory
            .OrderByDescending(o => Math.Max(o.Actual, o.Budgeted ?? 0m))
            .ToList();

        // Total outflows: prefer Actual where present, else Budgeted; plus insurance + external allotments
        var totalCategoryOutflow = outflowsByCategory.Sum(o => o.Actual > 0 ? o.Actual : (o.Budgeted ?? 0m));
        var totalInsuranceOutflow = insurancePremiums.Sum(p => p.MonthlyAmount);
        var totalExternalAllotments = externalAllotments.Sum(a => a.Amount);
        var totalOutflow = totalCategoryOutflow + totalInsuranceOutflow + totalExternalAllotments;

        // Plaid observed inflows last month (excluding internal transfers)
        var plaidSummary = await _analytics.GetMonthlySummaryAsync(userId, priorMonthStart, monthStart, ct);

        // Variance detection: total profile inflow vs Plaid observed inflow last month
        var variances = new List<CashFlowVariance>();
        if (totalProfileInflow > 0 && plaidSummary.TotalInflows > 0)
        {
            var deltaPct = Math.Abs(totalProfileInflow - plaidSummary.TotalInflows) / totalProfileInflow;
            if (deltaPct >= 0.10m)
            {
                variances.Add(new CashFlowVariance(
                    Stream: "TotalInflows",
                    Profile: totalProfileInflow,
                    Plaid: plaidSummary.TotalInflows,
                    DeltaPercent: Math.Round(deltaPct * 100m, 2),
                    Severity: "info"));
            }
        }

        return new CashFlowSummary(
            TotalMonthlyInflows: totalProfileInflow,
            TotalMonthlyOutflows: totalOutflow,
            NetMonthlyCashFlow: totalProfileInflow - totalOutflow,
            Inflows: new InflowSection(inflowsByType, savingsAllotments),
            Outflows: new OutflowSection(outflowsByCategory, insurancePremiums, externalAllotments),
            Variances: variances,
            AsOfUtc: asOf);
    }

    /// <summary>
    /// Resolve the cash-flow amount for an income stream based on its
    /// <see cref="IncomeStreamProfile.CashFlowBasis"/>:
    ///   - <c>Net</c>: use <see cref="IncomeStreamProfile.MonthlyNetAmount"/> if set;
    ///     otherwise fall back to gross and flag <c>IsMissingNetAmount</c> so the UI
    ///     can prompt the user to enter take-home pay.
    ///   - <c>Gross</c>: use <see cref="IncomeStreamProfile.MonthlyAmount"/>.
    /// </summary>
    private static (decimal Amount, string BasisLabel, bool MissingNet) ResolveCashFlowAmount(IncomeStreamProfile s)
    {
        if (s.CashFlowBasis == IncomeStreamCashFlowBasis.Net)
        {
            if (s.MonthlyNetAmount.HasValue && s.MonthlyNetAmount.Value > 0)
            {
                return (s.MonthlyNetAmount.Value, "Net", false);
            }
            // Net requested but not entered — fall back to gross with a flag.
            return (s.MonthlyAmount, "Net (missing — using gross)", true);
        }
        return (s.MonthlyAmount, "Gross", false);
    }

    /// <summary>Convert an IncomeStream's free-form type string into a display-friendly label.</summary>
    private static string NormalizeIncomeTypeLabel(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return "Other";
        return raw.ToLowerInvariant() switch
        {
            "salary" => "Salary",
            "wages" => "Wages",
            "va_disability" or "vadisability" => "VADisability",
            "pension" => "Pension",
            "social_security" or "socialsecurity" => "SocialSecurity",
            "dividends" => "Dividends",
            "interest" => "Interest",
            "rental_income" or "rentalincome" or "rental" => "RentalIncome",
            "self_employment" or "selfemployment" => "SelfEmployment",
            "other" => "Other",
            _ => char.ToUpperInvariant(raw[0]) + raw.Substring(1)
        };
    }

    private static decimal NormalizePremiumToMonthly(FinancialProfileInsurancePolicy p)
    {
        var amt = p.PremiumAmount ?? 0m;
        return (p.PremiumFrequency ?? "Monthly").ToLowerInvariant() switch
        {
            "weekly" => amt * 52m / 12m,
            "biweekly" => amt * 26m / 12m,
            "semimonthly" or "semi-monthly" => amt * 2m,
            "monthly" => amt,
            "quarterly" => amt / 3m,
            "semiannual" or "semi-annual" or "semiannually" => amt / 6m,
            "annual" or "annually" or "yearly" => amt / 12m,
            _ => amt
        };
    }
}
