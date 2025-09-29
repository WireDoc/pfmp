using Microsoft.EntityFrameworkCore;
using PFMP_API.Models;

namespace PFMP_API.Services
{
    /// <summary>
    /// Wave 1 stub implementation: wraps existing AI portfolio analysis into an Advice record.
    /// Future waves will add validator + rule evaluation + structured JSON.
    /// </summary>
    public class AdviceService : IAdviceService
    {
        private readonly ApplicationDbContext _db;
        private readonly IAIService _aiService;
        private readonly ILogger<AdviceService> _logger;

        public AdviceService(ApplicationDbContext db, IAIService aiService, ILogger<AdviceService> logger)
        {
            _db = db;
            _aiService = aiService;
            _logger = logger;
        }

        public async Task<Advice> GenerateBasicAdviceAsync(int userId)
        {
            var user = await _db.Users.FirstOrDefaultAsync(u => u.UserId == userId);
            if (user == null)
            {
                throw new ArgumentException($"User {userId} not found");
            }

            string analysisText = string.Empty;
            try
            {
                analysisText = await _aiService.AnalyzePortfolioAsync(userId) ?? string.Empty;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "AI analysis failed for user {UserId}; using fallback", userId);
                analysisText = "Unable to retrieve AI analysis at this time. Please try again later.";
            }

            // Trim & bound length (simple safety net)
            if (analysisText.Length > 8000)
            {
                analysisText = analysisText.Substring(0, 8000) + "...";
            }

            var advice = new Advice
            {
                UserId = userId,
                Theme = "General",
                Status = "Proposed",
                ConsensusText = analysisText.Trim(),
                ConfidenceScore = 60,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _db.Advice.Add(advice);
            await _db.SaveChangesAsync();
            return advice;
        }

        public async Task<IEnumerable<Advice>> GetAdviceForUserAsync(int userId)
        {
            return await _db.Advice
                .Where(a => a.UserId == userId)
                .OrderByDescending(a => a.CreatedAt)
                .ToListAsync();
        }

        public async Task<Advice?> AcceptAdviceAsync(int adviceId)
        {
            var advice = await _db.Advice.FirstOrDefaultAsync(a => a.AdviceId == adviceId);
            if (advice == null) return null;
            if (advice.Status == "Accepted") return advice; // idempotent
            if (advice.Status == "Rejected")
            {
                throw new InvalidOperationException("Cannot accept advice that is already Rejected");
            }
            advice.Status = "Accepted";
            advice.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            return advice;
        }

        public async Task<Advice?> RejectAdviceAsync(int adviceId)
        {
            var advice = await _db.Advice.FirstOrDefaultAsync(a => a.AdviceId == adviceId);
            if (advice == null) return null;
            if (advice.Status == "Rejected") return advice; // idempotent
            if (advice.Status == "Accepted")
            {
                throw new InvalidOperationException("Cannot reject advice that is already Accepted");
            }
            advice.Status = "Rejected";
            advice.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            return advice;
        }
    }
}
