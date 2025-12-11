using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PFMP_API.Models.Plaid
{
    /// <summary>
    /// Records history of sync operations for debugging and user transparency.
    /// </summary>
    [Table("SyncHistory")]
    public class SyncHistory
    {
        [Key]
        public Guid SyncHistoryId { get; set; } = Guid.NewGuid();

        [Required]
        public Guid ConnectionId { get; set; }

        public DateTime SyncStartedAt { get; set; } = DateTime.UtcNow;
        public DateTime? SyncCompletedAt { get; set; }
        public SyncStatus Status { get; set; }

        [MaxLength(500)]
        public string? ErrorMessage { get; set; }

        public int AccountsUpdated { get; set; } = 0;
        public int DurationMs { get; set; }

        // Navigation
        [ForeignKey("ConnectionId")]
        public virtual AccountConnection Connection { get; set; } = null!;
    }
}
