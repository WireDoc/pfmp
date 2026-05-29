using Microsoft.EntityFrameworkCore;
using PFMP_API.Models;
using PFMP_API.Models.Spending;

namespace PFMP_API.Services.Spending;

/// <summary>
/// Wave 14 P1: per-user manual recategorization rules. Rules are applied at read
/// time when computing roll-ups — the underlying <see cref="CashTransaction.PlaidCategory"/>
/// is never mutated, so Plaid re-syncs do not clobber user intent.
/// </summary>
public interface ICategoryRuleService
{
    Task<IReadOnlyList<SpendingCategoryRule>> ListAsync(int userId, CancellationToken ct = default);
    Task<SpendingCategoryRule> CreateAsync(SpendingCategoryRule rule, CancellationToken ct = default);
    Task<SpendingCategoryRule?> UpdateAsync(int ruleId, SpendingCategoryRule patch, CancellationToken ct = default);
    Task<bool> DeleteAsync(int ruleId, CancellationToken ct = default);

    /// <summary>
    /// Resolve the effective (primary, detailed) category for a transaction after
    /// applying the user's active rules in priority order. Returns the original Plaid
    /// values when no rule matches.
    /// </summary>
    (string primary, string? detailed) Resolve(CashTransaction tx, IReadOnlyList<SpendingCategoryRule> rules);
}

public class CategoryRuleService : ICategoryRuleService
{
    private readonly ApplicationDbContext _db;
    private readonly ILogger<CategoryRuleService> _logger;

    public CategoryRuleService(ApplicationDbContext db, ILogger<CategoryRuleService> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task<IReadOnlyList<SpendingCategoryRule>> ListAsync(int userId, CancellationToken ct = default)
    {
        return await _db.SpendingCategoryRules
            .Where(r => r.UserId == userId)
            .OrderBy(r => r.Priority)
            .ThenBy(r => r.RuleId)
            .ToListAsync(ct);
    }

    public async Task<SpendingCategoryRule> CreateAsync(SpendingCategoryRule rule, CancellationToken ct = default)
    {
        rule.DateCreated = DateTime.UtcNow;
        rule.DateUpdated = DateTime.UtcNow;
        _db.SpendingCategoryRules.Add(rule);
        await _db.SaveChangesAsync(ct);
        _logger.LogInformation("Created spending category rule {RuleId} for user {UserId}", rule.RuleId, rule.UserId);
        return rule;
    }

    public async Task<SpendingCategoryRule?> UpdateAsync(int ruleId, SpendingCategoryRule patch, CancellationToken ct = default)
    {
        var existing = await _db.SpendingCategoryRules.FirstOrDefaultAsync(r => r.RuleId == ruleId, ct);
        if (existing is null) return null;
        existing.MatchType = patch.MatchType;
        existing.MatchValue = patch.MatchValue;
        existing.AssignedPrimaryCategory = patch.AssignedPrimaryCategory;
        existing.AssignedDetailedCategory = patch.AssignedDetailedCategory;
        existing.Priority = patch.Priority;
        existing.IsActive = patch.IsActive;
        existing.DateUpdated = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
        return existing;
    }

    public async Task<bool> DeleteAsync(int ruleId, CancellationToken ct = default)
    {
        var existing = await _db.SpendingCategoryRules.FirstOrDefaultAsync(r => r.RuleId == ruleId, ct);
        if (existing is null) return false;
        _db.SpendingCategoryRules.Remove(existing);
        await _db.SaveChangesAsync(ct);
        return true;
    }

    public (string primary, string? detailed) Resolve(CashTransaction tx, IReadOnlyList<SpendingCategoryRule> rules)
    {
        foreach (var rule in rules.Where(r => r.IsActive))
        {
            if (Matches(rule, tx))
            {
                return (rule.AssignedPrimaryCategory, rule.AssignedDetailedCategory);
            }
        }
        return (tx.PlaidCategory ?? tx.Category ?? "UNCATEGORIZED", tx.PlaidCategoryDetailed);
    }

    private static bool Matches(SpendingCategoryRule rule, CashTransaction tx) => rule.MatchType switch
    {
        SpendingCategoryRuleMatchType.MerchantExact =>
            string.Equals(tx.Merchant, rule.MatchValue, StringComparison.OrdinalIgnoreCase),
        SpendingCategoryRuleMatchType.MerchantContains =>
            tx.Merchant is { } m && m.Contains(rule.MatchValue, StringComparison.OrdinalIgnoreCase),
        SpendingCategoryRuleMatchType.DescriptionContains =>
            tx.Description is { } d && d.Contains(rule.MatchValue, StringComparison.OrdinalIgnoreCase),
        SpendingCategoryRuleMatchType.PlaidDetailedCategory =>
            string.Equals(tx.PlaidCategoryDetailed, rule.MatchValue, StringComparison.OrdinalIgnoreCase),
        _ => false
    };
}
