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
            // Clear onboarding progress tracking
            var entity = await _db.OnboardingProgress.FirstOrDefaultAsync(o => o.UserId == userId, ct);
            if (entity != null)
            {
                _db.OnboardingProgress.Remove(entity);
            }

            // Clear all section status records
            var sectionStatuses = await _db.FinancialProfileSectionStatuses
                .Where(s => s.UserId == userId)
                .ToListAsync(ct);
            _db.FinancialProfileSectionStatuses.RemoveRange(sectionStatuses);

            // Clear financial profile data
            var cashAccounts = await _db.CashAccounts.Where(a => a.UserId == userId).ToListAsync(ct);
            _db.CashAccounts.RemoveRange(cashAccounts);

            var investmentAccounts = await _db.InvestmentAccounts.Where(a => a.UserId == userId).ToListAsync(ct);
            _db.InvestmentAccounts.RemoveRange(investmentAccounts);

            var properties = await _db.Properties.Where(p => p.UserId == userId).ToListAsync(ct);
            _db.Properties.RemoveRange(properties);

            var liabilities = await _db.LiabilityAccounts.Where(l => l.UserId == userId).ToListAsync(ct);
            _db.LiabilityAccounts.RemoveRange(liabilities);

            var expenses = await _db.ExpenseBudgets.Where(e => e.UserId == userId).ToListAsync(ct);
            _db.ExpenseBudgets.RemoveRange(expenses);

            var incomeSources = await _db.IncomeSources.Where(i => i.UserId == userId).ToListAsync(ct);
            _db.IncomeSources.RemoveRange(incomeSources);

            var insurancePolicies = await _db.InsurancePolicies.Where(i => i.UserId == userId).ToListAsync(ct);
            _db.InsurancePolicies.RemoveRange(insurancePolicies);

            var tspProfile = await _db.TspProfiles.FirstOrDefaultAsync(t => t.UserId == userId, ct);
            if (tspProfile != null)
            {
                _db.TspProfiles.Remove(tspProfile);
            }

            var tspPositions = await _db.TspLifecyclePositions.Where(p => p.UserId == userId).ToListAsync(ct);
            _db.TspLifecyclePositions.RemoveRange(tspPositions);

            var obligations = await _db.LongTermObligations.Where(o => o.UserId == userId).ToListAsync(ct);
            _db.LongTermObligations.RemoveRange(obligations);

            // Reset User profile fields to defaults (but don't delete the user)
            var user = await _db.Users.FirstOrDefaultAsync(u => u.UserId == userId, ct);
            if (user != null)
            {
                // Reset household profile
                user.PreferredName = null;
                user.MaritalStatus = null;
                user.DependentCount = null;
                user.HouseholdServiceNotes = null;

                // Reset risk & goals
                user.RiskTolerance = 5; // default
                user.LastRiskAssessment = null;
                user.TargetRetirementDate = null;
                user.TargetMonthlyPassiveIncome = null;
                user.EmergencyFundTarget = 0;
                user.LiquidityBufferMonths = null;

                // Keep authentication and basic identity (email, name, etc)
                // but clear all financial profile data
            }

            await _db.SaveChangesAsync(ct);
        }
    }
}
