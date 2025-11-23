using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace PFMP_API.Models
{
    /// <summary>
    /// Financial accounts including trading platforms, banks, TSP, and manual accounts
    /// </summary>
    public class Account
    {
        [Key]
        public int AccountId { get; set; }

        [Required]
        public int UserId { get; set; }

        [Required]
        [MaxLength(200)]
        public string AccountName { get; set; } = string.Empty;

        [Required]
        public AccountType AccountType { get; set; }

        [Required]
        public AccountCategory Category { get; set; }

        [MaxLength(100)]
        public string? Institution { get; set; }

        [MaxLength(50)]
        public string? AccountNumber { get; set; } // Last 4 digits only

        // Current Financial Data
        [Column(TypeName = "decimal(18,2)")]
        [Required]
        public decimal CurrentBalance { get; set; }

        [Column(TypeName = "decimal(18,8)")]
        public decimal? InterestRate { get; set; } // APR/APY for cash accounts

        public DateTime? InterestRateUpdatedAt { get; set; }

        // API Integration
        public bool HasAPIIntegration { get; set; } = false;
        public string? APIProvider { get; set; } // Binance, TD Ameritrade, etc.
        public bool IsAPIConnected { get; set; } = false;
        public DateTime? LastAPISync { get; set; }
        public string? APIConnectionStatus { get; set; }

        // Account State (Skeleton vs Detailed)
        [Required]
        [MaxLength(20)]
        public string State { get; set; } = "DETAILED";

        // Helper methods for state
        public bool IsSkeleton() => State == "SKELETON";
        public bool IsDetailed() => State == "DETAILED";

        // TSP Specific Fields
        [Column(TypeName = "decimal(18,2)")]
        public decimal? TSPMonthlyContribution { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal? TSPEmployerMatch { get; set; }

        public TSPAllocation? TSPAllocation { get; set; }

        // Cash Account Optimization
        public bool IsEmergencyFund { get; set; } = false;
        public decimal? OptimalInterestRate { get; set; } // Market comparison rate
        public DateTime? RateLastChecked { get; set; }

        // Account Purpose & Context
        [MaxLength(500)]
        public string? Purpose { get; set; } // e.g., "Transactional Account", "Emergency Fund", "Home Improvement Savings", "Vacation Fund"

        // Metadata
        [Required]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Required]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        public DateTime? LastBalanceUpdate { get; set; }
        public bool IsActive { get; set; } = true;

        public string? Notes { get; set; }

        // Navigation Properties
        [ForeignKey("UserId")]
        [JsonIgnore] // Prevent circular reference in JSON serialization
        public virtual User User { get; set; } = null!;

        public virtual ICollection<Holding> Holdings { get; set; } = new List<Holding>();
        public virtual ICollection<Transaction> Transactions { get; set; } = new List<Transaction>();
        public virtual APICredential? APICredentials { get; set; }
    }

    public enum AccountType
    {
        // Investment Accounts
        Brokerage,
        RetirementAccount401k,
        RetirementAccountIRA,
        RetirementAccountRoth,
        TSP, // Thrift Savings Plan
        HSA, // Health Savings Account
        
        // Cash Accounts
        Checking,
        Savings,
        MoneyMarket,
        CertificateOfDeposit,
        
        // Crypto
        CryptocurrencyExchange,
        CryptocurrencyWallet,
        
        // Other
        RealEstate,
        Business,
        Other
    }

    public enum AccountCategory
    {
        Taxable,
        TaxDeferred, // 401k, Traditional IRA, TSP
        TaxFree, // Roth IRA, Roth 401k
        TaxAdvantaged, // HSA
        Cash,
        Cryptocurrency,
        RealEstate,
        Alternative
    }

    public class TSPAllocation
    {
        // Individual Funds
        [Column(TypeName = "decimal(5,2)")]
        public decimal GFundPercentage { get; set; } // Government Securities

        [Column(TypeName = "decimal(5,2)")]
        public decimal FFundPercentage { get; set; } // Fixed Income

        [Column(TypeName = "decimal(5,2)")]
        public decimal CFundPercentage { get; set; } // Common Stock

        [Column(TypeName = "decimal(5,2)")]
        public decimal SFundPercentage { get; set; } // Small Cap Stock

        [Column(TypeName = "decimal(5,2)")]
        public decimal IFundPercentage { get; set; } // International Stock

        // Lifecycle Funds
        [Column(TypeName = "decimal(5,2)")]
        public decimal LIncomeFundPercentage { get; set; } // L Income (for retirees)

        [Column(TypeName = "decimal(5,2)")]
        public decimal L2030FundPercentage { get; set; } // L 2030

        [Column(TypeName = "decimal(5,2)")]
        public decimal L2035FundPercentage { get; set; } // L 2035

        [Column(TypeName = "decimal(5,2)")]
        public decimal L2040FundPercentage { get; set; } // L 2040

        [Column(TypeName = "decimal(5,2)")]
        public decimal L2045FundPercentage { get; set; } // L 2045

        [Column(TypeName = "decimal(5,2)")]
        public decimal L2050FundPercentage { get; set; } // L 2050

        [Column(TypeName = "decimal(5,2)")]
        public decimal L2055FundPercentage { get; set; } // L 2055

        [Column(TypeName = "decimal(5,2)")]
        public decimal L2060FundPercentage { get; set; } // L 2060

        [Column(TypeName = "decimal(5,2)")]
        public decimal L2065FundPercentage { get; set; } // L 2065

        [Column(TypeName = "decimal(5,2)")]
        public decimal L2070FundPercentage { get; set; } // L 2070

        [Column(TypeName = "decimal(5,2)")]
        public decimal L2075FundPercentage { get; set; } // L 2075
        
        public DateTime LastUpdated { get; set; } = DateTime.UtcNow;
    }
}