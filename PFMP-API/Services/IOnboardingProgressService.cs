using PFMP_API.Models;

namespace PFMP_API.Services
{
    public interface IOnboardingProgressService
    {
        Task<OnboardingProgress?> GetAsync(int userId, CancellationToken ct = default);
        Task UpsertAsync(int userId, string currentStepId, IEnumerable<string> completedStepIds, Dictionary<string, object?> stepPayloads, CancellationToken ct = default);
        Task PatchStepAsync(int userId, string stepId, object? data, bool? completed, CancellationToken ct = default);
        Task ResetAsync(int userId, CancellationToken ct = default);
    }
}
