using Microsoft.Extensions.Options;

namespace PFMP_API.Services.AI;

/// <summary>
/// Primary-Backup AI Advisor orchestrates calls where:
/// 1. Primary AI (OpenAI GPT-5) generates the recommendation
/// 2. Backup AI (Gemini) reviews and corroborates/adjusts the primary's recommendation
/// This replaces the "dual panel" approach with a hierarchical validation model.
/// </summary>
public class PrimaryBackupAIAdvisor : IDualAIAdvisor
{
    private readonly IAIFinancialAdvisor _primaryService;   // OpenAI GPT-5
    private readonly IAIFinancialAdvisor _backupService;    // Gemini
    private readonly ConsensusEngine _consensusEngine;
    private readonly ConsensusOptions _options;
    private readonly ILogger<PrimaryBackupAIAdvisor> _logger;

    public PrimaryBackupAIAdvisor(
        IEnumerable<IAIFinancialAdvisor> advisors,
        ConsensusEngine consensusEngine,
        IOptions<ConsensusOptions> options,
        ILogger<PrimaryBackupAIAdvisor> logger)
    {
        var advisorList = advisors.ToList();
        _primaryService = advisorList.First(a => a.ServiceName == "OpenAI");
        _backupService = advisorList.First(a => a.ServiceName == "Gemini");
        _consensusEngine = consensusEngine;
        _options = options.Value;
        _logger = logger;
    }

    public async Task<ConsensusResult> GetConsensusRecommendationAsync(AIPromptRequest request)
    {
        _logger.LogInformation(
            "Primary-Backup AI request started: userId={UserId}, promptLength={Length}, cacheableContextLength={CacheLength}",
            request.UserId, request.UserPrompt.Length, request.CacheableContext?.Length ?? 0);

        var startTime = DateTime.UtcNow;

        try
        {
            // Step 1: Get primary recommendation from OpenAI GPT-5
            _logger.LogInformation("Calling primary AI (OpenAI)...");
            AIRecommendation primary;
            
            try
            {
                primary = await _primaryService.GetRecommendationAsync(request);
                
                _logger.LogInformation(
                    "Primary AI responded: recommendationId={Id}, tokens={Tokens}, cost=${Cost:F4}, confidence={Confidence:P0}",
                    primary.RecommendationId, primary.TokensUsed, primary.EstimatedCost, primary.ConfidenceScore);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Primary AI (OpenAI) failed");
                
                // If primary fails, we can't proceed without a recommendation to validate
                throw new InvalidOperationException("Primary AI service failed - cannot generate recommendation", ex);
            }

            // Step 2: Get backup corroboration from Gemini
            _logger.LogInformation("Calling backup AI (Gemini) for corroboration...");
            AIRecommendation? backup = null;
            
            try
            {
                // Create a modified request for backup that includes primary's recommendation
                var backupRequest = CreateBackupCorroborationRequest(request, primary);
                backup = await _backupService.GetRecommendationAsync(backupRequest);
                
                _logger.LogInformation(
                    "Backup AI responded: recommendationId={Id}, tokens={Tokens}, cost=${Cost:F4}, confidence={Confidence:P0}",
                    backup.RecommendationId, backup.TokensUsed, backup.EstimatedCost, backup.ConfidenceScore);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Backup AI (Gemini) failed - proceeding with primary recommendation only");
                
                // Backup failure is acceptable - we can proceed with primary only
                if (_options.RequireBothResponses)
                {
                    throw new InvalidOperationException("Backup AI service failed and both responses are required", ex);
                }
            }

            // Build consensus/corroboration result
            ConsensusResult consensus;
            
            if (backup == null)
            {
                // Primary only
                consensus = CreatePrimaryOnlyResult(primary);
            }
            else
            {
                // Primary + Backup corroboration
                consensus = _consensusEngine.BuildCorroboration(primary, backup);
            }

            var elapsed = DateTime.UtcNow - startTime;
            _logger.LogInformation(
                "Primary-Backup AI request completed: consensusId={ConsensusId}, hasCorroboration={HasCorroboration}, agreement={Agreement:P0}, elapsed={Elapsed}ms, cost=${Cost:F4}",
                consensus.ConsensusId, consensus.HasConsensus, consensus.AgreementScore, elapsed.TotalMilliseconds, consensus.TotalCost);

            return consensus;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Primary-Backup AI request failed: userId={UserId}", request.UserId);
            throw;
        }
    }

