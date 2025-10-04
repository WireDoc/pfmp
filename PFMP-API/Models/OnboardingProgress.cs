using System.Text.Json;
using System.Text.Json.Serialization;

namespace PFMP_API.Models
{
    /// <summary>
    /// Database-backed onboarding progress snapshot (Wave 3).
    /// JSONB columns store arrays/maps; we expose strongly typed helpers.
    /// </summary>
    public class OnboardingProgress
    {
        public int UserId { get; set; }
        public string? CurrentStepId { get; set; }
        public DateTime UpdatedUtc { get; set; } = DateTime.UtcNow;

        // Raw JSON storage (mapped to jsonb columns)
        public string? CompletedStepIdsJson { get; set; }
        public string? StepPayloadsJson { get; set; }

        [JsonIgnore]
        private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
        {
            WriteIndented = false
        };

        public List<string> GetCompletedStepIds()
        {
            if (string.IsNullOrWhiteSpace(CompletedStepIdsJson)) return new List<string>();
            try
            {
                var arr = JsonSerializer.Deserialize<List<string>>(CompletedStepIdsJson, JsonOptions);
                return arr?.Distinct().ToList() ?? new List<string>();
            }
            catch
            {
                return new List<string>();
            }
        }

        public Dictionary<string, object?> GetStepPayloads()
        {
            if (string.IsNullOrWhiteSpace(StepPayloadsJson)) return new Dictionary<string, object?>();
            try
            {
                var dict = JsonSerializer.Deserialize<Dictionary<string, object?>>(StepPayloadsJson, JsonOptions);
                return dict ?? new Dictionary<string, object?>();
            }
            catch
            {
                return new Dictionary<string, object?>();
            }
        }

        public void SetCompletedStepIds(IEnumerable<string> steps)
        {
            CompletedStepIdsJson = JsonSerializer.Serialize(steps.Distinct().ToList(), JsonOptions);
        }

        public void SetStepPayloads(Dictionary<string, object?> payloads)
        {
            StepPayloadsJson = JsonSerializer.Serialize(payloads, JsonOptions);
        }
    }
}
