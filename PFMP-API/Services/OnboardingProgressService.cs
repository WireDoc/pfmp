using Microsoft.EntityFrameworkCore;
using PFMP_API.Models;

namespace PFMP_API.Services
{
    public class OnboardingProgressService : IOnboardingProgressService
    {
        private readonly ApplicationDbContext _db;
        public OnboardingProgressService(ApplicationDbContext db)
        {
            _db = db;
        }

        public async Task<OnboardingProgress?> GetAsync(int userId, CancellationToken ct = default)
        {
            return await _db.OnboardingProgress.FirstOrDefaultAsync(o => o.UserId == userId, ct);
        }

        public async Task UpsertAsync(int userId, string currentStepId, IEnumerable<string> completedStepIds, Dictionary<string, object?> stepPayloads, CancellationToken ct = default)
        {
            var entity = await _db.OnboardingProgress.FirstOrDefaultAsync(o => o.UserId == userId, ct);
            if (entity == null)
            {
                entity = new OnboardingProgress { UserId = userId };
                _db.OnboardingProgress.Add(entity);
            }
            entity.CurrentStepId = currentStepId;
            entity.SetCompletedStepIds(completedStepIds);
            entity.SetStepPayloads(stepPayloads);
            entity.UpdatedUtc = DateTime.UtcNow;
            await _db.SaveChangesAsync(ct);
        }

        public async Task PatchStepAsync(int userId, string stepId, object? data, bool? completed, CancellationToken ct = default)
        {
            var entity = await _db.OnboardingProgress.FirstOrDefaultAsync(o => o.UserId == userId, ct);
            if (entity == null)
            {
                entity = new OnboardingProgress { UserId = userId };
                _db.OnboardingProgress.Add(entity);
            }
            // Merge logic
            var completedSteps = entity.GetCompletedStepIds();
            if (completed == true && !completedSteps.Contains(stepId))
            {
                completedSteps.Add(stepId);
            }
            entity.SetCompletedStepIds(completedSteps);

            var payloads = entity.GetStepPayloads();
            if (data != null)
            {
                payloads[stepId] = data;
            }
            entity.SetStepPayloads(payloads);
            entity.CurrentStepId = stepId; // advance current step heuristic
            entity.UpdatedUtc = DateTime.UtcNow;
            await _db.SaveChangesAsync(ct);
        }

        public async Task ResetAsync(int userId, CancellationToken ct = default)
        {
            var entity = await _db.OnboardingProgress.FirstOrDefaultAsync(o => o.UserId == userId, ct);
            if (entity != null)
            {
                _db.OnboardingProgress.Remove(entity);
                await _db.SaveChangesAsync(ct);
            }
        }
    }
}
