using Microsoft.AspNetCore.Mvc;
using PFMP_API.Services;
using PFMP_API.Models;
using Microsoft.EntityFrameworkCore;

namespace PFMP_API.Controllers
{
    /// <summary>
    /// Onboarding progress persistence endpoints (Wave 3).
    /// Backed by database via IOnboardingProgressService. Dev mode allows query userId override.
    /// </summary>
    [ApiController]
    [Route("api/onboarding")] // matches frontend persistence.ts base
    public class OnboardingProgressController : ControllerBase
    {
        private readonly IOnboardingProgressService _service;
        private readonly IConfiguration _config;
        private readonly ApplicationDbContext _db;

        public OnboardingProgressController(IOnboardingProgressService service, IConfiguration config, ApplicationDbContext db)
        {
            _service = service;
            _config = config;
            _db = db;
        }

        private async Task<int> ResolveUserIdAsync(int? queryUserId, string? email, CancellationToken ct)
        {
            if (queryUserId.HasValue && queryUserId.Value > 0) return queryUserId.Value;
            if (!string.IsNullOrWhiteSpace(email))
            {
                var user = await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Email == email, ct);
                if (user != null) return user.UserId;
            }
            // Dev registry fallback
            return DevUserRegistry.DefaultTestUserId;
        }

        /// <summary>
        /// Get current onboarding progress for the (dev) user. Returns 404 if none exists yet.
        /// </summary>
        [HttpGet("progress")]
        public async Task<ActionResult<OnboardingProgressDto>> GetProgress([FromQuery] int? userId, [FromQuery] string? email, CancellationToken ct = default)
        {
            var uid = await ResolveUserIdAsync(userId, email, ct);
            var entity = await _service.GetAsync(uid, ct);
            if (entity == null) return NotFound();
            return Ok(OnboardingProgressMapping.ToDto(entity));
        }

        /// <summary>
        /// Upsert full onboarding progress snapshot (replaces existing snapshot attributes).
        /// </summary>
        [HttpPut("progress")]
        public async Task<ActionResult> UpsertProgress([FromBody] UpsertOnboardingProgressRequest request, [FromQuery] int? userId, [FromQuery] string? email, CancellationToken ct = default)
        {
            var uid = await ResolveUserIdAsync(userId, email, ct);
            await _service.UpsertAsync(uid, request.CurrentStepId, request.CompletedStepIds ?? new List<string>(), request.StepPayloads ?? new Dictionary<string, object?>(), ct);
            return NoContent();
        }

        /// <summary>
        /// PATCH partial step data or mark completion.
        /// </summary>
        [HttpPatch("progress/step/{stepId}")]
        public async Task<ActionResult> PatchStep(string stepId, [FromBody] PatchOnboardingStepRequest request, [FromQuery] int? userId, [FromQuery] string? email, CancellationToken ct = default)
        {
            if (string.IsNullOrWhiteSpace(stepId)) return BadRequest("Step id required");
            var uid = await ResolveUserIdAsync(userId, email, ct);
            await _service.PatchStepAsync(uid, stepId, request.Data, request.Completed, ct);
            return NoContent();
        }

        /// <summary>
        /// Reset onboarding progress for the user (testing convenience endpoint).
        /// </summary>
        [HttpPost("progress/reset")]
        public async Task<ActionResult> Reset([FromQuery] int? userId, [FromQuery] string? email, CancellationToken ct = default)
        {
            var uid = await ResolveUserIdAsync(userId, email, ct);
            await _service.ResetAsync(uid, ct);
            return NoContent();
        }
    }

    public class OnboardingProgressDto
    {
        public int UserId { get; set; }
        public string? CurrentStepId { get; set; }
        public List<string> CompletedStepIds { get; set; } = new();
        public Dictionary<string, object?> StepPayloads { get; set; } = new();
        public DateTime UpdatedUtc { get; set; }
    }

    internal static class OnboardingProgressMapping
    {
        public static OnboardingProgressDto ToDto(OnboardingProgress entity) => new()
        {
            UserId = entity.UserId,
            CurrentStepId = entity.CurrentStepId,
            CompletedStepIds = entity.GetCompletedStepIds(),
            StepPayloads = entity.GetStepPayloads(),
            UpdatedUtc = entity.UpdatedUtc
        };
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
