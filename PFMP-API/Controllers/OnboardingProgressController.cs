using Microsoft.AspNetCore.Mvc;
using System.Collections.Concurrent;

namespace PFMP_API.Controllers
{
    /// <summary>
    /// In-memory onboarding progress persistence (Wave 3 scaffold).
    /// Guards real implementation until database entity & auth integration are added.
    /// </summary>
    [ApiController]
    [Route("api/onboarding")] // matches frontend persistence.ts base
    public class OnboardingProgressController : ControllerBase
    {
        // Using string user id to align with frontend dev-mode 'dev-user' default.
        private static readonly ConcurrentDictionary<string, OnboardingProgressDto> _store = new();

        private static readonly object _lock = new();

        /// <summary>
        /// Get current onboarding progress for the (dev) user. Returns 404 if none exists yet.
        /// </summary>
        [HttpGet("progress")]
        public ActionResult<OnboardingProgressDto> GetProgress([FromQuery] string? userId)
        {
            var key = string.IsNullOrWhiteSpace(userId) ? "dev-user" : userId!;
            if (_store.TryGetValue(key, out var dto))
            {
                return Ok(dto);
            }
            return NotFound();
        }

        /// <summary>
        /// Upsert full onboarding progress snapshot (replaces existing snapshot attributes).
        /// </summary>
        [HttpPut("progress")]
        public ActionResult UpsertProgress([FromBody] UpsertOnboardingProgressRequest request, [FromQuery] string? userId)
        {
            var key = string.IsNullOrWhiteSpace(userId) ? "dev-user" : userId!;
            var dto = new OnboardingProgressDto
            {
                UserId = key,
                CurrentStepId = request.CurrentStepId,
                CompletedStepIds = request.CompletedStepIds?.Distinct().ToList() ?? new List<string>(),
                StepPayloads = request.StepPayloads ?? new Dictionary<string, object?>(),
                UpdatedUtc = DateTime.UtcNow
            };
            _store[key] = dto;
            return NoContent();
        }

        /// <summary>
        /// PATCH partial step data or mark completion.
        /// </summary>
        [HttpPatch("progress/step/{stepId}")]
        public ActionResult PatchStep(string stepId, [FromBody] PatchOnboardingStepRequest request, [FromQuery] string? userId)
        {
            if (string.IsNullOrWhiteSpace(stepId)) return BadRequest("Step id required");
            var key = string.IsNullOrWhiteSpace(userId) ? "dev-user" : userId!;

            _store.AddOrUpdate(key, _ =>
            {
                // Create new record if none existed
                var completed = new List<string>();
                if (request.Completed == true) completed.Add(stepId);
                return new OnboardingProgressDto
                {
                    UserId = key,
                    CurrentStepId = stepId,
                    CompletedStepIds = completed,
                    StepPayloads = request.Data != null ? new Dictionary<string, object?> { [stepId] = request.Data } : new Dictionary<string, object?>(),
                    UpdatedUtc = DateTime.UtcNow
                };
            }, (_, existing) =>
            {
                lock (_lock)
                {
                    // Update existing snapshot
                    if (request.Data != null)
                    {
                        existing.StepPayloads ??= new Dictionary<string, object?>();
                        existing.StepPayloads[stepId] = request.Data;
                    }
                    if (request.Completed == true && !existing.CompletedStepIds.Contains(stepId))
                    {
                        existing.CompletedStepIds.Add(stepId);
                    }
                    // Heuristic: advance current step if this matches existing current or is next logical step
                    existing.CurrentStepId = stepId;
                    existing.UpdatedUtc = DateTime.UtcNow;
                    return existing;
                }
            });
            return NoContent();
        }
    }

    public class OnboardingProgressDto
    {
        public string UserId { get; set; } = string.Empty;
        public string CurrentStepId { get; set; } = string.Empty;
        public List<string> CompletedStepIds { get; set; } = new();
        public Dictionary<string, object?>? StepPayloads { get; set; } = new();
        public DateTime UpdatedUtc { get; set; }
    }

    public class UpsertOnboardingProgressRequest
    {
        public string CurrentStepId { get; set; } = string.Empty;
        public List<string>? CompletedStepIds { get; set; }
        public Dictionary<string, object?>? StepPayloads { get; set; }
    }

    public class PatchOnboardingStepRequest
    {
        public object? Data { get; set; }
        public bool? Completed { get; set; }
    }
}
