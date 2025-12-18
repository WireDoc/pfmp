namespace PFMP_API.Models.Analytics;

/// <summary>
/// Status of an account's transaction history for performance calculations
/// </summary>
public class TransactionHistoryStatus
{
    /// <summary>
    /// Whether the transaction history is complete enough for accurate performance calculations
    /// </summary>
    public bool IsComplete { get; set; }
    
    /// <summary>
    /// Whether the account is linked via Plaid
    /// </summary>
    public bool IsPlaidLinked { get; set; }
    
    /// <summary>
    /// Whether the account has any INITIAL_BALANCE transactions
    /// </summary>
    public bool HasInitialBalance { get; set; }
    
    /// <summary>
    /// Date of the first transaction in the account
    /// </summary>
    public DateTime? FirstTransactionDate { get; set; }
    
    /// <summary>
    /// Human-readable message about the status
    /// </summary>
    public string Message { get; set; } = string.Empty;
    
    /// <summary>
    /// List of holdings that need opening balances
    /// </summary>
    public List<HoldingOpeningBalanceInfo> HoldingsNeedingBalance { get; set; } = new();
}

/// <summary>
/// Information about a holding that needs an opening balance
/// </summary>
public class HoldingOpeningBalanceInfo
{
    public int HoldingId { get; set; }
    public string Symbol { get; set; } = string.Empty;
    public decimal CurrentQuantity { get; set; }
    public decimal CurrentPrice { get; set; }
}

/// <summary>
/// Request to add opening balances for holdings
/// </summary>
public class AddOpeningBalancesRequest
{
    public List<OpeningBalanceEntry> Balances { get; set; } = new();
}

/// <summary>
/// Single opening balance entry
/// </summary>
public class OpeningBalanceEntry
{
    public int HoldingId { get; set; }
    public decimal Quantity { get; set; }
    public decimal PricePerShare { get; set; }
    public DateTime Date { get; set; }
}
