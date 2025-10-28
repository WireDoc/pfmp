# Wave 7 – Data Enrichment & Intelligence Foundations

**Status**: Planning  
**Target**: November 2025  
**Goal**: Enhance dashboard with richer financial data and prepare infrastructure for AI-powered intelligence engine

## Strategic Context

Looking at our roadmap:
- ✅ **Phase 1**: Onboarding MVP - Complete
- ✅ **Phase 1.5**: Navigation & Dashboard Polish - Complete (Wave 6)
- 📋 **Phase 2**: Data Aggregation & Account Connectivity - Planned
- 🎯 **Phase 3**: Intelligence & Advice Engine (Dual AI Pipeline) - **CRITICAL FEATURE**

**Decision**: Wave 7 will focus on **hybrid approach** - implement foundational data enrichment from Phase 2 WHILE beginning Phase 3 dual AI pipeline infrastructure. This allows us to:
1. Improve dashboard data quality immediately
2. Start building AI capabilities in parallel
3. Have real data for AI to analyze when ready

## Wave 7 Objectives

### Primary Goal
Build the foundation for AI-powered financial intelligence by enriching data sources and establishing the dual AI pipeline architecture.

### Secondary Goals
- Enhance dashboard with calculated metrics (asset allocation, category breakdowns)
- Implement data quality validation
- Establish AI service abstraction layer
- Create prompt engineering framework

## 🎯 AI Model Selection - Premium Tier

### Chosen Configuration: Claude + Gemini "Advisory Team"

After evaluation, we're using **top-tier flagship models** for maximum intelligence:

**Conservative Advisor: Claude 3.5 Sonnet** (Upgrade Path: → Opus 3.5)
- Provider: Anthropic (anthropic.com)
- Current Model: `claude-3-5-sonnet-20241022` (Latest: December 2024)
- **Upgrade Path**: Claude Opus 3.5 when available (Expected: 2025)
- Strengths: Superior reasoning, safety, nuanced financial analysis, enterprise-grade reliability, constitutional AI
- Pricing: $3/MTok input, $15/MTok output (Sonnet) | Expected $15/$75 (Opus)
- Context: 200K tokens
- Use Case: Risk assessment, retirement planning, conservative rebalancing, regulatory compliance, ethical guidance

**Aggressive Advisor: Gemini 2.0+ Pro** (Cutting Edge)
- Provider: Google AI (ai.google.dev or Vertex AI)
- Current Model: `gemini-1.5-pro-latest` (Production: 2024)
- **Upgrade Path**: Gemini 2.0 Pro (Available: Jan 2025) → Gemini 2.5 Pro → Gemini 3.0 (Rumored)
- Strengths: Cutting-edge analysis, multimodal capabilities, massive context (2M tokens), native grounding, real-time data
- Pricing: $1.25/MTok input, $5/MTok output (AI Studio) | $3.50/$10.50 (Vertex AI)
- Context: 2M tokens (1M effective)
- Use Case: Growth opportunities, tax optimization, aggressive strategies, market trend analysis, multimodal financial documents

### Cost Projection (100 active users/month) - Premium Tier

- Claude 3.5 Sonnet: ~5K requests × 1K tokens avg × $3-15/MTok = **$15-75/month**
  - If upgraded to Opus 3.5: ~5K requests × 1K tokens × $15-75/MTok = **$75-375/month**
- Gemini 1.5/2.0 Pro: ~5K requests × 1K tokens avg × $1.25-5/MTok = **$6-25/month**
- **Current Total: $20-100/month** (Sonnet + Gemini)
- **Future Total (Opus + Gemini 2.5+): $80-400/month** for premium-tier intelligence
- Quality Justification: Top-tier models = better advice = more user value = higher retention
- Can scale to 500+ users with current config, 100-200 users with Opus upgrade before optimization needed

### Why This Configuration?

