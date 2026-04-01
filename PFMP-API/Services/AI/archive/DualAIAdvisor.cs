using Microsoft.Extensions.Options;

namespace PFMP_API.Services.AI;

/// <summary>
/// Dual AI Advisor orchestrates calls to both Claude (conservative) and Gemini (aggressive)
/// and uses ConsensusEngine to merge their recommendations.
/// </summary>
public class DualAIAdvisor : IDualAIAdvisor
{
    private readonly IAIFinancialAdvisor _claudeService;
    private readonly IAIFinancialAdvisor _geminiService;
    private readonly ConsensusEngine _consensusEngine;
    private readonly ConsensusOptions _options;
    private readonly ILogger<DualAIAdvisor> _logger;

    public DualAIAdvisor(
        IEnumerable<IAIFinancialAdvisor> advisors,
        ConsensusEngine consensusEngine,
        IOptions<ConsensusOptions> options,
        ILogger<DualAIAdvisor> logger)
    {
        var advisorList = advisors.ToList();
        _claudeService = advisorList.First(a => a.ServiceName == "Claude");
        _geminiService = advisorList.First(a => a.ServiceName == "Gemini");
        _consensusEngine = consensusEngine;
        _options = options.Value;
        _logger = logger;
    }

    public async Task<ConsensusResult> GetConsensusRecommendationAsync(AIPromptRequest request)
    {
        _logger.LogInformation(
            "Dual AI request started: userId={UserId}, promptLength={Length}, cacheableContextLength={CacheLength}",
            request.UserId, request.UserPrompt.Length, request.CacheableContext?.Length ?? 0);

        var startTime = DateTime.UtcNow;

        try
        {
            // Call both AI services in parallel for minimum latency
            var conservativeTask = _claudeService.GetRecommendationAsync(request);
            var aggressiveTask = _geminiService.GetRecommendationAsync(request);

            // Wait for both with timeout
            var timeout = TimeSpan.FromMilliseconds(_options.ParallelCallTimeoutMs);
            var completedTasks = await Task.WhenAny(
                Task.WhenAll(conservativeTask, aggressiveTask),
                Task.Delay(timeout)
            );

            AIRecommendation? conservative = null;
            AIRecommendation? aggressive = null;

            // Check if both completed
            if (conservativeTask.IsCompleted)
            {
                conservative = await conservativeTask;
            }

            if (aggressiveTask.IsCompleted)
            {
                aggressive = await aggressiveTask;
            }

            // Handle partial or complete failures
            if (conservative == null && aggressive == null)
            {
                throw new InvalidOperationException("Both AI services failed to respond");
            }

            if (conservative == null || aggressive == null)
            {
                if (!_options.RequireBothResponses)
                {
                    // One service failed, return the successful one with note
                    _logger.LogWarning(
                        "Only one AI service responded: conservative={HasConservative}, aggressive={HasAggressive}",
                        conservative != null, aggressive != null);

                    return CreateSingleAdvisorResult(conservative, aggressive);
                }
                
                throw new InvalidOperationException("One AI service failed and both responses are required");
            }

            // Build consensus from both recommendations
            var consensus = _consensusEngine.BuildConsensus(conservative, aggressive);

            var elapsed = DateTime.UtcNow - startTime;
            _logger.LogInformation(
                "Dual AI request completed: consensusId={ConsensusId}, hasConsensus={HasConsensus}, agreement={Agreement:P0}, elapsed={Elapsed}ms, cost=${Cost:F4}",
                consensus.ConsensusId, consensus.HasConsensus, consensus.AgreementScore, elapsed.TotalMilliseconds, consensus.TotalCost);

            return consensus;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Dual AI request failed: userId={UserId}", request.UserId);
            throw;
        }
    }

    public async Task<ConsensusResult> GetRetirementConsensusAsync(string userId)
    {
        _logger.LogInformation("Retirement consensus request: userId={UserId}", userId);

        // Call both services in parallel
        var conservativeTask = _claudeService.GetRetirementAdviceAsync(userId);
        var aggressiveTask = _geminiService.GetRetirementAdviceAsync(userId);

        await Task.WhenAll(conservativeTask, aggressiveTask);

        var conservative = await conservativeTask;
        var aggressive = await aggressiveTask;

        return _consensusEngine.BuildConsensus(conservative, aggressive);
    }

    public async Task<ConsensusResult> GetRebalancingConsensusAsync(string userId)
    {
        _logger.LogInformation("Rebalancing consensus request: userId={UserId}", userId);

        var conservativeTask = _claudeService.GetRebalancingAdviceAsync(userId);
        var aggressiveTask = _geminiService.GetRebalancingAdviceAsync(userId);

        await Task.WhenAll(conservativeTask, aggressiveTask);

        var conservative = await conservativeTask;
        var aggressive = await aggressiveTask;

        return _consensusEngine.BuildConsensus(conservative, aggressive);
    }

    private ConsensusResult CreateSingleAdvisorResult(
        AIRecommendation? conservative,
        AIRecommendation? aggressive)
    {
        var workingRecommendation = conservative ?? aggressive!;
        var isMissingConservative = conservative == null;

        return new ConsensusResult
        {
            ConservativeAdvice = conservative ?? new AIRecommendation
            {
                ServiceName = "Claude",
                RecommendationText = "Service unavailable",
                ConfidenceScore = 0m
            },
            AggressiveAdvice = aggressive ?? new AIRecommendation
            {
                ServiceName = "Gemini",
                RecommendationText = "Service unavailable",
                ConfidenceScore = 0m
            },
            AgreementScore = 0m,
            HasConsensus = false,
            ConsensusRecommendation = null,
            DisagreementExplanation = $"Only {workingRecommendation.ServiceName} was able to respond. " +
                $"{(isMissingConservative ? "Conservative (Claude)" : "Aggressive (Gemini)")} advisor is currently unavailable.\n\n" +
                $"**{workingRecommendation.ServiceName}'s Recommendation:**\n{workingRecommendation.RecommendationText}",
            CommonActionItems = new List<string>(),
            ConservativeOnlyItems = conservative?.ActionItems ?? new List<string>(),
            AggressiveOnlyItems = aggressive?.ActionItems ?? new List<string>(),
            TotalCost = workingRecommendation.EstimatedCost,
            TotalTokens = workingRecommendation.TokensUsed
        };
    }
}
