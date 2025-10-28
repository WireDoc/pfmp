using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace PFMP_API.Models
{
    public enum AlertSeverity
    {
        Low = 1,
        Medium = 2,
        High = 3,
        Critical = 4
    }

    public enum AlertCategory
    {
        Portfolio = 1,
        Goal = 2,
        Transaction = 3,
        Performance = 4,
        Security = 5,
        Tax = 6,
        Rebalancing = 7
    }

    public class Alert
    {
        public int AlertId { get; set; }

        [Required]
        public int UserId { get; set; }

        [Required]
        [StringLength(200)]
        public string Title { get; set; } = string.Empty;

        [Required]
        public string Message { get; set; } = string.Empty;

        public AlertSeverity Severity { get; set; } = AlertSeverity.Medium;
        public AlertCategory Category { get; set; } = AlertCategory.Portfolio;

        public bool IsRead { get; set; } = false;
        public bool IsDismissed { get; set; } = false;
        public bool IsActionable { get; set; } = false;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? ReadAt { get; set; }
        public DateTime? DismissedAt { get; set; }
        public DateTime? ExpiresAt { get; set; }

        public string? ActionUrl { get; set; } // URL for actionable alerts
        public string? Metadata { get; set; } // JSON for additional context
        
    /// <summary>
    /// Portfolio impact / actionability score (0-100) computed by scoring heuristic.
    /// </summary>
    public int PortfolioImpactScore { get; set; } = 0;

        // ===== Wave 7: AI Context Fields =====

        /// <summary>
        /// Has AI analyzed this alert yet?
        /// </summary>
        public bool AIAnalyzed { get; set; } = false;

        /// <summary>
        /// When AI last analyzed this alert
        /// </summary>
        public DateTime? AIAnalyzedAt { get; set; }

        /// <summary>
        /// Market context ID when alert was generated
        /// </summary>
        public int? MarketContextId { get; set; }

        [ForeignKey(nameof(MarketContextId))]
        public MarketContext? MarketContext { get; set; }

        /// <summary>
        /// AI-generated context or reasoning (brief)
        /// </summary>
        [MaxLength(500)]
        public string? AIContext { get; set; }

        // Navigation properties
        [JsonIgnore] // Prevent circular reference in JSON serialization
        public virtual User User { get; set; } = null!;
    // Legacy GeneratedTask link removed with new workflow (alerts no longer spawn tasks directly).
    }
}