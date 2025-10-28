# Wave 7 AI Integration Architecture

**Status**: Planning  
**Date**: October 28, 2025  
**Purpose**: Align new Dual AI system with existing Advice/Alerts/Tasks architecture

## Current State Analysis

### Existing Systems

**1. Alerts System** (`AlertsController`, `Alert` model)
- User notifications about portfolio issues
- Categories: Portfolio, Goal, Transaction, Performance, Security, Tax, Rebalancing
- Severity levels: Low, Medium, High, Critical
- Lifecycle: Created → Read → Dismissed
- Has `PortfolioImpactScore` (0-100)
- Has `IsActionable` flag
- NO LONGER creates tasks directly (legacy removed)

**2. Advice System** (`AdviceController`, `Advice` model, `AdviceService`)
- Financial recommendations/narratives
- Lifecycle: **Proposed → Accepted (creates task) OR Dismissed**
- Has `ConsensusText` (narrative), `ConfidenceScore` (0-100)
- Can be generated from alerts (`SourceAlertId`)
- **Current**: Uses legacy `IAIService.AnalyzePortfolioAsync()` (placeholder)
- Accept creates a `UserTask` automatically
- Validation framework stubbed (`IAdviceValidator`)

**3. Tasks System** (`UserTask` model)
- Action items for user to complete
- Created when Advice is accepted
- Has provenance tracking: `SourceAlertId`, `SourceAdviceId`, `SourceType`
- Types: GoalAdjustment, AccountReview, PortfolioRebalance, etc.
- Priorities: Low, Medium, High, Urgent

**4. New Dual AI System** (Wave 7)
- `IAIFinancialAdvisor` - Claude (conservative) + Gemini (aggressive)
- `ConsensusEngine` - Agreement scoring, common/divergent recommendations
- `DualAIAdvisor` - Orchestration with parallel calls
- Returns: `ConsensusResult` with both perspectives

---

## Target Architecture - Unified AI Intelligence Engine

### Vision: Continuous AI Advisor

**Your Goal**: AI acts like a human financial advisor:
1. **Continuously monitors** user's complete financial profile
2. **Analyzes market conditions** (securities, crypto, currencies, opportunities)
3. **Reads financial news** and understands world events (COVID, recessions, policy changes)
4. **Remembers past interactions** and advice given ("you just moved to gold yesterday")
5. **Spots improvement areas** (rebalancing, cash optimization, risk alignment, TSP allocation)
6. **Generates advice** only when necessary (not spam, context-aware)
7. **Creates actionable items** that can be accepted/declined
8. **Conversational chatbot** with full context of user's finances AND memory of past conversations

---

## Advanced AI Features

### Feature 1: Financial News & Market Context Awareness

**Problem**: AI needs to understand market events (COVID crash, rate hikes, geopolitical events) to give contextual advice.

**Solution: News Ingestion & Summarization Pipeline**

```
┌─────────────────────────────────────────┐
│  News Aggregation Service (Background)  │
│  - RSS feeds: WSJ, Bloomberg, Reuters   │
│  - APIs: NewsAPI, Alpha Vantage News    │
│  - Government: Fed announcements, CPI    │
│  - Crypto: CoinDesk, Decrypt            │
└────────────────┬────────────────────────┘
                 │ Hourly/Daily
                 ▼
┌─────────────────────────────────────────┐
│  AI News Summarizer                     │
│  - Gemini 1.5 Pro (2M token context!)   │
│  - Batch 50-100 articles                │
│  - Extract: Market sentiment, events,   │
│    policy changes, sector impacts       │
│  - Output: Structured daily digest      │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│  Store in MarketContext table           │
│  - Date, Summary, Sentiment, Impact     │
│  - Events: [COVID, Rate hike, etc]      │
│  - Sectors affected: [Tech, Energy]     │
│  - Rolling 90-day window                │
└─────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│  AI Advisor reads MarketContext         │
│  When analyzing user portfolio          │
└─────────────────────────────────────────┘
```

**Data Model:**

