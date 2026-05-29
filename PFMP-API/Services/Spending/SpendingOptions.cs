namespace PFMP_API.Services.Spending;

/// <summary>
/// Wave 14 P1: bound from <c>appsettings.json</c> section <c>Spending</c>.
/// </summary>
public class SpendingOptions
{
    public const string SectionName = "Spending";

    /// <summary>
    /// Plaid detailed-category strings that are excluded from outflow / inflow totals
    /// because they represent money movement BETWEEN the user's own accounts (credit-card
    /// payoffs, savings sweeps). Without this filter, a credit-card-heavy user would
    /// see their monthly CC payment double-count alongside the underlying purchases.
    /// </summary>
    public List<string> InternalTransferCategories { get; set; } = new()
    {
        "LOAN_PAYMENTS_CREDIT_CARD_PAYMENT",
        "TRANSFER_IN_ACCOUNT_TRANSFER",
        "TRANSFER_OUT_ACCOUNT_TRANSFER",
        "TRANSFER_IN_DEPOSIT",
        "TRANSFER_OUT_WITHDRAWAL",
    };

    /// <summary>
    /// On-demand recompute rate limit (per user). 1/hour by default.
    /// </summary>
    public int RecomputeRateLimitMinutes { get; set; } = 60;
}
