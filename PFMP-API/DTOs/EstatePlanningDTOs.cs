namespace PFMP_API.DTOs;

public class EstatePlanningResponse
{
    public int EstatePlanningProfileId { get; set; }
    public int UserId { get; set; }

    // Legal Documents
    public bool HasWill { get; set; }
    public DateTime? WillLastReviewedDate { get; set; }
    public bool HasTrust { get; set; }
    public string? TrustType { get; set; }
    public DateTime? TrustLastReviewedDate { get; set; }
    public bool HasFinancialPOA { get; set; }
    public bool HasHealthcarePOA { get; set; }
    public bool HasAdvanceDirective { get; set; }

    // Attorney
    public string? AttorneyName { get; set; }
    public DateTime? AttorneyLastConsultDate { get; set; }

    // Notes
    public string? Notes { get; set; }

    // Timestamps
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class SaveEstatePlanningRequest
{
    public bool HasWill { get; set; }
    public DateTime? WillLastReviewedDate { get; set; }
    public bool HasTrust { get; set; }
    public string? TrustType { get; set; }
    public DateTime? TrustLastReviewedDate { get; set; }
    public bool HasFinancialPOA { get; set; }
    public bool HasHealthcarePOA { get; set; }
    public bool HasAdvanceDirective { get; set; }
    public string? AttorneyName { get; set; }
    public DateTime? AttorneyLastConsultDate { get; set; }
    public string? Notes { get; set; }
}