```csharp
public class MarketContext
{
    public int MarketContextId { get; set; }
    public DateTime ContextDate { get; set; }
    public string DailySummary { get; set; } = string.Empty; // AI-generated digest
    public string MarketSentiment { get; set; } = "Neutral"; // Bullish/Bearish/Neutral/Volatile
    public List<string> MajorEvents { get; set; } = new(); // JSON: ["Fed rate hike", "Inflation data"]
    public List<string> AffectedSectors { get; set; } = new(); // JSON: ["Technology", "Energy"]
    public decimal SPYChange { get; set; } // % change
    public decimal VIXLevel { get; set; } // Volatility index
    public string? CryptoSentiment { get; set; }
    public string? TreasuryYield10Y { get; set; }
    public DateTime GeneratedAt { get; set; }
    public int TokensUsed { get; set; }
    public decimal GenerationCost { get; set; }
}
```

**Example Context Injection:**

```
System Prompt: You are a financial advisor analyzing portfolios.

CURRENT MARKET CONTEXT (Last 30 days):
- Date: March 15, 2020
- Sentiment: HIGHLY BEARISH (COVID-19 pandemic)
- S&P 500: -30% from Feb highs
- VIX: 82 (extreme fear)
- Major Events: Global pandemic, lockdowns, Fed emergency rate cuts to 0%
- Summary: Market experiencing historic selloff due to COVID-19 pandemic, not 
  fundamental economic weakness. Flight to safety in treasuries. Likely buying 
  opportunity for long-term investors if recession avoided.

USER PROFILE: [age 35, risk tolerance: moderate, 30yr horizon...]

Based on this context, the AI should recognize:
- This is a PANIC SELL, not structural collapse
- Young user with long horizon = buying opportunity
- Don't recommend selling, recommend DCA into dip
```

### Feature 2: AI Conversational Memory

**Problem**: AI needs to remember past advice, user decisions, and conversation history to be coherent.

**Solution: Multi-Layer Memory System**

#### Layer 1: Short-Term Conversation Memory (Chat History)

```csharp
public class AIConversation
{
    public int ConversationId { get; set; }
    public int UserId { get; set; }
    public DateTime StartedAt { get; set; }
    public DateTime? EndedAt { get; set; }
    public string ConversationType { get; set; } = "Chat"; // Chat, Analysis, Support
    public List<AIMessage> Messages { get; set; } = new(); // JSON array
    public string? ConversationSummary { get; set; } // AI-generated summary when ended
    public int TotalTokensUsed { get; set; }
    public decimal TotalCost { get; set; }
}

public class AIMessage
{
    public int MessageId { get; set; }
    public int ConversationId { get; set; }
    public string Role { get; set; } = "user"; // user, assistant, system
    public string Content { get; set; } = string.Empty;
    public DateTime SentAt { get; set; }
    public string? ModelUsed { get; set; } // Which AI generated this
    public int? TokensUsed { get; set; }
}
```

#### Layer 2: Medium-Term Action Memory (What user did recently)

```csharp
public class AIActionMemory
{
    public int ActionMemoryId { get; set; }
    public int UserId { get; set; }
    public DateTime ActionDate { get; set; }
    public string ActionType { get; set; } = string.Empty; // "AccountRebalance", "CashMove", "TSPChange"
    public string ActionSummary { get; set; } = string.Empty; // "Moved $10K from checking to HYSA"
    public int? SourceAdviceId { get; set; } // If from AI advice
    public int? SourceAlertId { get; set; }
    public string? AccountsAffected { get; set; } // JSON: ["Checking", "Savings"]
    public decimal? AmountMoved { get; set; }
    public string? AssetClass { get; set; } // "Cash", "Stocks", "Bonds", "Gold"
    public DateTime ExpiresAt { get; set; } // When this memory becomes "stale" (30-90 days)
    public bool IsSignificant { get; set; } // Should AI always consider this?
}
```

#### Layer 3: Long-Term Profile Memory (User preferences, patterns)