**Claude as Conservative Advisor:**
- Known for careful, thoughtful financial reasoning
- Strong safety guardrails prevent risky recommendations
- Excellent at explaining trade-offs
- Constitutional AI aligns with fiduciary standards

**Gemini as Aggressive Advisor:**
- Access to latest cutting-edge capabilities (2.0/2.5/3.0)
- Massive 2M token context for complex scenarios
- Multimodal support for future document analysis
- Native grounding for real-time market data
- Cost-effective for high-volume analysis

**Consensus Mechanism:**
- When both agree: High confidence recommendation
- When they disagree: Present both perspectives, let user decide
- Conservative tie-breaker: Default to Claude for safety

## Scope

### Track 1: Data Enrichment (Phase 2 Foundation - 40%)

#### 1. Calculated Financial Metrics
**Goal**: Move beyond raw data to meaningful insights

- **Asset Allocation Calculator**
  - Calculate portfolio breakdown by asset class (stocks, bonds, cash, real estate, alternatives)
  - Show target vs actual allocation
  - Flag significant drifts (>5% from target)
  - Visualize with pie/donut charts

- **Net Worth History Tracking**
  - Store daily/weekly snapshots of net worth
  - Calculate trends (7-day, 30-day, YTD, 1-year)
  - Show percentage changes
  - Power sparkline charts with real historical data

- **Category Breakdowns**
  - Expense categorization and totals
  - Income source breakdown
  - Liability breakdown (mortgage, student loans, credit cards)
  - Tax withholding vs estimated liability

- **Emergency Fund Ratio**
  - Calculate months of expenses covered
  - Flag if below 3-6 month target
  - Track progress over time

#### 2. Data Quality & Validation
**Goal**: Ensure data integrity before AI analysis

- **Data Completeness Checker**
  - Identify missing critical data points
  - Flag stale data (accounts not updated >30 days)
  - Validate data consistency (e.g., total assets = sum of accounts)
  - Generate data quality score

- **Anomaly Detection (Rule-Based)**
  - Flag unusual account balance changes (>20% day-over-day)
  - Detect negative cash balances
  - Identify duplicate accounts/transactions
  - Alert on missing expected data

### Track 2: AI Intelligence Foundation (Phase 3 Start - 60%)

#### 3. Dual AI Service Architecture
**Goal**: Establish infrastructure for Azure OpenAI + Anthropic consensus model

- **AI Service Abstraction Layer**
  ```csharp
  public interface IAIFinancialAdvisor
  {
      Task<AIRecommendation> GetRetirementAdvice(UserProfile profile);
      Task<AIRecommendation> GetRebalancingAdvice(Portfolio portfolio);
      Task<AIRecommendation> GetTaxOptimization(TaxProfile tax);
      Task<ConsensusResult> GetConsensusRecommendation(string prompt);
  }
  
  public class DualAIAdvisor : IAIFinancialAdvisor
  {
      private readonly ClaudeService _claudeAI;      // Conservative advisor
      private readonly GeminiService _geminiAI;      // Aggressive advisor
      private readonly ConsensusEngine _consensus;
  }
  ```

- **Anthropic Claude Integration** (Conservative Advisor)
  - Configure Anthropic API connection (anthropic.com)
  - Implement Claude 3.5 Sonnet calls (`claude-3-5-sonnet-20241022`)
  - Plan upgrade path to Opus 3.5 when available
  - Add retry logic and error handling
  - Rate limiting and cost tracking ($3/$15 per MTok)
  - Maximum 4000 tokens output for detailed analysis

- **Google Gemini Integration** (Aggressive Advisor)
  - Configure Google AI API connection (ai.google.dev)
  - Implement Gemini 1.5 Pro calls (`gemini-1.5-pro-latest`)
  - Monitor for Gemini 2.0/2.5/3.0 upgrades
  - Parallel Claude calls for latency optimization
  - Error handling and fallbacks
  - Cost tracking ($1.25/$5 per MTok)
  - Leverage 2M token context for complex scenarios

