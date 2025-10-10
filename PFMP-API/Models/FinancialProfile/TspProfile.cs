using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PFMP_API.Models.FinancialProfile
{
    [Table("TspProfiles")]
    public class TspProfile
    {
        [Key]
        public int UserId { get; set; }

        [Column(TypeName = "decimal(8,4)")]
        public decimal ContributionRatePercent { get; set; }

        [Column(TypeName = "decimal(8,4)")]
        public decimal EmployerMatchPercent { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal CurrentBalance { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal TargetBalance { get; set; }

        [Column(TypeName = "decimal(8,4)")]
        public decimal GFundPercent { get; set; }

        [Column(TypeName = "decimal(8,4)")]
        public decimal FFundPercent { get; set; }

        [Column(TypeName = "decimal(8,4)")]
        public decimal CFundPercent { get; set; }

        [Column(TypeName = "decimal(8,4)")]
        public decimal SFundPercent { get; set; }

        [Column(TypeName = "decimal(8,4)")]
        public decimal IFundPercent { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal? LifecycleBalance { get; set; }

        [Column(TypeName = "decimal(8,4)")]
        public decimal? LifecyclePercent { get; set; }

        public DateTime LastUpdatedAt { get; set; } = DateTime.UtcNow;

        public bool IsOptedOut { get; set; }
        [MaxLength(255)]
        public string? OptOutReason { get; set; }
        public DateTime? OptOutAcknowledgedAt { get; set; }
    }
}
