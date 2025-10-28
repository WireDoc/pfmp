using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PFMP_API.Models;
using PFMP_API.Services.AI;
using System.Security.Claims;

namespace PFMP_API.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/ai")]
    public class AIIntelligenceController : ControllerBase
    {
        private readonly IAIIntelligenceService _aiIntelligence;
        private readonly IAIMemoryService _memory;
        private readonly ILogger<AIIntelligenceController> _logger;

        public AIIntelligenceController(
            IAIIntelligenceService aiIntelligence,
            IAIMemoryService memory,
            ILogger<AIIntelligenceController> logger)
        {
            _aiIntelligence = aiIntelligence;
            _memory = memory;
            _logger = logger;
        }

        // ===== Comprehensive Analysis =====

        /// <summary>
        /// POST /api/ai/analyze/{userId}
        /// Comprehensive financial analysis (cash, rebalancing, TSP, risk)
        /// </summary>
        [HttpPost("analyze/{userId}")]
        public async Task<ActionResult<AIAnalysisResult>> AnalyzeUserFinances(int userId, [FromQuery] bool force = false)
        {
            if (!IsAuthorizedUser(userId))
                return Forbid();

            try
            {
                _logger.LogInformation("Starting AI analysis for user {UserId}", userId);
                var result = await _aiIntelligence.AnalyzeUserFinancesAsync(userId, force);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error analyzing finances for user {UserId}", userId);
                return StatusCode(500, new { error = "Failed to analyze finances", details = ex.Message });
            }
        }

        // ===== Specific Analysis Endpoints =====

        /// <summary>
        /// POST /api/ai/analyze/{userId}/cash-optimization
        /// Analyze cash allocation and high-yield savings opportunities
        /// </summary>
        [HttpPost("analyze/{userId}/cash-optimization")]
        public async Task<ActionResult<ConsensusResult>> AnalyzeCashOptimization(int userId)
        {
            if (!IsAuthorizedUser(userId))
                return Forbid();

            try
            {
                var result = await _aiIntelligence.AnalyzeCashOptimizationAsync(userId);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error analyzing cash optimization for user {UserId}", userId);
                return StatusCode(500, new { error = "Failed to analyze cash optimization", details = ex.Message });
            }
        }

        /// <summary>
        /// POST /api/ai/analyze/{userId}/rebalancing
        /// Analyze portfolio balance and rebalancing needs
        /// </summary>
        [HttpPost("analyze/{userId}/rebalancing")]
        public async Task<ActionResult<ConsensusResult>> AnalyzeRebalancing(int userId)
        {
            if (!IsAuthorizedUser(userId))
                return Forbid();

            try
            {
                var result = await _aiIntelligence.AnalyzePortfolioRebalancingAsync(userId);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error analyzing rebalancing for user {UserId}", userId);
                return StatusCode(500, new { error = "Failed to analyze rebalancing", details = ex.Message });
            }
        }

        /// <summary>
        /// POST /api/ai/analyze/{userId}/tsp
        /// Analyze TSP allocation and contribution rate
        /// </summary>
        [HttpPost("analyze/{userId}/tsp")]
        public async Task<ActionResult<ConsensusResult>> AnalyzeTSP(int userId)
        {
            if (!IsAuthorizedUser(userId))
                return Forbid();

            try
            {
                var result = await _aiIntelligence.AnalyzeTSPAllocationAsync(userId);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error analyzing TSP for user {UserId}", userId);
                return StatusCode(500, new { error = "Failed to analyze TSP", details = ex.Message });
            }
        }

        /// <summary>
        /// POST /api/ai/analyze/{userId}/risk
        /// Analyze risk tolerance alignment
        /// </summary>
        [HttpPost("analyze/{userId}/risk")]
        public async Task<ActionResult<ConsensusResult>> AnalyzeRisk(int userId)
        {
            if (!IsAuthorizedUser(userId))
                return Forbid();

            try
            {
                var result = await _aiIntelligence.AnalyzeRiskAlignmentAsync(userId);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error analyzing risk for user {UserId}", userId);
                return StatusCode(500, new { error = "Failed to analyze risk", details = ex.Message });
            }
        }

        // ===== Alert-to-Advice =====

        /// <summary>
        /// POST /api/ai/advice/from-alert/{alertId}
        /// Generate AI advice from an existing alert
        /// </summary>
        [HttpPost("advice/from-alert/{alertId}")]
        public async Task<ActionResult<Advice>> GenerateAdviceFromAlert(int alertId)
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return Unauthorized();

            try
            {
                var advice = await _aiIntelligence.GenerateAdviceFromAlertAsync(alertId, userId.Value);
                return Ok(advice);
            }
            catch (InvalidOperationException ex)
            {
                return NotFound(new { error = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating advice from alert {AlertId}", alertId);
                return StatusCode(500, new { error = "Failed to generate advice", details = ex.Message });
            }
        }

        // ===== Chatbot =====

        /// <summary>
        /// POST /api/ai/chat
        /// Send a message to the AI financial advisor chatbot
        /// </summary>
        [HttpPost("chat")]
        public async Task<ActionResult<AIChatResponse>> Chat([FromBody] ChatRequest request)
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return Unauthorized();

            if (string.IsNullOrWhiteSpace(request.Message))
                return BadRequest(new { error = "Message is required" });

            try
            {
                var response = await _aiIntelligence.GetChatResponseAsync(
                    userId.Value, 
                    request.Message, 
                    request.ConversationId
                );
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing chat for user {UserId}", userId);
                return StatusCode(500, new { error = "Failed to process chat", details = ex.Message });
            }
        }

        /// <summary>
        /// POST /api/ai/chat/convert-to-advice
        /// Convert a chat conversation insight into formal advice
        /// </summary>
        [HttpPost("chat/convert-to-advice")]
        public async Task<ActionResult<Advice>> ConvertChatToAdvice([FromBody] ConvertChatRequest request)
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return Unauthorized();

            if (request.ConversationId <= 0)
                return BadRequest(new { error = "Valid conversation ID is required" });

            try
            {
                var advice = await _aiIntelligence.ConvertChatToAdviceAsync(
                    request.ConversationId, 
                    userId.Value, 
                    request.Reasoning ?? "User requested conversion from chat"
                );
                return Ok(advice);
            }
            catch (InvalidOperationException ex)
            {
                return NotFound(new { error = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error converting chat {ConversationId} to advice", request.ConversationId);
                return StatusCode(500, new { error = "Failed to convert chat to advice", details = ex.Message });
            }
        }

        /// <summary>
        /// POST /api/ai/chat/{conversationId}/end
        /// End a conversation and generate summary
        /// </summary>
        [HttpPost("chat/{conversationId}/end")]
        public async Task<ActionResult<AIConversation>> EndConversation(int conversationId, [FromBody] EndConversationRequest? request)
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return Unauthorized();

            try
            {
                var conversation = await _memory.EndConversationAsync(conversationId, request?.Summary);
                return Ok(conversation);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error ending conversation {ConversationId}", conversationId);
                return StatusCode(500, new { error = "Failed to end conversation", details = ex.Message });
            }
        }

        /// <summary>
        /// GET /api/ai/chat/history/{conversationId}
        /// Get conversation history
        /// </summary>
        [HttpGet("chat/history/{conversationId}")]
        public async Task<ActionResult<List<AIMessage>>> GetConversationHistory(int conversationId, [FromQuery] int limit = 50)
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return Unauthorized();

            try
            {
                var messages = await _memory.GetConversationHistoryAsync(conversationId, limit);
                return Ok(messages);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting conversation history {ConversationId}", conversationId);
                return StatusCode(500, new { error = "Failed to get conversation history", details = ex.Message });
            }
        }

        // ===== Memory Management =====

        /// <summary>
        /// POST /api/ai/memory/action
        /// Record a user financial action for AI context
        /// </summary>
        [HttpPost("memory/action")]
        public async Task<ActionResult> RecordAction([FromBody] RecordActionRequest request)
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return Unauthorized();

            if (string.IsNullOrWhiteSpace(request.ActionType) || string.IsNullOrWhiteSpace(request.ActionSummary))
                return BadRequest(new { error = "ActionType and ActionSummary are required" });

            try
            {
                await _aiIntelligence.RecordUserActionAsync(
                    userId.Value,
                    request.ActionType,
                    request.ActionSummary,
                    request.Amount,
                    request.AssetClass,
                    request.SourceAdviceId
                );
                return Ok(new { message = "Action recorded successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error recording action for user {UserId}", userId);
                return StatusCode(500, new { error = "Failed to record action", details = ex.Message });
            }
        }

        /// <summary>
        /// GET /api/ai/memory/actions
        /// Get recent user actions
        /// </summary>
        [HttpGet("memory/actions")]
        public async Task<ActionResult<List<AIActionMemory>>> GetRecentActions([FromQuery] int days = 30)
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return Unauthorized();

            try
            {
                var actions = await _memory.GetRecentActionsAsync(userId.Value, days);
                return Ok(actions);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting recent actions for user {UserId}", userId);
                return StatusCode(500, new { error = "Failed to get recent actions", details = ex.Message });
            }
        }

        /// <summary>
        /// GET /api/ai/memory/preferences
        /// Get learned user preferences
        /// </summary>
        [HttpGet("memory/preferences")]
        public async Task<ActionResult<List<AIUserMemory>>> GetPreferences([FromQuery] int minConfidence = 50)
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return Unauthorized();

            try
            {
                var preferences = await _memory.GetActiveMemoriesAsync(userId.Value, minConfidence);
                return Ok(preferences);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting preferences for user {UserId}", userId);
                return StatusCode(500, new { error = "Failed to get preferences", details = ex.Message });
            }
        }

        /// <summary>
        /// POST /api/ai/memory/preference
        /// Manually add or reinforce a user preference
        /// </summary>
        [HttpPost("memory/preference")]
        public async Task<ActionResult<AIUserMemory>> LearnPreference([FromBody] LearnPreferenceRequest request)
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return Unauthorized();

            if (string.IsNullOrWhiteSpace(request.MemoryKey) || string.IsNullOrWhiteSpace(request.MemoryValue))
                return BadRequest(new { error = "MemoryKey and MemoryValue are required" });

            try
            {
                var memory = await _memory.LearnPreferenceAsync(
                    userId.Value,
                    request.MemoryKey,
                    request.MemoryValue,
                    request.Context,
                    request.MemoryType ?? "Preference"
                );
                return Ok(memory);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error learning preference for user {UserId}", userId);
                return StatusCode(500, new { error = "Failed to learn preference", details = ex.Message });
            }
        }

        /// <summary>
        /// DELETE /api/ai/memory/preference/{memoryId}
        /// Deprecate (forget) a learned preference
        /// </summary>
        [HttpDelete("memory/preference/{memoryId}")]
        public async Task<ActionResult> ForgetPreference(int memoryId, [FromQuery] string? reason)
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return Unauthorized();

            try
            {
                var success = await _memory.DeprecateMemoryAsync(memoryId, reason ?? "User requested deletion");
                if (success)
                    return Ok(new { message = "Preference forgotten successfully" });
                else
                    return NotFound(new { error = "Memory not found" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error forgetting preference {MemoryId}", memoryId);
                return StatusCode(500, new { error = "Failed to forget preference", details = ex.Message });
            }
        }

        // ===== Market Context =====

        /// <summary>
        /// GET /api/ai/market-context/latest
        /// Get the latest market context digest
        /// </summary>
        [HttpGet("market-context/latest")]
        public async Task<ActionResult<MarketContext>> GetLatestMarketContext()
        {
            try
            {
                var context = await _memory.GetLatestMarketContextAsync();
                if (context == null)
                    return NotFound(new { error = "No market context available yet" });
                
                return Ok(context);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting latest market context");
                return StatusCode(500, new { error = "Failed to get market context", details = ex.Message });
            }
        }

        /// <summary>
        /// GET /api/ai/market-context/summary
        /// Get market context summary for recent period
        /// </summary>
        [HttpGet("market-context/summary")]
        public async Task<ActionResult<string>> GetMarketContextSummary([FromQuery] int days = 30)
        {
            try
            {
                var summary = await _memory.BuildMarketContextSummaryAsync(days);
                return Ok(new { summary });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting market context summary");
                return StatusCode(500, new { error = "Failed to get market context summary", details = ex.Message });
            }
        }

        // ===== Helper Methods =====

        private int? GetCurrentUserId()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (int.TryParse(userIdClaim, out int userId))
                return userId;
            return null;
        }

        private bool IsAuthorizedUser(int userId)
        {
            var currentUserId = GetCurrentUserId();
            return currentUserId.HasValue && currentUserId.Value == userId;
        }
    }

    // ===== Request DTOs =====

    public class ChatRequest
    {
        public string Message { get; set; } = string.Empty;
        public int? ConversationId { get; set; }
    }

    public class ConvertChatRequest
    {
        public int ConversationId { get; set; }
        public string? Reasoning { get; set; }
    }

    public class EndConversationRequest
    {
        public string? Summary { get; set; }
    }

    public class RecordActionRequest
    {
        public string ActionType { get; set; } = string.Empty;
        public string ActionSummary { get; set; } = string.Empty;
        public decimal? Amount { get; set; }
        public string? AssetClass { get; set; }
        public int? SourceAdviceId { get; set; }
    }

    public class LearnPreferenceRequest
    {
        public string MemoryKey { get; set; } = string.Empty;
        public string MemoryValue { get; set; } = string.Empty;
        public string? Context { get; set; }
        public string? MemoryType { get; set; }
    }
}