```csharp
public class AIUserMemory
{
    public int UserMemoryId { get; set; }
    public int UserId { get; set; }
    public string MemoryType { get; set; } = string.Empty; // "Preference", "Pattern", "Goal"
    public string MemoryKey { get; set; } = string.Empty; // "risk_comfort", "prefers_conservative"
    public string MemoryValue { get; set; } = string.Empty; // "Uncomfortable with crypto"
    public string? Context { get; set; } // When/how this was learned
    public int ConfidenceScore { get; set; } = 50; // 0-100, strengthens with repeated signals
    public DateTime LearnedAt { get; set; }
    public DateTime LastReinforcedAt { get; set; }
    public int ReinforcementCount { get; set; } = 1;
    public bool IsActive { get; set; } = true; // Can be deprecated
}
```

**Memory Context Injection Example:**

```
ADVISOR MEMORY ABOUT USER:

RECENT ACTIONS (Last 30 days):
- [5 days ago] Moved $15K from checking to high-yield savings (Following your advice)
- [12 days ago] Rebalanced portfolio: Sold 5% bonds, bought 5% stocks
- [25 days ago] Increased TSP contribution from 5% to 8%

LEARNED PREFERENCES:
- Risk comfort: Moderate-aggressive (confidence: 85%)
- Prefers ETFs over individual stocks (confidence: 70%)
- Uncomfortable with crypto investments (confidence: 90%)
- Prioritizes tax efficiency (confidence: 75%)

CONVERSATION HISTORY (Last chat 3 days ago):
User: "Should I invest more in international stocks?"
Assistant: "Given your moderate-aggressive profile and recent domestic gains, 
adding 10-15% international exposure could improve diversification..."
User: "I'll think about it"
[No action taken yet - don't push too hard today]

⚠️ IMPORTANT CONTEXT:
- User just made 3 significant moves in past 30 days
- Good advisor would suggest "Let things settle" for 2-3 weeks
- Don't recommend major portfolio changes unless urgent
```

### Feature 3: Smart Advice Throttling (Don't Spam)

**Rules Engine:**

```csharp
public class AIAdviceThrottler
{
    public bool ShouldGenerateAdvice(int userId, string adviceType)
    {
        // Rule 1: No advice of same type within 14 days
        var recentSimilar = GetRecentAdvice(userId, adviceType, days: 14);
        if (recentSimilar.Any()) return false;
        
        // Rule 2: No more than 3 pieces of advice per week
        var thisWeek = GetAdviceThisWeek(userId);
        if (thisWeek.Count >= 3) return false;
        
        // Rule 3: User just took action? Wait for "hold period"
        var recentActions = GetRecentActions(userId, days: 14);
        if (recentActions.Any(a => a.IsSignificant)) return false;
        
        // Rule 4: Check if finding is significant enough
        var threshold = GetImpactThreshold(userId); // Based on portfolio size
        if (finding.ImpactScore < threshold) return false;
        
        return true;
    }
}
```

---

## Proposed Integration Pattern

### Flow 1: Periodic AI Analysis (Automated Discovery)

```
┌─────────────────────────────────────────┐
│  Scheduled Job (Daily/Weekly)           │
│  OR Manual Trigger (/api/ai/analyze)    │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│  AI Intelligence Engine                 │
│  - DualAIAdvisor.AnalyzeUserProfile()   │
│  - Reads FULL financial profile         │
│  - Checks market data, TSP, accounts    │
│  - Runs analysis prompts:               │
│    • Cash optimization                  │
│    • Portfolio rebalancing              │
│    • Risk alignment                     │
│    • TSP allocation review              │
│    • Tax optimization                   │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│  Generate Findings                      │
│  - ConsensusResult for each area        │
│  - Filter: Only significant findings    │
│  - Score impact (0-100)                 │
└────────────────┬────────────────────────┘
                 │
     ┌───────────┴───────────┐
     │                       │
     ▼                       ▼
┌─────────────┐      ┌─────────────────┐
│ Create      │      │ Create          │
│ ALERTS      │      │ ADVICE          │
│             │      │                 │
│ High-impact │      │ Actionable recs │
│ urgent items│      │ with reasoning  │
└─────────────┘      └─────────────────┘
```

### Flow 2: Alert → Advice Conversion (User-Initiated)

