using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using PFMP_API.Models;
using PFMP_API.Models.Spending;

namespace PFMP_API.Services.Spending;

/// <summary>
/// Wave 14 P1: monthly roll-ups, budget-vs-actual variance, top-N merchant
/// aggregation. Applies the configured internal-transfer exclusion list so
/// credit-card payoffs and own-account transfers don't double-count.
/// </summary>
public interface ISpendingAnalyticsService
{
    Task<MonthlySummary> GetMonthlySummaryAsync(int userId, DateTime from, DateTime to, CancellationToken ct = default);
    Task<IReadOnlyList<CategoryRollup>> GetByCategoryAsync(int userId, DateTime periodStart, DateTime periodEnd, CancellationToken ct = default);
    Task<IReadOnlyList<MerchantAggregate>> GetTopMerchantsAsync(int userId, int limit, DateTime from, DateTime to, CancellationToken ct = default);
    Task<IReadOnlyList<CashTransaction>> GetTransactionsAsync(int userId, string? plaidPrimaryCategory, DateTime from, DateTime to, CancellationToken ct = default);
    Task RecomputeRollupsAsync(int userId, int monthsBack = 12, CancellationToken ct = default);
}

public record MonthlySummary(
    DateTime From,
    DateTime To,
    decimal TotalInflows,
    decimal TotalOutflows,
    decimal Net,
    int TransactionCount);

public record CategoryRollup(
    string PlaidPrimaryCategory,
    string? PlaidDetailedCategory,
    decimal ActualAmount,
    decimal? BudgetedAmount,
    int TransactionCount);

public record MerchantAggregate(
    string Merchant,
    decimal TotalSpent,
    int TransactionCount,
    string? TopCategory);

public class SpendingAnalyticsService : ISpendingAnalyticsService
{
    private readonly ApplicationDbContext _db;
    private readonly ICategoryRuleService _ruleService;
    private readonly IBudgetService _budgetService;
    private readonly SpendingOptions _options;
    private readonly ILogger<SpendingAnalyticsService> _logger;

    public SpendingAnalyticsService(
        ApplicationDbContext db,
        ICategoryRuleService ruleService,
        IBudgetService budgetService,
        IOptions<SpendingOptions> options,
        ILogger<SpendingAnalyticsService> logger)
    {
        _db = db;
        _ruleService = ruleService;
        _budgetService = budgetService;
        _options = options.Value;
        _logger = logger;
    }

    private async Task<List<CashTransaction>> FetchUserTransactionsAsync(int userId, DateTime from, DateTime to, CancellationToken ct)
    {
        // CashTransaction has no UserId column; resolve via CashAccount.UserId or
        // LiabilityAccount.UserId. Pull both branches, then union in memory.
        var cashAcctIds = await _db.CashAccounts
            .Where(a => a.UserId == userId)
            .Select(a => a.CashAccountId)
            .ToListAsync(ct);

        var liabilityAcctIds = await _db.LiabilityAccounts
            .Where(l => l.UserId == userId)
            .Select(l => l.LiabilityAccountId)
            .ToListAsync(ct);

        var fromUtc = DateTime.SpecifyKind(from, DateTimeKind.Utc);
        var toUtc = DateTime.SpecifyKind(to, DateTimeKind.Utc);

        return await _db.CashTransactions
            .Where(t => t.TransactionDate >= fromUtc && t.TransactionDate < toUtc)
            .Where(t =>
                (t.CashAccountId != null && cashAcctIds.Contains(t.CashAccountId.Value)) ||
                (t.LiabilityAccountId != null && liabilityAcctIds.Contains(t.LiabilityAccountId.Value)))
            .ToListAsync(ct);
    }

    private bool IsInternalTransfer(CashTransaction tx)
    {
        // 1) Plaid PFC detailed-category match (preferred — set by Plaid sync).
        if (tx.PlaidCategoryDetailed is { Length: > 0 } pfc
            && _options.InternalTransferCategories.Contains(pfc, StringComparer.OrdinalIgnoreCase))
        {
            return true;
        }
        // 2) PFMP-internal category match (manual entries / non-Plaid imports —
        //    these have null Plaid columns but a free-form Category like "Transfer").
        if (tx.Category is { Length: > 0 } cat
            && _options.InternalTransferPfmpCategories.Contains(cat, StringComparer.OrdinalIgnoreCase))
        {
            return true;
        }
        // 3) Description / merchant prefix match — catches manual entries with no
        //    category set but a self-describing memo like "Transfer to Self-Directed…".
        if (tx.Description is { Length: > 0 } desc)
        {
            foreach (var prefix in _options.InternalTransferDescriptionPrefixes)
            {
                if (desc.StartsWith(prefix, StringComparison.OrdinalIgnoreCase)) return true;
            }
        }
        return false;
    }

