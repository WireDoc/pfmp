using Microsoft.Extensions.Options;

namespace PFMP_API.Services.AI;

/// <summary>
/// Consensus engine that analyzes and merges recommendations from dual AI advisors.
/// Compares Claude (conservative) and Gemini (aggressive) responses to find common ground.
/// </summary>
public class ConsensusEngine
{
    private readonly ConsensusOptions _options;
    private readonly ILogger<ConsensusEngine> _logger;

    public ConsensusEngine(
        IOptions<ConsensusOptions> options,
        ILogger<ConsensusEngine> logger)
    {
        _options = options.Value;
        _logger = logger;
    }

    /// <summary>
    /// Build consensus from conservative and aggressive AI recommendations.
    /// </summary>
    public ConsensusResult BuildConsensus(
        AIRecommendation conservative,
        AIRecommendation aggressive)
    {
        _logger.LogInformation(
            "Building consensus: conservative={ConservativeId}, aggressive={AggressiveId}",
            conservative.RecommendationId, aggressive.RecommendationId);

        // Calculate agreement score between the two recommendations
        var agreementScore = CalculateAgreementScore(conservative, aggressive);

        // Determine if consensus is reached
        var hasConsensus = agreementScore >= _options.MinimumAgreementScore &&
                          conservative.ConfidenceScore >= _options.MinimumConfidenceScore &&
                          aggressive.ConfidenceScore >= _options.MinimumConfidenceScore;

        // Find common and divergent action items
        var commonItems = FindCommonActionItems(conservative.ActionItems, aggressive.ActionItems);
        var conservativeOnly = conservative.ActionItems.Except(commonItems).ToList();
        var aggressiveOnly = aggressive.ActionItems.Except(commonItems).ToList();

        // Build consensus recommendation
        string? consensusRecommendation = null;
        string? disagreementExplanation = null;

        if (hasConsensus)
        {
            consensusRecommendation = BuildConsensusRecommendation(
                conservative, aggressive, commonItems, agreementScore);
        }
        else
        {
            disagreementExplanation = BuildDisagreementExplanation(
                conservative, aggressive, conservativeOnly, aggressiveOnly, agreementScore);
        }

        var result = new ConsensusResult
        {
            ConservativeAdvice = conservative,
            AggressiveAdvice = aggressive,
            AgreementScore = agreementScore,
            HasConsensus = hasConsensus,
            ConsensusRecommendation = consensusRecommendation,
            DisagreementExplanation = disagreementExplanation,
            CommonActionItems = commonItems,
            ConservativeOnlyItems = conservativeOnly,
            AggressiveOnlyItems = aggressiveOnly,
            TotalCost = conservative.EstimatedCost + aggressive.EstimatedCost,
            TotalTokens = conservative.TokensUsed + aggressive.TokensUsed
        };

        _logger.LogInformation(
            "Consensus result: hasConsensus={HasConsensus}, agreement={Agreement:P0}, common={Common}, conservativeOnly={ConservativeOnly}, aggressiveOnly={AggressiveOnly}",
            hasConsensus, agreementScore, commonItems.Count, conservativeOnly.Count, aggressiveOnly.Count);

        return result;
    }

    /// <summary>
    /// Calculate agreement score between two recommendations (0.0 to 1.0).
    /// Uses semantic similarity of recommendations and action item overlap.
    /// </summary>
    private decimal CalculateAgreementScore(
        AIRecommendation conservative,
        AIRecommendation aggressive)
    {
        // Simple heuristic-based scoring
        // TODO: Enhance with semantic similarity (e.g., embeddings)
        
        decimal score = 0m;

        // 1. Action item overlap (40% weight)
        var commonActions = FindCommonActionItems(conservative.ActionItems, aggressive.ActionItems).Count;
        var totalActions = Math.Max(conservative.ActionItems.Count, aggressive.ActionItems.Count);
        if (totalActions > 0)
        {
            score += (decimal)commonActions / totalActions * 0.4m;
        }

        // 2. Keyword overlap in recommendations (30% weight)
        var conservativeWords = ExtractKeywords(conservative.RecommendationText);
        var aggressiveWords = ExtractKeywords(aggressive.RecommendationText);
        var commonWords = conservativeWords.Intersect(aggressiveWords).Count();
        var totalWords = conservativeWords.Union(aggressiveWords).Count();
        if (totalWords > 0)
        {
            score += (decimal)commonWords / totalWords * 0.3m;
        }

        // 3. Sentiment alignment (30% weight)
        var sentimentAlignment = CalculateSentimentAlignment(
            conservative.RecommendationText,
            aggressive.RecommendationText);
        score += sentimentAlignment * 0.3m;

        return Math.Clamp(score, 0m, 1m);
    }