```
┌─────────────────────────────────────────┐
│  User sees Alert in dashboard           │
│  "You have $50K in checking account"    │
│  Severity: Medium, Impact: 75           │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│  User clicks "Get AI Recommendation"    │
│  POST /api/advice/from-alert/{alertId}  │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│  DualAIAdvisor analyzes specific issue  │
│  - Claude: Conservative cash strategy   │
│  - Gemini: Aggressive optimization      │
│  - Consensus: Balanced recommendation   │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│  Create Advice record                   │
│  - Status: Proposed                     │
│  - ConsensusText: Full recommendation   │
│  - SourceAlertId: Link to original      │
│  - ConfidenceScore: From consensus      │
│  - Theme: "CashOptimization"            │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│  User sees dual AI perspectives         │
│  Can Accept (creates task) or Dismiss   │
└─────────────────────────────────────────┘
```

### Flow 3: Conversational Chatbot (User-Initiated Q&A)

```
┌─────────────────────────────────────────┐
│  User opens AI Chatbot                  │
│  "Should I increase my TSP contribution?"│
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│  POST /api/ai/chat                      │
│  {                                      │
│    userId: 1,                           │
│    message: "...",                      │
│    includeContext: true                 │
│  }                                      │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│  Build Context Prompt                   │
│  - User profile (age, goals, risk)      │
│  - Current accounts & balances          │
│  - TSP allocation & contribution        │
│  - Recent transactions                  │
│  - Active goals                         │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│  DualAIAdvisor.GetChatResponseAsync()   │
│  - Both advisors answer with context    │
│  - Consensus if they agree              │
│  - Both perspectives if they disagree   │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│  Return chat response                   │
│  - Conversational answer                │
│  - Option to "Convert to Advice" if     │
│    actionable recommendation given      │
└─────────────────────────────────────────┘
```

---

## Recommended Service Architecture

### 1. New `AIIntelligenceService` (Orchestrator)

```csharp
public interface IAIIntelligenceService
{
    // Periodic analysis
    Task<AIAnalysisResult> AnalyzeUserFinancesAsync(int userId);
    
    // Specific area analysis
    Task<ConsensusResult> AnalyzeCashOptimizationAsync(int userId);
    Task<ConsensusResult> AnalyzePortfolioRebalancingAsync(int userId);
    Task<ConsensusResult> AnalyzeTSPAllocationAsync(int userId);
    Task<ConsensusResult> AnalyzeRiskAlignmentAsync(int userId);
    
    // Alert-to-Advice conversion
    Task<Advice> GenerateAdviceFromAlertAsync(int alertId, int userId);
    
    // Chatbot with memory
    Task<ConsensusResult> GetChatResponseAsync(int userId, string message, int? conversationId = null);
    Task<AIConversation> StartConversationAsync(int userId);
    Task<AIConversation> EndConversationAsync(int conversationId);
    
    // Memory management
    Task RecordUserActionAsync(int userId, AIActionMemory action);
    Task<AIUserMemory> LearnUserPreferenceAsync(int userId, string key, string value, string context);
    Task<string> BuildMemoryContextAsync(int userId); // For prompt injection
    
    // Decision: Should we generate alert/advice?
    bool ShouldGenerateAlert(ConsensusResult result);
    bool ShouldGenerateAdvice(ConsensusResult result, int userId);
}

public class AIAnalysisResult
{
    public int UserId { get; set; }
    public List<ConsensusResult> Findings { get; set; } = new();
    public List<Alert> GeneratedAlerts { get; set; } = new();
    public List<Advice> GeneratedAdvice { get; set; } = new();
    public DateTime AnalyzedAt { get; set; }
    public decimal TotalCost { get; set; }
}
```

### 2. Update `AdviceService` to use Dual AI

**Current**: Uses `IAIService.AnalyzePortfolioAsync()` (old placeholder)  
**New**: Use `IDualAIAdvisor` for all advice generation