    public async Task<ConsensusResult> GetRetirementConsensusAsync(string userId)
    {
        _logger.LogInformation("Retirement analysis (Primary-Backup): userId={UserId}", userId);

        // Get primary recommendation
        var primary = await _primaryService.GetRetirementAdviceAsync(userId);

        // Get backup corroboration
        AIRecommendation? backup = null;
        try
        {
            backup = await _backupService.GetRetirementAdviceAsync(userId);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Backup AI failed for retirement analysis");
        }

        return backup == null 
            ? CreatePrimaryOnlyResult(primary)
            : _consensusEngine.BuildCorroboration(primary, backup);
    }

    public async Task<ConsensusResult> GetRebalancingConsensusAsync(string userId)
    {
        _logger.LogInformation("Rebalancing analysis (Primary-Backup): userId={UserId}", userId);

        // Get primary recommendation
        var primary = await _primaryService.GetRebalancingAdviceAsync(userId);

        // Get backup corroboration
        AIRecommendation? backup = null;
        try
        {
            backup = await _backupService.GetRebalancingAdviceAsync(userId);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Backup AI failed for rebalancing analysis");
        }

        return backup == null
            ? CreatePrimaryOnlyResult(primary)
            : _consensusEngine.BuildCorroboration(primary, backup);
    }

    /// <summary>
    /// Creates a modified prompt for the backup AI that includes the primary's recommendation
    /// for corroboration rather than independent analysis.
    /// </summary>
    private AIPromptRequest CreateBackupCorroborationRequest(AIPromptRequest originalRequest, AIRecommendation primaryRecommendation)
    {
        // Build a new prompt that asks backup to review primary's recommendation
        var corroborationPrompt = $@"You are a backup financial advisor reviewing another AI's recommendation.

PRIMARY AI RECOMMENDATION:
{primaryRecommendation.RecommendationText}

PRIMARY AI CONFIDENCE: {primaryRecommendation.ConfidenceScore:P0}

ORIGINAL USER CONTEXT:
{originalRequest.UserPrompt}

YOUR TASK:
1. Review the primary AI's recommendation for accuracy and appropriateness
2. Identify any concerns, oversights, or risks not mentioned
3. Suggest adjustments or alternatives if needed
4. Provide your level of agreement (Strongly Agree / Agree / Neutral / Disagree / Strongly Disagree)

Format your response as:
- **Agreement Level**: [Your assessment]
- **Key Points of Agreement**: [What you agree with]
- **Concerns or Adjustments**: [What needs adjustment or caution]
- **Final Recommendation**: [Your corroborated or adjusted recommendation]";

        return new AIPromptRequest
        {
            UserId = originalRequest.UserId,
            SystemPrompt = "You are a backup financial advisor whose role is to review and validate the primary AI's recommendations. Be thorough and critical. Point out risks and oversights.",
            UserPrompt = corroborationPrompt,
            CacheableContext = originalRequest.CacheableContext, // Same user context
            Temperature = 0.4m, // Slightly higher than primary for diverse perspective
            MaxTokens = originalRequest.MaxTokens
        };
    }

    /// <summary>
    /// Creates a consensus result when only the primary AI responded.
    /// </summary>
    private ConsensusResult CreatePrimaryOnlyResult(AIRecommendation primary)
    {
        return new ConsensusResult
        {
            ConsensusId = Guid.NewGuid().ToString(),
            PrimaryRecommendation = primary,
            BackupCorroboration = null,
            HasConsensus = true, // Primary is authoritative
            AgreementScore = 1.0m, // No disagreement when only one voice
            ConsensusRecommendation = primary.RecommendationText,
            DisagreementExplanation = "Backup AI did not respond - proceeding with primary recommendation only.",
            TotalCost = primary.EstimatedCost,
            GeneratedAt = DateTime.UtcNow,
            Metadata = new Dictionary<string, object>
            {
                { "mode", "primary-only" },
                { "primaryService", primary.ServiceName },
                { "primaryModel", primary.ModelVersion },
                { "backupFailed", true }
            }
        };
    }
}
