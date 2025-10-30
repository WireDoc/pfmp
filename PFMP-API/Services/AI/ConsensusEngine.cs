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
    /// Build corroboration result from primary AI recommendation and backup review.
    /// This is different from consensus - the backup is validating/adjusting the primary, not providing independent analysis.
    /// </summary>
    public ConsensusResult BuildCorroboration(
        AIRecommendation primary,
        AIRecommendation backup)
    {
        _logger.LogInformation(
            "Building corroboration: primary={PrimaryId} ({PrimaryService}), backup={BackupId} ({BackupService})",
            primary.RecommendationId, primary.ServiceName, backup.RecommendationId, backup.ServiceName);

        // Parse backup's agreement level from its response
        var (agreementLevel, backupAgreementScore) = ParseBackupAgreement(backup.RecommendationText);

        // Determine if backup corroborates or disagrees
        var hasCorroboration = backupAgreementScore >= 0.6m; // 60% agreement threshold for corroboration

        // Extract backup's concerns and adjustments
        var backupConcerns = ExtractBackupConcerns(backup.RecommendationText);
        var backupAdjustments = ExtractBackupAdjustments(backup.RecommendationText);

        // Build final recommendation
        string finalRecommendation;
        string disagreementExplanation = string.Empty;

        if (hasCorroboration)
        {
            // Backup corroborates with potential minor adjustments
            finalRecommendation = BuildCorroboratedRecommendation(primary, backup, backupAdjustments);
            
            if (backupConcerns.Any())
            {
                finalRecommendation += "\n\n**Backup AI Cautions:**\n";
                foreach (var concern in backupConcerns)
                {
                    finalRecommendation += $"- {concern}\n";
                }
            }
        }
        else
        {
            // Backup disagrees - provide both perspectives
            disagreementExplanation = BuildCorroborationDisagreement(
                primary, backup, agreementLevel, backupConcerns);
            
            // Default to primary but note the disagreement
            finalRecommendation = primary.RecommendationText;
        }

        var result = new ConsensusResult
        {
            ConsensusId = Guid.NewGuid().ToString(),
            PrimaryRecommendation = primary,
            BackupCorroboration = backup,
            AgreementScore = backupAgreementScore,
            HasConsensus = hasCorroboration,
            ConsensusRecommendation = finalRecommendation,
            DisagreementExplanation = hasCorroboration ? null : disagreementExplanation,
            CommonActionItems = hasCorroboration ? primary.ActionItems : new List<string>(),
            ConservativeOnlyItems = new List<string>(), // Not applicable in primary-backup model
            AggressiveOnlyItems = new List<string>(),   // Not applicable in primary-backup model
            TotalCost = primary.EstimatedCost + backup.EstimatedCost,
            TotalTokens = primary.TokensUsed + backup.TokensUsed,
            GeneratedAt = DateTime.UtcNow,
            Metadata = new Dictionary<string, object>
            {
                { "mode", "primary-backup" },
                { "primaryService", primary.ServiceName },
                { "backupService", backup.ServiceName },
                { "agreementLevel", agreementLevel },
                { "backupConcerns", backupConcerns.Count },
                { "backupAdjustments", backupAdjustments.Count }
            }
        };

        _logger.LogInformation(
            "Corroboration result: hasCorroboration={HasCorroboration}, agreement={Agreement:P0}, concerns={Concerns}, adjustments={Adjustments}",
            hasCorroboration, backupAgreementScore, backupConcerns.Count, backupAdjustments.Count);

        return result;
    }

    /// <summary>
    /// Parse the backup AI's agreement level from its response text.
    /// Returns (agreementLevel, score) where score is 0.0-1.0.
    /// </summary>
    private (string level, decimal score) ParseBackupAgreement(string backupText)
    {
        var lowerText = backupText.ToLower();

        if (lowerText.Contains("strongly agree"))
            return ("Strongly Agree", 1.0m);
        if (lowerText.Contains("agree"))
            return ("Agree", 0.8m);
        if (lowerText.Contains("neutral") || lowerText.Contains("mixed"))
            return ("Neutral", 0.5m);
        if (lowerText.Contains("disagree") && !lowerText.Contains("strongly disagree"))
            return ("Disagree", 0.3m);
        if (lowerText.Contains("strongly disagree"))
            return ("Strongly Disagree", 0.0m);

        // Default if not explicitly stated
        return ("Neutral", 0.5m);
    }

    private List<string> ExtractBackupConcerns(string backupText)
    {
        var concerns = new List<string>();
        var lines = backupText.Split('\n', StringSplitOptions.RemoveEmptyEntries);
        bool inConcernsSection = false;

        foreach (var line in lines)
        {
            var trimmed = line.Trim();
            
            if (trimmed.Contains("Concerns", StringComparison.OrdinalIgnoreCase) ||
                trimmed.Contains("Caution", StringComparison.OrdinalIgnoreCase) ||
                trimmed.Contains("Risks", StringComparison.OrdinalIgnoreCase))
            {
                inConcernsSection = true;
                continue;
            }

            if (trimmed.StartsWith("**") && inConcernsSection)
            {
                inConcernsSection = false;
            }

            if (inConcernsSection && (trimmed.StartsWith("-") || trimmed.StartsWith("•")))
            {
                concerns.Add(trimmed.TrimStart('-', '•', ' '));
            }
        }

        return concerns;
    }

    private List<string> ExtractBackupAdjustments(string backupText)
    {
        var adjustments = new List<string>();
        var lines = backupText.Split('\n', StringSplitOptions.RemoveEmptyEntries);
        bool inAdjustmentsSection = false;

        foreach (var line in lines)
        {
            var trimmed = line.Trim();
            
            if (trimmed.Contains("Adjustment", StringComparison.OrdinalIgnoreCase) ||
                trimmed.Contains("Alternative", StringComparison.OrdinalIgnoreCase) ||
                trimmed.Contains("Suggestion", StringComparison.OrdinalIgnoreCase))
            {
                inAdjustmentsSection = true;
                continue;
            }

            if (trimmed.StartsWith("**") && inAdjustmentsSection)
            {
                inAdjustmentsSection = false;
            }

            if (inAdjustmentsSection && (trimmed.StartsWith("-") || trimmed.StartsWith("•")))
            {
                adjustments.Add(trimmed.TrimStart('-', '•', ' '));
            }
        }

        return adjustments;
    }

    private string BuildCorroboratedRecommendation(
        AIRecommendation primary,
        AIRecommendation backup,
        List<string> adjustments)
    {
        var corroborated = $"**Primary AI Recommendation ({primary.ServiceName}):**\n\n";
        corroborated += primary.RecommendationText;

        if (adjustments.Any())
        {
            corroborated += "\n\n**Backup AI Adjustments ({backup.ServiceName}):**\n";
            foreach (var adjustment in adjustments)
            {
                corroborated += $"- {adjustment}\n";
            }
        }
        else
        {
            corroborated += $"\n\n**Backup AI ({backup.ServiceName}) Corroboration:** ✓ Validated with no significant concerns";
        }

        return corroborated;
    }

    private string BuildCorroborationDisagreement(
        AIRecommendation primary,
        AIRecommendation backup,
        string agreementLevel,
        List<string> concerns)
    {
        var disagreement = $"**Backup AI ({backup.ServiceName}) {agreementLevel}**\n\n";
        disagreement += "The backup AI has identified concerns with the primary recommendation:\n\n";

        foreach (var concern in concerns)
        {
            disagreement += $"- {concern}\n";
        }

        disagreement += "\n**What this means:** The primary recommendation may need adjustment. Review the backup AI's full response for details.";
        disagreement += $"\n\n**Backup AI Full Response:**\n{backup.RecommendationText}";

        return disagreement;
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
