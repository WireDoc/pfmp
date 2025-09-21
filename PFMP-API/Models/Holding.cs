using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PFMP_API.Models
{
    /// <summary>
    /// Individual holdings/positions within accounts (stocks, bonds, crypto, etc.)
    /// </summary>
    public class Holding
    {
        [Key]
        public int HoldingId { get; set; }

        [Required]
        public int AccountId { get; set; }

        [Required]
        [MaxLength(20)]
        public string Symbol { get; set; } = string.Empty; // AAPL, BTC, etc.

        [MaxLength(200)]
        public string? Name { get; set; } // Apple Inc., Bitcoin, etc.

        [Required]
        public AssetType AssetType { get; set; }

        // Quantity and Pricing
        [Column(TypeName = "decimal(18,8)")]
        [Required]
        public decimal Quantity { get; set; }

        [Column(TypeName = "decimal(18,8)")]
        [Required]
        public decimal AverageCostBasis { get; set; }

        [Column(TypeName = "decimal(18,8)")]
        public decimal CurrentPrice { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal CurrentValue => Quantity * CurrentPrice;

        [Column(TypeName = "decimal(18,2)")]
        public decimal TotalCostBasis => Quantity * AverageCostBasis;

        [Column(TypeName = "decimal(18,2)")]
        public decimal UnrealizedGainLoss => CurrentValue - TotalCostBasis;

        [Column(TypeName = "decimal(8,4)")]
        public decimal UnrealizedGainLossPercentage => 
            TotalCostBasis != 0 ? (UnrealizedGainLoss / TotalCostBasis) * 100 : 0;

        // Dividend/Staking Information
        [Column(TypeName = "decimal(8,4)")]
        public decimal? AnnualDividendYield { get; set; }

        [Column(TypeName = "decimal(8,4)")]
        public decimal? StakingAPY { get; set; } // For crypto staking

        [Column(TypeName = "decimal(18,2)")]
        public decimal? AnnualDividendIncome { get; set; }

        public DateTime? LastDividendDate { get; set; }
        public DateTime? NextDividendDate { get; set; }

        // Risk Metrics
        public decimal? Beta { get; set; }
        public string? SectorAllocation { get; set; }
        public string? GeographicAllocation { get; set; }

        // Tax Information
        public bool IsQualifiedDividend { get; set; } = false;
        public DateTime? PurchaseDate { get; set; }
        public bool IsLongTermCapitalGains { get; set; } = false;

        // Metadata
        [Required]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Required]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        public DateTime? LastPriceUpdate { get; set; }

        public string? Notes { get; set; }

        // Navigation Properties
        [ForeignKey("AccountId")]
        public virtual Account Account { get; set; } = null!;

        public virtual ICollection<Transaction> Transactions { get; set; } = new List<Transaction>();
    }

    public enum AssetType
    {
        // Equities
        Stock,
        ETF,
        MutualFund,
        Index,
        
        // Fixed Income
        Bond,
        TreasuryBill,
        CorporateBond,
        MunicipalBond,
        
        // Cash Equivalents
        Cash,
        MoneyMarket,
        CertificateOfDeposit,
        
        // Cryptocurrency
        Cryptocurrency,
        CryptoStaking,
        DeFiToken,
        NFT,
        
        // Alternatives
        RealEstate,
        REIT,
        Commodity,
        PreciousMetal,
        
        // TSP Funds
        TSPGFund,
        TSPFFund,
        TSPCFund,
        TSPSFund,
        TSPIFund,
        TSPLifecycleFund,
        
        // Other
        Option,
        Futures,
        Other
    }
}