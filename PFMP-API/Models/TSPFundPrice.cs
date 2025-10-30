using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PFMP_API.Models
{
    /// <summary>
    /// Daily TSP fund prices - prices reflect close of last business day
    /// </summary>
    [Table("TSPFundPrices")]
    public class TSPFundPrice
    {
        [Key]
        public int TSPFundPriceId { get; set; }

        [Required]
        public DateTime PriceDate { get; set; }

        // G Fund - Government Securities Investment Fund
        [Column(TypeName = "decimal(18,8)")]
        public decimal GFundPrice { get; set; }

        // F Fund - Fixed Income Index Investment Fund
        [Column(TypeName = "decimal(18,8)")]
        public decimal FFundPrice { get; set; }

        // C Fund - Common Stock Index Investment Fund (S&P 500)
        [Column(TypeName = "decimal(18,8)")]
        public decimal CFundPrice { get; set; }

        // S Fund - Small Cap Stock Index Investment Fund
        [Column(TypeName = "decimal(18,8)")]
        public decimal SFundPrice { get; set; }

        // I Fund - International Stock Index Investment Fund
        [Column(TypeName = "decimal(18,8)")]
        public decimal IFundPrice { get; set; }

        // Lifecycle Funds
        [Column(TypeName = "decimal(18,8)")]
        public decimal? LIncomeFundPrice { get; set; }

        [Column(TypeName = "decimal(18,8)")]
        public decimal? L2030FundPrice { get; set; }

        [Column(TypeName = "decimal(18,8)")]
        public decimal? L2035FundPrice { get; set; }

        [Column(TypeName = "decimal(18,8)")]
        public decimal? L2040FundPrice { get; set; }

        [Column(TypeName = "decimal(18,8)")]
        public decimal? L2045FundPrice { get; set; }

        [Column(TypeName = "decimal(18,8)")]
        public decimal? L2050FundPrice { get; set; }

        [Column(TypeName = "decimal(18,8)")]
        public decimal? L2055FundPrice { get; set; }

        [Column(TypeName = "decimal(18,8)")]
        public decimal? L2060FundPrice { get; set; }

        [Column(TypeName = "decimal(18,8)")]
        public decimal? L2065FundPrice { get; set; }

        [Column(TypeName = "decimal(18,8)")]
        public decimal? L2070FundPrice { get; set; }

        [Column(TypeName = "decimal(18,8)")]
        public decimal? L2075FundPrice { get; set; }

        [Required]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [MaxLength(100)]
        public string? DataSource { get; set; } // "FMP_API", "Manual", etc.
    }
}
