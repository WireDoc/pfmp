using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PFMP_API.Models.Plaid
{
    /// <summary>
    /// Reference table for securities synced from Plaid.
    /// Stores security metadata for consistent lookups across holdings.
    /// </summary>
    [Table("PlaidSecurities")]
    public class PlaidSecurity
    {
        /// <summary>
        /// Plaid's unique security identifier (primary key)
        /// </summary>
        [Key]
        [MaxLength(100)]
        public string PlaidSecurityId { get; set; } = string.Empty;

        /// <summary>
        /// Ticker symbol (e.g., AAPL, VTI)
        /// </summary>
        [MaxLength(20)]
        public string? TickerSymbol { get; set; }

        /// <summary>
        /// Full security name (e.g., "Apple Inc.", "Vanguard Total Stock Market ETF")
        /// </summary>
        [Required]
        [MaxLength(300)]
        public string Name { get; set; } = string.Empty;

        /// <summary>
        /// Security type from Plaid (equity, etf, mutual fund, fixed income, etc.)
        /// </summary>
        [Required]
        [MaxLength(50)]
        public string Type { get; set; } = string.Empty;

        /// <summary>
        /// CUSIP identifier (9-character)
        /// </summary>
        [MaxLength(20)]
        public string? Cusip { get; set; }

        /// <summary>
        /// ISIN identifier (12-character international)
        /// </summary>
        [MaxLength(20)]
        public string? Isin { get; set; }

        /// <summary>
        /// SEDOL identifier (UK/Ireland)
        /// </summary>
        [MaxLength(20)]
        public string? Sedol { get; set; }

        /// <summary>
        /// Institution security identifier (brokerage-specific)
        /// </summary>
        [MaxLength(100)]
        public string? InstitutionSecurityId { get; set; }

        /// <summary>
        /// ISO currency code
        /// </summary>
        [MaxLength(10)]
        public string? IsoCurrencyCode { get; set; }

        /// <summary>
        /// Unofficial currency code (for crypto etc.)
        /// </summary>
        [MaxLength(10)]
        public string? UnofficialCurrencyCode { get; set; }

        /// <summary>
        /// Most recent close price
        /// </summary>
        [Column(TypeName = "decimal(18,8)")]
        public decimal? ClosePrice { get; set; }

        /// <summary>
        /// Date of close price
        /// </summary>
        public DateTime? ClosePriceAsOf { get; set; }

        /// <summary>
        /// Whether this security is a cash equivalent
        /// </summary>
        public bool IsCashEquivalent { get; set; } = false;

        /// <summary>
        /// When this security was first synced
        /// </summary>
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// When this security was last updated
        /// </summary>
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
