using Microsoft.EntityFrameworkCore;
using PFMP_API.Models.FinancialProfile;

namespace PFMP_API.Services.Spending;

/// <summary>
/// Wave 14 P1: period-aware CRUD for <see cref="ExpenseBudget"/>. Effective-dated
/// budgets allow time-boxed period type changes; <see cref="EffectiveAsOfAsync"/>
/// returns the budget rows that apply at a given moment.
/// </summary>
public interface IBudgetService
{
    Task<IReadOnlyList<ExpenseBudget>> ListAsync(int userId, CancellationToken ct = default);
    Task<IReadOnlyList<ExpenseBudget>> EffectiveAsOfAsync(int userId, DateTime asOf, CancellationToken ct = default);
    Task<ExpenseBudget> CreateAsync(ExpenseBudget budget, CancellationToken ct = default);
    Task<ExpenseBudget?> UpdateAsync(int budgetId, ExpenseBudget patch, CancellationToken ct = default);
    Task<bool> DeleteAsync(int budgetId, CancellationToken ct = default);

    /// <summary>
    /// Convert a budget's <see cref="ExpenseBudget.MonthlyAmount"/> + rollover into the
    /// effective budgeted amount for a given month-start period. Period type translation
    /// (Weekly / Biweekly / Annual → Monthly) is applied so all callers can reason in
    /// month-aligned dollars.
    /// </summary>
    decimal ComputeMonthlyBudgeted(ExpenseBudget budget);
}

public class BudgetService : IBudgetService
{
    private readonly ApplicationDbContext _db;
    private readonly ILogger<BudgetService> _logger;

    public BudgetService(ApplicationDbContext db, ILogger<BudgetService> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task<IReadOnlyList<ExpenseBudget>> ListAsync(int userId, CancellationToken ct = default)
    {
        return await _db.ExpenseBudgets
            .Where(b => b.UserId == userId)
            .OrderBy(b => b.Category)
            .ThenByDescending(b => b.EffectiveFrom)
            .ToListAsync(ct);
    }

    public async Task<IReadOnlyList<ExpenseBudget>> EffectiveAsOfAsync(int userId, DateTime asOf, CancellationToken ct = default)
    {
        return await _db.ExpenseBudgets
            .Where(b => b.UserId == userId
                && b.EffectiveFrom <= asOf
                && (b.EffectiveTo == null || b.EffectiveTo > asOf))
            .OrderBy(b => b.Category)
            .ToListAsync(ct);
    }

    public async Task<ExpenseBudget> CreateAsync(ExpenseBudget budget, CancellationToken ct = default)
    {
        budget.CreatedAt = DateTime.UtcNow;
        budget.UpdatedAt = DateTime.UtcNow;
        if (budget.EffectiveFrom == default) budget.EffectiveFrom = DateTime.UtcNow;
        _db.ExpenseBudgets.Add(budget);
        await _db.SaveChangesAsync(ct);
        _logger.LogInformation(
            "Created budget {BudgetId} for user {UserId} ({Category} {Period} {Amount:C})",
            budget.ExpenseBudgetId, budget.UserId, budget.Category, budget.PeriodType, budget.MonthlyAmount);
        return budget;
    }

    public async Task<ExpenseBudget?> UpdateAsync(int budgetId, ExpenseBudget patch, CancellationToken ct = default)
    {
        var existing = await _db.ExpenseBudgets.FirstOrDefaultAsync(b => b.ExpenseBudgetId == budgetId, ct);
        if (existing is null) return null;
        existing.Category = patch.Category;
        existing.MonthlyAmount = patch.MonthlyAmount;
        existing.IsEstimated = patch.IsEstimated;
        existing.Notes = patch.Notes;
        existing.PeriodType = patch.PeriodType;
        existing.EffectiveFrom = patch.EffectiveFrom == default ? existing.EffectiveFrom : patch.EffectiveFrom;
        existing.EffectiveTo = patch.EffectiveTo;
        existing.RolloverEnabled = patch.RolloverEnabled;
        existing.RolloverAmount = patch.RolloverAmount;
        existing.PlaidPrimaryCategory = patch.PlaidPrimaryCategory;
        existing.PlaidDetailedCategory = patch.PlaidDetailedCategory;
        existing.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
        return existing;
    }

    public async Task<bool> DeleteAsync(int budgetId, CancellationToken ct = default)
    {
        var existing = await _db.ExpenseBudgets.FirstOrDefaultAsync(b => b.ExpenseBudgetId == budgetId, ct);
        if (existing is null) return false;
        _db.ExpenseBudgets.Remove(existing);
        await _db.SaveChangesAsync(ct);
        return true;
    }

    public decimal ComputeMonthlyBudgeted(ExpenseBudget budget)
    {
        // MonthlyAmount stores the user's input normalized to a monthly figure during entry.
        // PeriodType is preserved for UI re-display; here we just add the rollover bucket.
        var baseMonthly = budget.PeriodType switch
        {
            BudgetPeriodType.Monthly => budget.MonthlyAmount,
            BudgetPeriodType.Weekly => budget.MonthlyAmount * 52m / 12m,
            BudgetPeriodType.Biweekly => budget.MonthlyAmount * 26m / 12m,
            BudgetPeriodType.Annual => budget.MonthlyAmount / 12m,
            _ => budget.MonthlyAmount
        };
        return budget.RolloverEnabled ? baseMonthly + budget.RolloverAmount : baseMonthly;
    }
}
