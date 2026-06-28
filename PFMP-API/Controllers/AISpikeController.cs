using Microsoft.AspNetCore.Mvc;
using PFMP_API.Services.AI;
using System.Diagnostics;
using Microsoft.AspNetCore.Authorization;

namespace PFMP_API.Controllers;

/// <summary>
/// Wave 22 Phase A â€” Fusion vs. Primaryâ†’Verifier side-by-side comparison endpoint.
///
/// Runs both advisors against the same production prompt for a user, returns
/// cost / token / latency / response text for each, plus computed ratios.
///
/// Intended to be deleted once the Phase A decision is made:
/// - If Fusion passes the 2Ã— / 3Ã— cost gate â†’ Phase B refactor replaces this with the production path
/// - If Fusion fails â†’ this controller is removed in cleanup
///
/// See: docs/waves/wave-22-ai-architecture-overhaul.md
/// </summary>
[ApiController]
[Route("api/admin/spike")]
[Authorize]
public class AISpikeController : ControllerBase
{
    private readonly IAIIntelligenceService _intel;
    private readonly PrimaryBackupAIAdvisor _baseline;
    private readonly FusionAIAdvisor _fusion;
    private readonly ILogger<AISpikeController> _logger;

    public AISpikeController(
        IAIIntelligenceService intel,
        PrimaryBackupAIAdvisor baseline,
        FusionAIAdvisor fusion,
        ILogger<AISpikeController> logger)
    {
        _intel = intel;
        _baseline = baseline;
        _fusion = fusion;
        _logger = logger;
    }

    /// <summary>
    /// GET /api/admin/spike/fusion-comparison?userId=20&amp;analysisType=cash
    /// Runs both advisors against the same prompt and returns the comparison.
    /// </summary>
    /// <param name="userId">The user whose data drives the prompt. Default 20 (the populated dev user).</param>
    /// <param name="analysisType">cash | portfolio | tsp | risk | full. Default cash (cheapest single-prompt comparison).</param>
    /// <param name="mode">both (default) | baseline | fusion. Use single-mode runs to control burn precisely.</param>
    [HttpGet("fusion-comparison")]
    public async Task<ActionResult> RunComparison(
        [FromQuery] int userId = 20,
        [FromQuery] string analysisType = "cash",
        [FromQuery] string mode = "both")
    {
        _logger.LogInformation(
            "Fusion spike comparison: userId={UserId}, analysisType={AnalysisType}, mode={Mode}",
            userId, analysisType, mode);

        try
        {
            // Build the same prompt the dashboard analyze path would send.
            var preview = await _intel.PreviewAnalysisPromptAsync(userId, analysisType);

            var scopeLabel = analysisType.ToLower() is "full" or "comprehensive"
                ? "COMPREHENSIVE FINANCIAL REVIEW"
                : $"{analysisType.ToUpper()} ANALYSIS";

            var promptRequest = new AIPromptRequest
            {
                UserId = userId.ToString(),
                SystemPrompt = preview.SystemPrompt,
                CacheableContext = preview.CacheableContext,
                UserPrompt = $"=== ANALYSIS SCOPE: {scopeLabel} ===\n\n{preview.AnalysisContext}",
                MaxTokens = 4000,
                Temperature = 0.3m
            };

            ComparisonRun? baselineRun = null;
            ComparisonRun? fusionRun = null;

            if (mode is "both" or "baseline")
            {
                baselineRun = await RunAdvisorAsync("baseline", async () =>
                    await _baseline.GetConsensusRecommendationAsync(promptRequest));
            }

            if (mode is "both" or "fusion")
            {
                fusionRun = await RunAdvisorAsync("fusion", async () =>
                    await _fusion.GetConsensusRecommendationAsync(promptRequest));
            }

            // Computed ratios â€” only meaningful when both modes ran
            object? ratios = null;
            if (baselineRun != null && fusionRun != null && baselineRun.TotalCost > 0)
            {
                ratios = new
                {
                    costRatio = decimal.Round(fusionRun.TotalCost / baselineRun.TotalCost, 3),
                    tokenRatio = baselineRun.TotalTokens > 0
                        ? Math.Round((double)fusionRun.TotalTokens / baselineRun.TotalTokens, 3)
                        : 0.0,
                    latencyRatio = baselineRun.ElapsedMs > 0
                        ? Math.Round(fusionRun.ElapsedMs / baselineRun.ElapsedMs, 3)
                        : 0.0,
                    verdict = ClassifyCostRatio(fusionRun.TotalCost / baselineRun.TotalCost)
                };
            }

            return Ok(new
            {
                userId,
                analysisType,
                mode,
                promptMetadata = new
                {
                    estimatedTokens = preview.EstimatedTokens,
                    contextMetadata = preview.ContextMetadata
                },
                baseline = baselineRun,
                fusion = fusionRun,
                ratios,
                runAt = DateTime.UtcNow
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Fusion spike comparison failed: userId={UserId}", userId);
            return StatusCode(500, new { error = "Spike comparison failed", details = ex.Message, stack = ex.StackTrace });
        }
    }

    private async Task<ComparisonRun> RunAdvisorAsync(string label, Func<Task<ConsensusResult>> call)
    {
        var sw = Stopwatch.StartNew();
        try
        {
            var result = await call();
            sw.Stop();

            return new ComparisonRun
            {
                Label = label,
                Success = true,
                TotalCost = result.TotalCost,
                TotalTokens = result.TotalTokens,
                ElapsedMs = sw.Elapsed.TotalMilliseconds,
                PrimaryServiceName = result.PrimaryRecommendation?.ServiceName,
                PrimaryModel = result.PrimaryRecommendation?.ModelVersion,
                BackupServiceName = result.BackupCorroboration?.ServiceName,
                BackupModel = result.BackupCorroboration?.ModelVersion,
                ConsensusRecommendation = result.ConsensusRecommendation,
                PrimaryResponseText = result.PrimaryRecommendation?.RecommendationText,
                BackupResponseText = result.BackupCorroboration?.RecommendationText,
                HasConsensus = result.HasConsensus,
                AgreementScore = result.AgreementScore,
                Metadata = result.Metadata
            };
        }
        catch (Exception ex)
        {
            sw.Stop();
            _logger.LogError(ex, "Spike run failed: label={Label}", label);
            return new ComparisonRun
            {
                Label = label,
                Success = false,
                ElapsedMs = sw.Elapsed.TotalMilliseconds,
                Error = ex.Message
            };
        }
    }

    private static string ClassifyCostRatio(decimal ratio)
    {
        // Per Wave 22 decision gate (user chose 2Ã— commit / 3Ã— discuss)
        if (ratio <= 2.0m) return "commit";
        if (ratio <= 3.0m) return "discuss";
        return "rollback";
    }

    public class ComparisonRun
    {
        public string Label { get; set; } = "";
        public bool Success { get; set; }
        public decimal TotalCost { get; set; }
        public int TotalTokens { get; set; }
        public double ElapsedMs { get; set; }
        public string? PrimaryServiceName { get; set; }
        public string? PrimaryModel { get; set; }
        public string? BackupServiceName { get; set; }
        public string? BackupModel { get; set; }
        public string? ConsensusRecommendation { get; set; }
        public string? PrimaryResponseText { get; set; }
        public string? BackupResponseText { get; set; }
        public bool HasConsensus { get; set; }
        public decimal AgreementScore { get; set; }
        public Dictionary<string, object>? Metadata { get; set; }
        public string? Error { get; set; }
    }
}