- **Consensus Mechanism**
  - Compare responses from both models
  - Score agreement levels
  - Confidence threshold enforcement
  - Tie-breaking logic (default to more conservative)
  - Logging and audit trail

#### 4. Prompt Engineering Framework
**Goal**: Create reusable, testable prompts for financial advice

- **Prompt Templates**
  ```
  prompts/
  ├── retirement/
  │   ├── monte-carlo-analysis.txt
  │   ├── withdrawal-strategy.txt
  │   └── tsp-allocation.txt
  ├── rebalancing/
  │   ├── portfolio-drift.txt
  │   └── reallocation-plan.txt
  ├── tax/
  │   ├── tax-loss-harvesting.txt
  │   └── roth-conversion.txt
  └── cash/
      ├── high-yield-optimization.txt
      └── emergency-fund.txt
  ```

- **Prompt Templating Engine**
  - Variable substitution for user data
  - Context injection (portfolio, goals, risk tolerance)
  - Output format specification (JSON schemas)
  - Version control for prompts

- **Safety Guards**
  - Minimum confidence threshold (80%)
  - Rule-based validation of AI output
  - Prohibited recommendations list
  - Disclaimer injection

#### 5. Initial AI Features (Beta)
**Goal**: Ship first AI-powered features to validate pipeline

- **Retirement Readiness Score**
  - AI analyzes current savings, age, goals
  - Provides 0-100 readiness score
  - Suggests specific actions to improve
  - Shows probability of success

- **Portfolio Health Check**
  - AI reviews current allocation
  - Flags risk concentration
  - Suggests rebalancing moves
  - Explains reasoning in plain English

- **Cash Optimization Recommendations**
  - Identifies idle cash in low-yield accounts
  - Suggests high-yield alternatives
  - Calculates potential earnings gain
  - Shows comparison charts

#### 6. AI Telemetry & Monitoring
**Goal**: Track AI performance and costs

- **Logging Infrastructure**
  - Log all AI requests/responses
  - Track consensus scores
  - Monitor confidence levels
  - Store for future fine-tuning

- **Cost Tracking**
  - Track API costs per model
  - Monitor token usage
  - Set budget alerts
  - Optimize expensive queries

- **Quality Metrics**
  - User acceptance rate of recommendations
  - Feedback collection
  - A/B testing framework
  - Model performance comparison

## Implementation Phases

### Phase 7.1: Foundations (Week 1-2)
**Goal**: Set up AI services and basic metrics

**Backend Tasks**:
- [ ] Create AI service interfaces and abstractions
- [ ] Set up Anthropic Claude client (claude-3-5-sonnet-20241022)
- [ ] Set up Google Gemini client (gemini-1.5-pro-latest)
- [ ] Configure API keys and authentication for both services
- [ ] Implement basic consensus mechanism (agreement scoring)
- [ ] Add asset allocation calculator service
- [ ] Create net worth history tracking
- [ ] Add cost tracking telemetry for both AI services

**Frontend Tasks**:
- [ ] Add asset allocation pie chart to dashboard
- [ ] Create net worth trend line chart
- [ ] Add data quality indicator component
- [ ] Create AI insight card component

**Testing**:
- [ ] Unit tests for AI service abstractions
- [ ] Integration tests with mock AI responses
- [ ] Test consensus mechanism edge cases

### Phase 7.2: AI Pipeline (Week 3-4)
**Goal**: Working end-to-end AI recommendations

**Backend Tasks**:
- [ ] Implement prompt template engine
- [ ] Create retirement readiness prompt
- [ ] Create portfolio health check prompt
- [ ] Implement safety guards and validation
- [ ] Add AI telemetry logging
- [ ] Create AI recommendation endpoints

**Frontend Tasks**:
- [ ] Build AI insights panel on dashboard
- [ ] Add "Retirement Readiness" card
- [ ] Add "Portfolio Health" card
- [ ] Add "Cash Optimization" card
- [ ] Implement loading states for AI queries
- [ ] Add feedback mechanism (helpful/not helpful)

