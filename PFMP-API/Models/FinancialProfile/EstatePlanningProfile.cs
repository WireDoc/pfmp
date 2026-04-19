using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using PFMP_API.Models;

namespace PFMP_API.Models.FinancialProfile;

[Table("EstatePlanningProfiles")]
public class EstatePlanningProfile
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int EstatePlanningProfileId { get; set; }

    public int UserId { get; set; }

    // --- Legal Documents ---
    public bool HasWill { get; set; }
    public DateTime? WillLastReviewedDate { get; set; }

    public bool HasTrust { get; set; }

    [MaxLength(50)]
    public string? TrustType { get; set; } // "Revocable", "Irrevocable"

    public DateTime? TrustLastReviewedDate { get; set; }

    public bool HasFinancialPOA { get; set; }
    public bool HasHealthcarePOA { get; set; }
    public bool HasAdvanceDirective { get; set; }

    // --- Attorney ---
    [MaxLength(200)]
    public string? AttorneyName { get; set; }

    public DateTime? AttorneyLastConsultDate { get; set; }

    // --- Notes ---
    [MaxLength(2000)]
    public string? Notes { get; set; }

    // --- Timestamps ---
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // --- Navigation ---
    [ForeignKey("UserId")]
    public virtual User? User { get; set; }
}