    private List<string> FindCommonActionItems(List<string> items1, List<string> items2)
    {
        // Fuzzy matching for action items
        var common = new List<string>();

        foreach (var item1 in items1)
        {
            foreach (var item2 in items2)
            {
                if (AreSimilarActionItems(item1, item2))
                {
                    common.Add(item1);
                    break;
                }
            }
        }

        return common.Distinct().ToList();
    }

    private bool AreSimilarActionItems(string item1, string item2)
    {
        // Simple similarity check
        // TODO: Enhance with Levenshtein distance or embeddings
        var words1 = ExtractKeywords(item1);
        var words2 = ExtractKeywords(item2);
        var commonWords = words1.Intersect(words2).Count();
        var totalWords = Math.Max(words1.Count, words2.Count);

        return totalWords > 0 && (decimal)commonWords / totalWords >= 0.6m;
    }

    private HashSet<string> ExtractKeywords(string text)
    {
        // Extract meaningful words (excluding stop words)
        var stopWords = new HashSet<string>
        {
            "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
            "of", "with", "by", "from", "as", "is", "was", "are", "were", "be",
            "have", "has", "had", "do", "does", "did", "will", "would", "should",
            "could", "may", "might", "can", "your", "you", "i", "we", "they", "it"
        };

        return text
            .ToLower()
            .Split(new[] { ' ', ',', '.', '!', '?', ';', ':', '\n', '\r' }, StringSplitOptions.RemoveEmptyEntries)
            .Where(w => w.Length > 3 && !stopWords.Contains(w))
            .ToHashSet();
    }

    private decimal CalculateSentimentAlignment(string text1, string text2)
    {
        // Simple sentiment alignment based on positive/cautious language
        var positiveWords = new HashSet<string> { "good", "great", "excellent", "strong", "recommend", "beneficial", "advantageous", "optimal" };
        var cautiousWords = new HashSet<string> { "careful", "cautious", "risk", "consider", "evaluate", "review", "conservative", "prudent" };

        var words1 = ExtractKeywords(text1);
        var words2 = ExtractKeywords(text2);

        var positive1 = words1.Count(w => positiveWords.Contains(w));
        var positive2 = words2.Count(w => positiveWords.Contains(w));
        var cautious1 = words1.Count(w => cautiousWords.Contains(w));
        var cautious2 = words2.Count(w => cautiousWords.Contains(w));

        // Calculate sentiment scores
        var sentiment1 = positive1 - cautious1;
        var sentiment2 = positive2 - cautious2;

        // Normalize and compare
        var maxDiff = 10; // Arbitrary scale
        var diff = Math.Abs(sentiment1 - sentiment2);
        return Math.Clamp(1m - (decimal)diff / maxDiff, 0m, 1m);
    }

    private string BuildConsensusRecommendation(
        AIRecommendation conservative,
        AIRecommendation aggressive,
        List<string> commonItems,
        decimal agreementScore)
    {
        var consensus = $"Both advisors agree (confidence: {agreementScore:P0}):\n\n";
        
        // Add common ground
        if (commonItems.Any())
        {
            consensus += "**Recommended Actions:**\n";
            foreach (var item in commonItems)
            {
                consensus += $"- {item}\n";
            }
        }

        // Add balanced perspective
        consensus += $"\n**Conservative Perspective ({conservative.ServiceName}):**\n";
        consensus += $"{conservative.Reasoning}\n\n";
        
        consensus += $"**Growth Perspective ({aggressive.ServiceName}):**\n";
        consensus += $"{aggressive.Reasoning}\n";

        return consensus;
    }

    private string BuildDisagreementExplanation(
        AIRecommendation conservative,
        AIRecommendation aggressive,
        List<string> conservativeOnly,
        List<string> aggressiveOnly,
        decimal agreementScore)
    {
        var explanation = $"The advisors have different perspectives (agreement: {agreementScore:P0}):\n\n";

        explanation += $"**{conservative.ServiceName} (Conservative) recommends:**\n";
        foreach (var item in conservativeOnly)
        {
            explanation += $"- {item}\n";
        }

        explanation += $"\n**{aggressive.ServiceName} (Aggressive) recommends:**\n";
        foreach (var item in aggressiveOnly)
        {
            explanation += $"- {item}\n";
        }

        explanation += "\n**What this means:** Consider your risk tolerance and financial goals when choosing between these approaches.";
        
        if (_options.DefaultToConservative)
        {
            explanation += $" When in doubt, the {conservative.ServiceName} (conservative) approach may be safer.";
        }

        return explanation;
    }
}