**Testing**:
- [ ] End-to-end tests with real AI calls (dev only)
- [ ] Test prompt templating with various user profiles
- [ ] Validate consensus mechanism with disagreements
- [ ] Test safety guards reject bad recommendations

### Phase 7.3: Data Enrichment (Week 5-6)
**Goal**: Polish data quality and calculations

**Backend Tasks**:
- [ ] Implement data completeness checker
- [ ] Add anomaly detection rules
- [ ] Calculate category breakdowns
- [ ] Add emergency fund ratio calculation
- [ ] Create historical data snapshots job

**Frontend Tasks**:
- [ ] Add expense breakdown chart
- [ ] Add income source breakdown
- [ ] Add data quality dashboard section
- [ ] Show emergency fund progress
- [ ] Add data staleness warnings

**Testing**:
- [ ] Test calculation accuracy with various scenarios
- [ ] Validate anomaly detection rules
- [ ] Test historical data snapshots

### Phase 7.4: Polish & Documentation (Week 7)
**Goal**: Production-ready AI features

**Tasks**:
- [ ] Add comprehensive error handling
- [ ] Implement rate limiting
- [ ] Add cost tracking dashboard
- [ ] Write AI architecture documentation
- [ ] Create prompt engineering guide
- [ ] Document safety mechanisms
- [ ] Performance optimization
- [ ] Security review of AI data handling

## Technical Architecture

### AI Service Stack
```
Frontend
  ↓
API Controller (/api/intelligence/*)
  ↓
DualAIAdvisor Service
  ├─→ ClaudeService → Anthropic (Claude 3.5 Sonnet) [Conservative]
  ├─→ GeminiService → Google AI (Gemini 1.5 Pro+) [Aggressive]
  └─→ ConsensusEngine → Validate & Merge
        ↓
  SafetyGuards → Validate Output
        ↓
  RecommendationStore → Save to DB
        ↓
  Return to Frontend
```

### Data Flow
```
User Profile Data
  ↓
Calculated Metrics Service
  ├─→ Asset Allocation
  ├─→ Net Worth Trends
  ├─→ Category Breakdowns
  └─→ Risk Scores
        ↓
AI Prompt Builder
  ├─→ Inject User Context
  ├─→ Apply Template
  └─→ Format for AI
        ↓
Dual AI Pipeline
  ├─→ Azure OpenAI Call
  ├─→ Anthropic Call
  └─→ Consensus Scoring
        ↓
Dashboard Display
```

## Success Metrics

### Data Quality
- ✅ Asset allocation calculated for 100% of users with investments
- ✅ Net worth history tracked daily
- ✅ Data quality score >80% for test users
- ✅ Anomaly detection flags <5 false positives per user

### AI Performance
- ✅ Dual AI consensus achieved >90% of the time
- ✅ AI recommendations pass safety guards >95% of the time
- ✅ Response time <3 seconds for AI queries
- ✅ API costs <$1 per user per month

### User Experience
- ✅ Users see at least 3 AI-powered insights after onboarding
- ✅ AI recommendations specific and actionable
- ✅ Clear explanation of reasoning for each recommendation
- ✅ Positive feedback rate >70%

### Technical
- ✅ Zero AI service outages >5 minutes
- ✅ All AI calls logged for audit
- ✅ Prompt templates version controlled
- ✅ Cost tracking dashboard operational

## Risk Mitigation

### AI Risks
| Risk | Impact | Mitigation |
|------|--------|------------|
| Models disagree frequently | High | Implement tie-breaking logic, default to conservative |
| API costs exceed budget | Medium | Rate limiting, caching, cost alerts |
| AI provides bad advice | High | Safety guards, rule validation, confidence thresholds |
| Service downtime | Medium | Fallback to rule-based recommendations |
| Slow response times | Low | Parallel API calls, response caching |