```csharp
public class AdviceService : IAdviceService
{
    private readonly IDualAIAdvisor _dualAI;
    private readonly IAIIntelligenceService _intelligence;
    
    public async Task<Advice> GenerateBasicAdviceAsync(int userId)
    {
        // Use new AI intelligence engine
        var analysis = await _intelligence.AnalyzeUserFinancesAsync(userId);
        
        // Convert primary finding to Advice
        var primaryFinding = analysis.Findings
            .OrderByDescending(f => f.AgreementScore)
            .FirstOrDefault();
            
        if (primaryFinding == null)
        {
            return CreateFallbackAdvice(userId);
        }
        
        return CreateAdviceFromConsensus(userId, primaryFinding, null);
    }
    
    public async Task<Advice> GenerateAdviceFromAlertAsync(int alertId, int userId, bool includeSnapshot = true)
    {
        // NEW: Use AI intelligence service
        return await _intelligence.GenerateAdviceFromAlertAsync(alertId, userId);
    }
}
```

### 3. New `AIIntelligenceController`

```csharp
[ApiController]
[Route("api/ai")]
public class AIIntelligenceController : ControllerBase
{
    private readonly IAIIntelligenceService _intelligence;
    private readonly IDualAIAdvisor _dualAI;
    
    // Manual trigger for full analysis
    [HttpPost("analyze/{userId}")]
    public async Task<ActionResult<AIAnalysisResult>> AnalyzeUser(int userId)
    {
        var result = await _intelligence.AnalyzeUserFinancesAsync(userId);
        return Ok(result);
    }
    
    // Specific area analysis
    [HttpPost("analyze/{userId}/cash-optimization")]
    public async Task<ActionResult<ConsensusResult>> AnalyzeCash(int userId)
    {
        var result = await _intelligence.AnalyzeCashOptimizationAsync(userId);
        return Ok(result);
    }
    
    [HttpPost("analyze/{userId}/portfolio-rebalancing")]
    public async Task<ActionResult<ConsensusResult>> AnalyzeRebalancing(int userId)
    {
        var result = await _intelligence.AnalyzePortfolioRebalancingAsync(userId);
        return Ok(result);
    }
    
    [HttpPost("analyze/{userId}/tsp-allocation")]
    public async Task<ActionResult<ConsensusResult>> AnalyzeTSP(int userId)
    {
        var result = await _intelligence.AnalyzeTSPAllocationAsync(userId);
        return Ok(result);
    }
    
    // Chatbot endpoint
    [HttpPost("chat")]
    public async Task<ActionResult<ConsensusResult>> Chat([FromBody] ChatRequest request)
    {
        var result = await _intelligence.GetChatResponseAsync(
            request.UserId, 
            request.Message, 
            request.IncludeContext);
        return Ok(result);
    }
    
    // Convert chat response to advice (if actionable)
    [HttpPost("chat/convert-to-advice")]
    public async Task<ActionResult<Advice>> ConvertChatToAdvice([FromBody] ConvertChatRequest request)
    {
        // Create Advice from chat consensus result
        var advice = await _intelligence.CreateAdviceFromChatAsync(
            request.UserId, 
            request.ConsensusId);
        return Ok(advice);
    }
}
```

---

## Data Model Enhancements

### Advice Model - Add AI Fields

```csharp
public class Advice
{
    // ... existing fields ...
    
    // NEW: Dual AI tracking
    public string? ConservativeRecommendation { get; set; }  // Claude's perspective
    public string? AggressiveRecommendation { get; set; }    // Gemini's perspective
    public decimal AgreementScore { get; set; }              // 0.0 to 1.0
    public bool HasConsensus { get; set; }
    public string? ConservativeModel { get; set; }           // "claude-3-5-sonnet-20241022"
    public string? AggressiveModel { get; set; }             // "gemini-1.5-pro-latest"
    public decimal AIGenerationCost { get; set; }            // Track spend
    public int TotalTokensUsed { get; set; }
    
    // Enhanced generation tracking
    public string? AnalysisType { get; set; }  // "CashOptimization", "Rebalancing", "TSP", "Risk", "Chat"
}
```

### Alert Model - Add AI Trigger Info

