using System.Collections.Generic;

namespace PFMP_API.Models
{
    /// <summary>
    /// Simple structured representation of validation output.
    /// In later waves we'll persist richer structures & per-check metadata.
    /// </summary>
    public class AdviceValidationOutcome
    {
        public bool Passed { get; set; }
        public List<AdviceValidationIssue> Issues { get; set; } = new();
        public decimal HeuristicConfidenceAdjustment { get; set; } = 0; // delta applied to base confidence
        public string EngineVersion { get; set; } = "stub-1";
    }

    public class AdviceValidationIssue
    {
        public string Code { get; set; } = string.Empty; // e.g. LENGTH_TRUNCATION, MISSING_THEME
        public string Severity { get; set; } = "Info";   // Info | Warning | Error
        public string Message { get; set; } = string.Empty;
        public string? Field { get; set; }
    }
}
