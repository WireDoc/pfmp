using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PFMP_API.Models
{
    /// <summary>
    /// Tracks recent user financial actions for AI context
    /// Prevents AI from recommending conflicting actions too soon
    /// </summary>
    public class AIActionMemory
    {
        [Key]
        public int ActionMemoryId { get; set; }

        [Required]
        public int UserId { get; set; }

        [ForeignKey(nameof(UserId))]
        public User? User { get; set; }

        /// <summary>
        /// When the action occurred
        /// </summary>
        [Required]
        public DateTime ActionDate { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Type of action: AccountRebalance, CashMove, TSPChange, StockPurchase, StockSale, etc.
        /// </summary>
        [Required]
        [MaxLength(50)]
        public string ActionType { get; set; } = string.Empty;

        /// <summary>
        /// Human-readable summary: "Moved $10K from checking to HYSA"
        /// </summary>
        [Required]
        [MaxLength(500)]
        public string ActionSummary { get; set; } = string.Empty;

        /// <summary>
        /// Related advice ID if action was based on AI advice
        /// </summary>
        public int? SourceAdviceId { get; set; }

        [ForeignKey(nameof(SourceAdviceId))]
        public Advice? SourceAdvice { get; set; }

        /// <summary>
        /// Related alert ID if action was triggered by an alert
        /// </summary>
        public int? SourceAlertId { get; set; }

        [ForeignKey(nameof(SourceAlertId))]
        public Alert? SourceAlert { get; set; }

        /// <summary>
        /// Accounts affected by this action (JSON array): ["Checking", "Savings"]
        /// </summary>
        [Column(TypeName = "jsonb")]
        public string? AccountsAffected { get; set; }

        /// <summary>
        /// Amount of money involved (if applicable)
        /// </summary>
        [Column(TypeName = "decimal(18,2)")]
        public decimal? AmountMoved { get; set; }

        /// <summary>
        /// Asset class involved: Cash, Stocks, Bonds, Gold, Crypto, etc.
        /// </summary>
        [MaxLength(50)]
        public string? AssetClass { get; set; }

        /// <summary>
        /// When this memory becomes stale and less relevant (30-90 days typically)
        /// </summary>
        [Required]
        public DateTime ExpiresAt { get; set; }

        /// <summary>
        /// Should AI always consider this action when analyzing?
        /// </summary>
        [Required]
        public bool IsSignificant { get; set; } = true;

        /// <summary>
        /// Has this action been referenced in AI analysis?
        /// </summary>
        public bool Referenced { get; set; }

        /// <summary>
        /// Number of times AI has referenced this action
        /// </summary>
        public int ReferenceCount { get; set; }
    }
}