### Data Risks
| Risk | Impact | Mitigation |
|------|--------|------------|
| Incomplete user data | High | Data completeness checker, guided prompts |
| Stale data | Medium | Staleness detection, update reminders |
| Calculation errors | High | Comprehensive unit tests, validation |
| Data quality degrades | Medium | Monitoring dashboard, automated alerts |

## Dependencies

### External Services
- ✅ Anthropic API access configured (anthropic.com, Claude 3.5 Sonnet)
- ✅ Google AI API access configured (ai.google.dev, Gemini 1.5 Pro)
- ⏳ API key management (environment variables → Azure Key Vault)
- ⏳ Telemetry and cost tracking dashboard
- 📋 Monitor for model upgrades (Claude Opus 3.5, Gemini 2.0/2.5/3.0)

### Internal Prerequisites
- ✅ User profile data complete (Phase 1)
- ✅ Dashboard infrastructure (Phase 1.5/Wave 6)
- ✅ Backend API framework
- ⏳ Historical data snapshots (will implement)

## Documentation Deliverables

1. **AI Architecture Guide** (`docs/dev/ai-architecture.md`)
   - Service design patterns
   - Consensus mechanism details
   - Safety guard implementation
   - Error handling strategies

2. **Prompt Engineering Guide** (`docs/ai/prompt-engineering.md`)
   - Prompt template structure
   - Best practices for financial prompts
   - Testing prompt variations
   - Version control workflow

3. **AI Operations Runbook** (`docs/ops/ai-runbook.md`)
   - Monitoring dashboards
   - Cost optimization
   - Troubleshooting guide
   - Incident response procedures

4. **Data Quality Standards** (`docs/data/quality-standards.md`)
   - Calculation methodologies
   - Validation rules
   - Anomaly detection logic
   - Data freshness requirements

## Post-Wave 7 Outlook

### Wave 8 (Likely Focus)
- Expand AI recommendations (tax strategies, goal planning)
- Monte Carlo retirement simulations
- Task automation based on AI recommendations
- Advanced portfolio analytics
- Learning from user feedback

### Phase 2 Completion (Deferred)
- Manual account data import (CSV)
- Plaid integration for bank connectivity
- API key ingestion for brokerages
- Background refresh jobs

**Rationale**: We're prioritizing AI intelligence (the core differentiator) over data connectivity. Users can manually update data while we build the intelligence that makes PFMP unique.

## Open Questions

1. ✅ **AI Model Selection**: RESOLVED - Claude 3.5 Sonnet + Gemini 1.5 Pro (premium tier)
2. ✅ **Upgrade Path**: Monitor for Claude Opus 3.5, Gemini 2.0/2.5/3.0 releases
3. **Consensus Threshold**: What agreement percentage triggers human review? (Suggest 80%)
4. **Prompt Storage**: Database vs files in repo? (Suggest repo for version control)
5. **Cost Budget**: Acceptable $20-100/month current, $80-400/month with premium upgrades
6. **Feedback Mechanism**: Thumbs up/down sufficient or need detailed feedback?
7. **Model Upgrade Triggers**: Auto-upgrade to new versions or manual review first?

## Next Steps

1. ✅ **Review & Approve** this Wave 7 plan - APPROVED with Claude + Gemini premium tier
2. **Configure AI Services** (Anthropic Claude + Google Gemini API access)
   - Sign up for Anthropic API (anthropic.com/api)
   - Sign up for Google AI API (ai.google.dev) or Vertex AI
   - Store API keys securely (environment variables initially)
3. **Create Feature Branches**: `wave-7-ai-foundation`, `wave-7-data-enrichment`
4. **Sprint Planning**: Break phases into 2-week sprints
5. **Kick Off Phase 7.1**: AI service abstractions and basic metrics

---

**Prepared**: October 27, 2025  
**Status**: Ready for Implementation  
**Strategic Priority**: 🎯 **CRITICAL** - Core differentiator for PFMP  

**Let's build the AI-powered financial advisor!** 🚀