```csharp
public class Alert
{
    // ... existing fields ...
    
    // NEW: AI generation tracking
    public bool GeneratedByAI { get; set; }
    public string? AIGenerationSource { get; set; }  // "PeriodicAnalysis", "ManualTrigger"
    public DateTime? AIAnalyzedAt { get; set; }
}
```

---

## Implementation Phases

### Phase 7.1 ✅ COMPLETE
- [x] Dual AI service foundation (Claude + Gemini)
- [x] Consensus engine
- [x] Configuration and DI wiring

### Phase 7.2 (Current) - AI Intelligence Engine Core
- [ ] Create `AIIntelligenceService`
- [ ] Implement full user profile analysis
- [ ] Add specific analysis methods (cash, rebalancing, TSP, risk)
- [ ] Create `AIIntelligenceController` with endpoints
- [ ] Update `AdviceService` to use new AI system
- [ ] Add data model migrations for new fields

### Phase 7.3 - AI Memory System
- [ ] Create `AIConversation`, `AIMessage` models (chat history)
- [ ] Create `AIActionMemory` model (recent user actions)
- [ ] Create `AIUserMemory` model (learned preferences)
- [ ] Implement `AIMemoryService` for memory CRUD
- [ ] Build memory context builders for prompt injection
- [ ] Add memory recording on Advice acceptance/dismissal
- [ ] Track portfolio changes as action memories
- [ ] Implement memory expiration/deprecation logic

### Phase 7.4 - Market Context & News Ingestion
- [ ] Create `MarketContext` model (daily market digest)
- [ ] Implement `NewsAggregationService`
  - [ ] RSS feed integration (WSJ, Bloomberg, Reuters)
  - [ ] NewsAPI integration
  - [ ] Fed announcements scraper
  - [ ] Crypto news feeds
- [ ] Build AI news summarizer (Gemini 2M context)
- [ ] Create background job for daily news digest generation
- [ ] Implement market context retrieval (rolling 90-day window)
- [ ] Add market context to AI prompts

### Phase 7.5 - Prompt Engineering & Context Building
- [ ] Create structured prompts for each analysis type
- [ ] Build `AIContextBuilder` service
  - [ ] User profile context
  - [ ] Market context injection
  - [ ] Memory context injection (recent actions, preferences)
  - [ ] TSP-specific context
- [ ] Create chatbot system prompts with memory
- [ ] Implement "hold period" awareness (recent action = suggest hold)

### Phase 7.6 - Smart Advice Throttling
- [ ] Create `AIAdviceThrottler` service
- [ ] Implement throttling rules:
  - [ ] Same advice type cooldown (14 days)
  - [ ] Weekly advice limit (3 max)
  - [ ] Post-action hold period (14-30 days)
  - [ ] Impact threshold filtering
- [ ] Add throttle checks before generating advice
- [ ] Create admin override for testing

### Phase 7.7 - Scheduled Analysis Job
- [ ] Create background job for periodic analysis
- [ ] Integrate throttling and memory checks
- [ ] Add cost tracking and budgets
- [ ] Create admin dashboard for AI monitoring
- [ ] Add news digest generation job

### Phase 7.8 - Chatbot with Memory
- [ ] Chat conversation management
- [ ] Multi-turn conversation context
- [ ] "Convert to Advice" workflow
- [ ] Memory learning from chat interactions
- [ ] Chat UI component with history

### Phase 7.6 - UI Components
- [ ] `AIInsightCard` - Dual perspective display
- [ ] `ConsensusViewer` - Agreement/disagreement UI
- [ ] `AIChatbot` - Conversational interface
- [ ] Enhanced Advice panel with AI details
- [ ] Enhanced Alerts panel with "Get AI Recommendation"

---

## Key Design Decisions

### 1. Advice vs Alerts - When to Create Which?

**Create Alert when:**
- Immediate attention needed (high severity)
- Portfolio drift detected
- Goal off-track
- Security/fraud concern
- Time-sensitive opportunity

**Create Advice when:**
- Complex recommendation needed
- Multiple options to consider
- Requires user decision
- Generates from Alert (user requests elaboration)
- Chatbot conversation becomes actionable

