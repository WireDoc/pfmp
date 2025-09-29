using System.Text.Json;
using PFMP_API.Models;

namespace PFMP_API.Services
{
    /// <summary>
    /// Minimal heuristic validator that flags very short or empty content and missing theme.
    /// </summary>
    public class AdviceValidator : IAdviceValidator
    {
        public Task<AdviceValidationOutcome> ValidateAsync(Advice candidate)
        {
            var outcome = new AdviceValidationOutcome();

            if (string.IsNullOrWhiteSpace(candidate.ConsensusText))
            {
                outcome.Issues.Add(new AdviceValidationIssue
                {
                    Code = "EMPTY_TEXT",
                    Severity = "Error",
                    Field = nameof(candidate.ConsensusText),
                    Message = "Consensus text is empty"
                });
            }
            else if (candidate.ConsensusText.Length < 40)
            {
                outcome.Issues.Add(new AdviceValidationIssue
                {
                    Code = "TEXT_TOO_SHORT",
                    Severity = "Warning",
                    Field = nameof(candidate.ConsensusText),
                    Message = "Advice content may be too short to be actionable"
                });
                outcome.HeuristicConfidenceAdjustment -= 5;
            }

            if (string.IsNullOrWhiteSpace(candidate.Theme))
            {
                outcome.Issues.Add(new AdviceValidationIssue
                {
                    Code = "MISSING_THEME",
                    Severity = "Info",
                    Field = nameof(candidate.Theme),
                    Message = "Theme not provided; default applied"
                });
            }

            outcome.Passed = !outcome.Issues.Any(i => i.Severity == "Error");
            return Task.FromResult(outcome);
        }
    }
}
