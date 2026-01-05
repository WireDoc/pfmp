using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using PFMP_API.Models.Plaid;

namespace PFMP_API.Models.FinancialProfile
{
    [Table("Properties")]
    public class PropertyProfile
    {
        [Key]
        public Guid PropertyId { get; set; } = Guid.NewGuid();

        [Required]
        public int UserId { get; set; }

        [Required]
        [MaxLength(200)]
        public string PropertyName { get; set; } = string.Empty;

        [MaxLength(100)]
        public string PropertyType { get; set; } = "primary";

        [MaxLength(60)]
        public string Occupancy { get; set; } = "owner";

        [Column(TypeName = "decimal(18,2)")]
        public decimal EstimatedValue { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal? MortgageBalance { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal? MonthlyMortgagePayment { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal? MonthlyRentalIncome { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal? MonthlyExpenses { get; set; }

        public bool HasHeloc { get; set; }

        // --- Plaid Integration Fields ---
        public AccountSource Source { get; set; } = AccountSource.Manual;

        /// <summary>
        /// Links this property to a mortgage liability from Plaid.
        /// </summary>
        public int? LinkedMortgageLiabilityId { get; set; }

        /// <summary>
        /// Property address from Plaid mortgage data.
        /// </summary>
        [MaxLength(200)]
        public string? Street { get; set; }

        [MaxLength(100)]
        public string? City { get; set; }

        [MaxLength(50)]
        public string? State { get; set; }

        [MaxLength(20)]
        public string? PostalCode { get; set; }

        /// <summary>
        /// When this property was last synced from Plaid.
        /// </summary>
        public DateTime? LastSyncedAt { get; set; }

        /// <summary>
        /// Sync status: "synced", "error", "pending".
        /// </summary>
        [MaxLength(20)]
        public string? SyncStatus { get; set; }

        // --- End Plaid Integration Fields ---

        [Required]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Required]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