    public async Task<MonthlySummary> GetMonthlySummaryAsync(int userId, DateTime from, DateTime to, CancellationToken ct = default)
    {
        var txs = await FetchUserTransactionsAsync(userId, from, to, ct);
        var filtered = txs.Where(t => !IsInternalTransfer(t)).ToList();
        var inflows = filtered.Where(t => t.Amount > 0).Sum(t => t.Amount);
        var outflows = filtered.Where(t => t.Amount < 0).Sum(t => -t.Amount);
        return new MonthlySummary(from, to, inflows, outflows, inflows - outflows, filtered.Count);
    }

    public async Task<IReadOnlyList<CategoryRollup>> GetByCategoryAsync(int userId, DateTime periodStart, DateTime periodEnd, CancellationToken ct = default)
    {
        var rules = await _ruleService.ListAsync(userId, ct);
        var budgets = await _budgetService.EffectiveAsOfAsync(userId, periodStart, ct);
        var txs = await FetchUserTransactionsAsync(userId, periodStart, periodEnd, ct);

        // Outflows only for category breakdown; exclude internal transfers
        var spendingTxs = txs.Where(t => t.Amount < 0 && !IsInternalTransfer(t)).ToList();

        var groups = spendingTxs
            .Select(t =>
            {
                var (primary, detailed) = _ruleService.Resolve(t, rules);
                return (Tx: t, Primary: primary, Detailed: detailed);
            })
            .GroupBy(x => new { x.Primary, x.Detailed })
            .Select(g => new CategoryRollup(
                g.Key.Primary,
                g.Key.Detailed,
                g.Sum(x => -x.Tx.Amount),
                budgets.FirstOrDefault(b =>
                    string.Equals(b.PlaidPrimaryCategory ?? b.Category, g.Key.Primary, StringComparison.OrdinalIgnoreCase))
                    is { } match ? _budgetService.ComputeMonthlyBudgeted(match) : (decimal?)null,
                g.Count()))
            .OrderByDescending(r => r.ActualAmount)
            .ToList();

        return groups;
    }

    public async Task<IReadOnlyList<MerchantAggregate>> GetTopMerchantsAsync(int userId, int limit, DateTime from, DateTime to, CancellationToken ct = default)
    {
        var txs = await FetchUserTransactionsAsync(userId, from, to, ct);
        var spending = txs.Where(t => t.Amount < 0 && !IsInternalTransfer(t) && !string.IsNullOrWhiteSpace(t.Merchant)).ToList();

        return spending
            .GroupBy(t => t.Merchant!)
            .Select(g => new MerchantAggregate(
                g.Key,
                g.Sum(t => -t.Amount),
                g.Count(),
                g.GroupBy(t => t.PlaidCategory ?? t.Category ?? "UNCATEGORIZED")
                    .OrderByDescending(cg => cg.Count())
                    .Select(cg => cg.Key)
                    .FirstOrDefault()))
            .OrderByDescending(m => m.TotalSpent)
            .Take(limit)
            .ToList();
    }

    public async Task<IReadOnlyList<CashTransaction>> GetTransactionsAsync(int userId, string? plaidPrimaryCategory, DateTime from, DateTime to, CancellationToken ct = default)
    {
        var txs = await FetchUserTransactionsAsync(userId, from, to, ct);
        if (string.IsNullOrWhiteSpace(plaidPrimaryCategory)) return txs.OrderByDescending(t => t.TransactionDate).ToList();
        var rules = await _ruleService.ListAsync(userId, ct);
        return txs
            .Where(t =>
            {
                var (primary, _) = _ruleService.Resolve(t, rules);
                return string.Equals(primary, plaidPrimaryCategory, StringComparison.OrdinalIgnoreCase);
            })
            .OrderByDescending(t => t.TransactionDate)
            .ToList();
    }

    public async Task RecomputeRollupsAsync(int userId, int monthsBack = 12, CancellationToken ct = default)
    {
        var anchor = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var from = anchor.AddMonths(-(monthsBack - 1));

        // Wipe existing rollups in the window
        var existing = await _db.SpendingCategoryRollups
            .Where(r => r.UserId == userId && r.PeriodStart >= from)
            .ToListAsync(ct);
        _db.SpendingCategoryRollups.RemoveRange(existing);

        for (int i = 0; i < monthsBack; i++)
        {
            var periodStart = from.AddMonths(i);
            var periodEnd = periodStart.AddMonths(1);
            var groups = await GetByCategoryAsync(userId, periodStart, periodEnd, ct);
            foreach (var g in groups)
            {
                _db.SpendingCategoryRollups.Add(new SpendingCategoryRollup
                {
                    UserId = userId,
                    PeriodStart = periodStart,
                    PlaidPrimaryCategory = g.PlaidPrimaryCategory,
                    PlaidDetailedCategory = g.PlaidDetailedCategory,
                    ActualAmount = g.ActualAmount,
                    BudgetedAmount = g.BudgetedAmount,
                    TransactionCount = g.TransactionCount,
                    DateUpdated = DateTime.UtcNow,
                });
            }
        }

        await _db.SaveChangesAsync(ct);
        _logger.LogInformation("Recomputed {Months} months of spending rollups for user {UserId}", monthsBack, userId);
    }
}
