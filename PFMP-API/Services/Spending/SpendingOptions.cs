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
    /// payoffs, savings sweeps, brokerage funding). Without this filter, a credit-card-heavy
    /// user would see their monthly CC payment double-count alongside the underlying
    /// purchases, and any "Transfer to Self-Directed Investment Account" would appear as
    /// spending despite being a portfolio rebalance.
    /// </summary>
    public List<string> InternalTransferCategories { get; set; } = new()
    {
        "LOAN_PAYMENTS_CREDIT_CARD_PAYMENT",
        "TRANSFER_IN_ACCOUNT_TRANSFER",
        "TRANSFER_OUT_ACCOUNT_TRANSFER",
        "TRANSFER_IN_DEPOSIT",
        "TRANSFER_OUT_WITHDRAWAL",
        // Brokerage / retirement-account funding transfers
        "TRANSFER_IN_INVESTMENT_AND_RETIREMENT_FUNDS",
        "TRANSFER_OUT_INVESTMENT_AND_RETIREMENT_FUNDS",
        // Savings sweeps
        "TRANSFER_IN_SAVINGS",
        "TRANSFER_OUT_SAVINGS",
        // Catch-all transfer detail buckets
        "TRANSFER_IN_OTHER_TRANSFER_IN",
        "TRANSFER_OUT_OTHER_TRANSFER_OUT",
    };

    /// <summary>
    /// PFMP-internal category strings (set on manual entry or by import pipelines that
    /// don't speak Plaid's PFC taxonomy). Matched against
    /// <c>CashTransaction.Category</c> when Plaid taxonomy is unavailable.
    /// </summary>
    public List<string> InternalTransferPfmpCategories { get; set; } = new()
    {
        "Transfer",
    };

    /// <summary>
    /// Description / merchant text prefixes that imply an internal account-to-account
    /// transfer when both Plaid and PFMP category are blank. Case-insensitive prefix match.
    /// </summary>
    public List<string> InternalTransferDescriptionPrefixes { get; set; } = new()
    {
        "Transfer to ",
        "Transfer from ",
    };

    /// <summary>
    /// On-demand recompute rate limit (per user). 1/hour by default.
    /// </summary>
    public int RecomputeRateLimitMinutes { get; set; } = 60;
}
