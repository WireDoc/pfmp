using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PFMP_API.Models.FinancialProfile
{
    [Table("CashAccounts")]
    public class CashAccount
    {
        [Key]
        public Guid CashAccountId { get; set; } = Guid.NewGuid();

        [Required]
        public int UserId { get; set; }

        [Required]
        [MaxLength(200)]
        public string Nickname { get; set; } = string.Empty;

        [MaxLength(150)]
        public string? Institution { get; set; }

        [MaxLength(40)]
        public string AccountType { get; set; } = "checking";

        [Column(TypeName = "decimal(18,2)")]
        public decimal Balance { get; set; }

        [Column(TypeName = "decimal(8,4)")]
        public decimal? InterestRateApr { get; set; }

        public bool IsEmergencyFund { get; set; }

        public DateTime? RateLastChecked { get; set; }

        [Required]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Required]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