### 2. When to Generate AI Content?

**Continuous/Scheduled:**
- Daily portfolio health check
- Weekly deep analysis (cash, rebalancing, goals)
- Market event triggers (big moves, rate changes)

**User-Initiated:**
- Manual "Analyze Now" button
- Alert → Advice conversion
- Chatbot queries

**Smart Filtering:**
- Don't generate advice if recent similar advice exists
- Don't alert unless impact score > threshold
- Batch similar findings into single advice

### 3. Cost Management

**Current estimate**: $20-100/month for 100 users  
**Per analysis**: ~$0.10-0.50 depending on complexity  
**News digest**: ~$0.50-1.00/day (batch summarization with Gemini)
**Chat**: ~$0.05-0.20 per message pair (with memory context)

**Monthly Projection (100 users):**
- Periodic analysis: $30-50/month (throttled to essential)
- News digests: $15-30/month (daily)
- Chat: $10-40/month (varies by engagement)
- Memory operations: $5-10/month (lightweight)
- **Total: $60-130/month** (premium tier AI)

**Strategy:**
- Cache analysis results (24h for non-critical)
- Only re-analyze if significant data changes OR significant market events
- Throttle advice generation (rules engine)
- Limit chatbot to 20 messages/day per user (free tier)
- News digest runs once daily (batch efficient)
- Memory context only includes relevant recent items (not full history)
- Use cheaper models for simple queries
- Premium tier for unlimited AI access + priority analysis

---

---

## Technology Stack for Advanced Features

### News Aggregation
- **NewsAPI** (newsapi.org) - $449/month for commercial, 250K requests
  - Alternative: Free RSS feeds + manual parsing
- **Alpha Vantage News API** (free tier: 25 calls/day)
- **Custom RSS parser** for WSJ, Bloomberg, Reuters, Fed
- **Gemini 1.5 Pro** for summarization (2M token context = 50-100 articles/batch)

### Memory Storage
- **PostgreSQL JSONB columns** for flexible memory structures
- **Vector embeddings** (future Phase 8) for semantic memory search
  - Store conversation embeddings to find similar past discussions
  - "You asked about gold 3 months ago, here's what we discussed..."

### Prompt Engineering
- **LangChain patterns** for context window management
- **Structured outputs** (JSON mode) for parsing AI responses
- **Few-shot examples** in system prompts for consistency

### Background Jobs
- **.NET Hosted Services** for periodic tasks
- **Hangfire** (optional) for advanced scheduling
- **Cron expressions** for daily news digest (2am), weekly analysis (Sunday)

---

## Security & Privacy Considerations

### Memory Data
- ✅ User memory stays private (never shared across users)
- ✅ Conversation history encrypted at rest
- ✅ Memory expiration policies (90 days for action memory, 1 year for preferences)
- ✅ User can view/delete their AI memory ("Forget this preference")

### News Context
- ✅ Market context shared across all users (not personalized)
- ✅ No user PII in news summarization prompts
- ✅ News data public domain (no proprietary content stored long-term)

### Cost Controls
- ✅ Per-user daily AI budget limits
- ✅ Rate limiting on chat endpoints
- ✅ Admin alerts when monthly budget exceeded
- ✅ Graceful degradation (use cached/stale data if budget tight)

---

## Example: Full AI Flow with All Features

