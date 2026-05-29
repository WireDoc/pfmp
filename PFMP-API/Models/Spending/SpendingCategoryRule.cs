using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PFMP_API.Models.Spending;

/// <summary>
/// Wave 14: user-defined recategorization rule applied at read time when computing
/// roll-ups. Never mutates the underlying <c>CashTransaction.PlaidCategory</c>, so
/// Plaid re-syncs don't clobber user intent.
/// </summary>
[Table("SpendingCategoryRules")]
public class SpendingCategoryRule
{
    [Key]
    public int RuleId { get; set; }

    [Required]
    public int UserId { get; set; }

    [Required]
    public SpendingCategoryRuleMatchType MatchType { get; set; }

    [Required]
    [MaxLength(200)]
    public string MatchValue { get; set; } = string.Empty;

    [Required]
    [MaxLength(120)]
    public string AssignedPrimaryCategory { get; set; } = string.Empty;

    [MaxLength(160)]
    public string? AssignedDetailedCategory { get; set; }

    /// <summary>Lower runs first; ties broken by RuleId.</summary>
    public int Priority { get; set; } = 100;

    public bool IsActive { get; set; } = true;

    [Required]
    public DateTime DateCreated { get; set; } = DateTime.UtcNow;

    [Required]
    public DateTime DateUpdated { get; set; } = DateTime.UtcNow;
}

public enum SpendingCategoryRuleMatchType
{
    MerchantExact,
    MerchantContains,
    DescriptionContains,
    PlaidDetailedCategory,
}
