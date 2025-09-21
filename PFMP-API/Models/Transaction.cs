using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PFMP_API.Models
{
    /// <summary>
    /// All financial transactions including trades, deposits, withdrawals, dividends, etc.
    /// </summary>
    public class Transaction
    {
        [Key]
        public int TransactionId { get; set; }

        [Required]
        public int AccountId { get; set; }

        public int? HoldingId { get; set; } // Null for cash transactions

        [Required]
        [MaxLength(100)]
        public string TransactionType { get; set; } = string.Empty;

        [MaxLength(20)]
        public string? Symbol { get; set; } // For investment transactions

        // Transaction Details
        [Column(TypeName = "decimal(18,8)")]
        public decimal? Quantity { get; set; } // For buy/sell transactions

        [Column(TypeName = "decimal(18,8)")]
        public decimal? Price { get; set; } // Price per share/unit

        [Column(TypeName = "decimal(18,2)")]
        [Required]
        public decimal Amount { get; set; } // Total transaction amount

        [Column(TypeName = "decimal(18,2)")]
        public decimal? Fee { get; set; } // Transaction fees

        [Required]
        public DateTime TransactionDate { get; set; }

        [Required]
        public DateTime SettlementDate { get; set; }

        // Tax Information
        public bool IsTaxable { get; set; } = true;
        public bool IsLongTermCapitalGains { get; set; } = false;

        [Column(TypeName = "decimal(18,2)")]
        public decimal? TaxableAmount { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal? CostBasis { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal? CapitalGainLoss { get; set; }

        // Source Information
        public TransactionSource Source { get; set; } = TransactionSource.Manual;

        [MaxLength(100)]
        public string? ExternalTransactionId { get; set; } // From API

        [MaxLength(500)]
        public string? Description { get; set; }

        // Dividend/Income Specific
        public bool IsDividendReinvestment { get; set; } = false;
        public bool IsQualifiedDividend { get; set; } = false;

        // Crypto Specific
        [Column(TypeName = "decimal(18,2)")]
        public decimal? StakingReward { get; set; }

        [Column(TypeName = "decimal(8,4)")]
        public decimal? StakingAPY { get; set; }

        // Metadata
        [Required]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public string? Notes { get; set; }

        // Navigation Properties
        [ForeignKey("AccountId")]
        public virtual Account Account { get; set; } = null!;

        [ForeignKey("HoldingId")]
        public virtual Holding? Holding { get; set; }
    }

    public enum TransactionSource
    {
        Manual,
        BinanceAPI,
        CoinbaseAPI,
        TDAmeritrade,
        ETrade,
        Schwab,
        Fidelity,
        TSPUpdate,
        BankAPI,
        Other
    }
}

namespace PFMP_API.Models
{
    /// <summary>
    /// Common transaction types for easy categorization
    /// </summary>
    public static class TransactionTypes
    {
        // Investment Transactions
        public const string Buy = "BUY";
        public const string Sell = "SELL";
        public const string Dividend = "DIVIDEND";
        public const string DividendReinvestment = "DIVIDEND_REINVEST";
        public const string CapitalGains = "CAPITAL_GAINS";
        public const string Interest = "INTEREST";
        public const string Split = "SPLIT";
        public const string Spinoff = "SPINOFF";

        // Cash Transactions
        public const string Deposit = "DEPOSIT";
        public const string Withdrawal = "WITHDRAWAL";
        public const string Transfer = "TRANSFER";
        public const string Fee = "FEE";
        public const string InterestEarned = "INTEREST_EARNED";

        // Crypto Transactions
        public const string CryptoStaking = "CRYPTO_STAKING";
        public const string CryptoSwap = "CRYPTO_SWAP";
        public const string CryptoMining = "CRYPTO_MINING";
        public const string DeFiYield = "DEFI_YIELD";

        // TSP Transactions
        public const string TSPContribution = "TSP_CONTRIBUTION";
        public const string TSPEmployerMatch = "TSP_EMPLOYER_MATCH";
        public const string TSPRebalance = "TSP_REBALANCE";

        // Other
        public const string Other = "OTHER";
    }
}