```
┌─────────────────────────────────────────────────────────────┐
│ Background: Daily News Digest (2am)                         │
│ - Fetch 100 financial news articles                         │
│ - Gemini summarizes: "Fed held rates, tech sector up 2%,    │
│   oil down 3% on oversupply concerns"                       │
│ - Store as MarketContext for 2024-10-28                     │
└─────────────────────────────────────────────────────────────┘

                            ⬇️

┌─────────────────────────────────────────────────────────────┐
│ User: Opens dashboard (9am)                                  │
└─────────────────────────────────────────────────────────────┘

                            ⬇️

┌─────────────────────────────────────────────────────────────┐
│ Periodic Analysis Check (triggered weekly)                   │
│ - Load user financial profile                               │
│ - Load market context (last 30 days)                        │
│ - Load AI memory: "User moved $10K to HYSA 5 days ago"      │
│ - Check throttle rules: ✅ OK to analyze                     │
└─────────────────────────────────────────────────────────────┘

                            ⬇️

┌─────────────────────────────────────────────────────────────┐
│ DualAIAdvisor: Analyze Cash Optimization                     │
│                                                              │
│ PROMPT INCLUDES:                                             │
│ - User: Age 35, $150K salary, $50K in checking              │
│ - Market: "Rates stable, HYSA yielding 4.5%"                │
│ - Memory: "Just moved $10K to HYSA 5 days ago"              │
│ - Preference: "User prefers low-risk cash moves"            │
│                                                              │
│ Claude: "Still have $40K excess. Consider moving $20K more   │
│         to HYSA, but given recent move, suggest waiting      │
│         2-3 weeks to see rate stability."                    │
│                                                              │
│ Gemini: "Rates at 4.5% are excellent. Move remaining $40K    │
│         immediately to maximize return. No reason to wait."  │
│                                                              │
│ Consensus: 60% agreement (DISAGREEMENT)                      │
└─────────────────────────────────────────────────────────────┘

                            ⬇️

┌─────────────────────────────────────────────────────────────┐
│ Decision: Generate Advice? Check Rules                       │
│ - Recent cash advice? NO (last was 30 days ago) ✅            │
│ - Advice limit this week? 1/3 ✅                              │
│ - Recent action? YES (5 days ago) ⚠️                          │
│   - But impact high ($40K potential) → OVERRIDE ✅            │
│                                                              │
│ GENERATE ADVICE ✅                                            │
└─────────────────────────────────────────────────────────────┘

                            ⬇️

┌─────────────────────────────────────────────────────────────┐
│ Create Advice Record                                         │
│ - ConsensusText: "Advisors disagree on timing..."           │
│ - ConservativeRecommendation: "Wait 2-3 weeks..."           │
│ - AggressiveRecommendation: "Move all $40K now..."          │
│ - AgreementScore: 0.6                                        │
│ - HasConsensus: false                                        │
└─────────────────────────────────────────────────────────────┘

                            ⬇️

┌─────────────────────────────────────────────────────────────┐
│ User: Sees advice in dashboard, clicks "Accept Claude's rec"│
│ - Creates task: "Review HYSA rates in 2 weeks"              │
│ - Records action memory: "User chose conservative approach" │
│ - Updates user memory: Reinforce "prefers_cautious_timing"  │
└─────────────────────────────────────────────────────────────┘

                            ⬇️

┌─────────────────────────────────────────────────────────────┐
│ 3 Days Later: User opens chatbot                            │
│ User: "Should I look at CDs instead of HYSA?"                │
│                                                              │
│ PROMPT INCLUDES:                                             │
│ - Market: "Rates stable at 4.5%"                            │
│ - Recent advice: "Recommended waiting on HYSA move"          │
│ - Action memory: "User moved $10K to HYSA 8 days ago"       │
│ - Conversation: (new conversation, no history)              │
│                                                              │
│ Response: "Great question! Given we just moved $10K to       │
│           HYSA last week and advised waiting 2-3 weeks,      │
│           let's see how rates develop before locking in.     │
│           CDs are less flexible. HYSA gives you 4.5%         │
│           with liquidity. I'd suggest revisiting CDs in      │
│           2 weeks if rates haven't changed."                 │
│                                                              │
│ ✅ AI REMEMBERED recent action and advice!                   │
└─────────────────────────────────────────────────────────────┘
```

---

## Next Steps

**Phase 7.2 Tasks** (Current Priority):
1. Create database models: `MarketContext`, `AIConversation`, `AIMessage`, `AIActionMemory`, `AIUserMemory`
2. Build `AIIntelligenceService` with memory-aware analysis
3. Build `AIMemoryService` for managing all memory layers
4. Create `AIIntelligenceController` with memory endpoints
5. Update `AdviceService` to record action memories
6. Implement basic context builders (profile + market + memory)

**Want me to start implementing the core AI Intelligence Service with memory integration?**
