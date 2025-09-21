using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

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
        
        public DateTime LastUpdated { get; set; } = DateTime.UtcNow;
    }
}