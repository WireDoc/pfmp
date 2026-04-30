# Wave 16: OpenRouter AI Overhaul

_Created: 2026-03-31_

## Overview

Replace all three individual AI provider integrations (OpenAI, Claude, Gemini) with a single **OpenRouter** gateway. OpenRouter provides a unified OpenAI-compatible API at `https://openrouter.ai/api/v1/chat/completions` that routes to 200+ models via one API key and one HTTP client.

**Primary AI**: `google/gemini-3.1-pro-preview` — main advisor, analysis, recommendations  
**Verifier AI**: `anthropic/claude-sonnet-4.6` — fact-checker, collaborator, second opinion

Models are configurable in `appsettings` and can be swapped without code changes.

---

## Why OpenRouter?

| Before (3 providers) | After (1 gateway) |
|---|---|
| 3 API keys (OpenAI, Anthropic, Google) | 1 API key |
| 3 HTTP clients with different auth schemes | 1 HTTP client, `Authorization: Bearer` |
| 3 request/response formats | 1 format (OpenAI-compatible) |
| 3 sets of retry/timeout/error handling | 1 unified handler |
| Model lock-in per service class | Model swap via config string |
| Separate cost tracking per provider | Unified usage tracking from response |
| Claude: custom `anthropic-version` header, `cache_control` blocks | Standard OpenAI format; caching handled by OpenRouter |
| Gemini: custom safety settings, thinking config | Standard OpenAI format |

---

## Scope

### In Scope

#### Part A: OpenRouter Provider Swap
1. **New `OpenRouterService`** — single `IAIFinancialAdvisor` implementation replacing all three
2. **New `OpenRouterOptions`** config — API key, primary model, verifier model, shared settings
3. **Simplified DI registration** — one service, two named roles (primary + verifier) resolved by config
4. **Updated `PrimaryBackupAIAdvisor`** — uses two instances of `OpenRouterService` (different models) instead of resolving by `ServiceName`
5. **Config migration** — new `AI:OpenRouter` section in appsettings; old sections retained but unused
6. **Cost tracking** — parse `usage` block from OpenRouter response (prompt_tokens, completion_tokens)
7. **Updated tests** — backend integration tests updated for new service
8. **Legacy cleanup** — archive old service files (don't delete; keep for reference)

#### Part B: Comprehensive Financial Context for AI
9. **Rewrite all context-building methods** in `AIIntelligenceService` to send the user's full financial picture
10. **New `BuildFullFinancialContextAsync()`** method — single source of truth for all AI context
11. **Enhanced dry-run endpoint** — `GET /api/Advice/preview/{userId}` returns the exact payload that would be sent, for human review before committing API credits
12. **Context sections** (all included in every analysis, not just targeted ones):

| Section | What's Sent | Source Table |
|---------|------------|--------------|
| **Cash Accounts** | Bank name, account type, APR/APY, balance, Purpose field | `FinancialProfileCashAccounts` |
| **Investment Accounts** | Institution, account type, total value, tax advantage | `FinancialProfileInvestmentAccounts` |
| **Holdings/Positions** | Symbol, name, asset type, quantity, cost basis, current value, gain/loss | `Holdings` |
| **Properties** | Type, occupancy, estimated value, mortgage balance, interest rate, lienholder, payment, rental income, expenses, taxes, insurance, term, equity, HELOC flag, Purpose/notes | `Properties` |
| **Liabilities** | Type, lender, balance, APR, minimum payment, credit limit/utilization, term, months remaining, overdue flag, payoff target | `FinancialProfileLiabilities` |
| **TSP** | Contribution rate, employer match, total balance, fund allocations (G/F/C/S/I/L %), lifecycle fund positions with quantities & values | `FinancialProfileTsp` + `TspLifecyclePositions` |
| **Income Sources** | Name, type, frequency, amount, reliability, taxable flag, growth rate | `IncomeSources` |
| **Expenses** | Category, monthly amount, notes | `FinancialProfileExpenseBudgets` |
| **Tax Profile** | Filing status, state, marginal/effective rates | `FinancialProfileTaxInfo` |
| **Insurance** | Type, carrier, coverage amount, premium, adequacy | `FinancialProfileInsurancePolicies` |
| **Long-Term Obligations** | Name, type, target date, estimated cost, funding status, critical flag | `FinancialProfileLongTermObligations` |
| **Financial Goals** | Retirement target, retirement date, passive income goal, emergency fund target | `FinancialProfiles` |
| **User Profile** | Age, marital status, gov employee, risk tolerance (1-10), VA disability | `Users` + `FinancialProfiles` |

**Privacy guardrails** — the following are NEVER sent:
- Account numbers, routing numbers
- Account holder names, SSNs
- Plaid tokens, API keys
- Street addresses (except for properties where refinancing analysis needs location context)

### Out of Scope
- Frontend changes (no UI impact; same `IAIFinancialAdvisor` / `IDualAIAdvisor` contracts)
- Streaming (current system doesn't use streaming; can add later)
- Chat/conversational memory changes (uses same interfaces)
- New financial data collection (property field additions handled in Wave 15.1 prerequisite)

---

## Configuration Design

### appsettings.Development.json (template)

```json
{
  "AI": {
    "OpenRouter": {
      "ApiKey": "YOUR_OPENROUTER_API_KEY_HERE",
      "BaseUrl": "https://openrouter.ai/api/v1/chat/completions",
      "PrimaryModel": "google/gemini-3.1-pro-preview",
      "VerifierModel": "anthropic/claude-sonnet-4.6",
      "ChatModel": "google/gemini-3.1-pro-preview",
      "MaxTokens": 4000,
      "Temperature": 0.3,
      "TimeoutSeconds": 120,
      "MaxRetries": 3,
      "EnableCostTracking": true,
      "SiteName": "PFMP",
      "SiteUrl": ""
    },
    "Consensus": {
      "PrimaryService": "Primary",
      "BackupService": "Verifier",
      "MinimumAgreementScore": 0.8,
      "MinimumConfidenceScore": 0.7,
      "DefaultToConservative": true,
      "RequireBothResponses": false,
      "ParallelCallTimeoutMs": 30000
    },
    "Safety": { /* unchanged */ }
  }
}
```

### appsettings.Development.local.json (real keys)

```json
{
  "AI": {
    "OpenRouter": {
      "ApiKey": "<real OpenRouter key>"
    }
  }
}
```

Old `AI:OpenAI`, `AI:Claude`, `AI:Gemini` sections can remain in config files but will no longer be read by active DI registrations.

---

## Architecture

### Current Flow (3 providers)

```
PrimaryBackupAIAdvisor
  ├─ IEnumerable<IAIFinancialAdvisor> (OpenAI, Claude, Gemini)
  ├─ Picks primary by ServiceName == config["PrimaryService"]
  ├─ Picks backup by ServiceName == config["BackupService"]
  ├─ Each service: different HTTP client, auth, request format
  └─ ConsensusEngine merges results
```

### New Flow (1 provider, 2 roles)

```
PrimaryBackupAIAdvisor
  ├─ OpenRouterService (role="Primary", model="google/gemini-3.1-pro-preview")
  ├─ OpenRouterService (role="Verifier", model="anthropic/claude-sonnet-4.6")
  ├─ Both use same HttpClient base, same auth, same format
  └─ ConsensusEngine merges results (unchanged)
```

### OpenRouter Request Format

```http
POST https://openrouter.ai/api/v1/chat/completions
Authorization: Bearer <OPENROUTER_API_KEY>
X-OpenRouter-Title: PFMP
Content-Type: application/json

{
  "model": "google/gemini-3.1-pro-preview",
  "messages": [
    { "role": "system", "content": "..." },
    { "role": "user", "content": "..." }
  ],
  "max_tokens": 4000,
  "temperature": 0.3
}
```

### Response Format (OpenAI-compatible)

```json
{
  "id": "gen-...",
  "model": "google/gemini-3.1-pro-preview",
  "choices": [{
    "message": { "role": "assistant", "content": "..." },
    "finish_reason": "stop"
  }],
  "usage": {
    "prompt_tokens": 1234,
    "completion_tokens": 567,
    "total_tokens": 1801
  }
}
```

---

## Implementation Phases

### Phase 1: New Service + Config (Backend)

**Files created:**
- `PFMP-API/Services/AI/OpenRouterService.cs` — implements `IAIFinancialAdvisor`
- `PFMP-API/Services/AI/OpenRouterOptions.cs` — config class

**Key design:**
- Constructor takes `OpenRouterOptions` + a `role` string ("Primary" or "Verifier")
- `ServiceName` returns the role ("Primary" or "Verifier")
- `ModelVersion` returns the actual model string from config
- Single `CallOpenRouterAsync()` private method handles all HTTP
- Parses `usage` for token/cost tracking
- Retry with exponential backoff on 429/5xx
- Timeout per config

**Estimated: ~200 lines**

### Phase 2: DI Rewiring

**Files modified:**
- `Program.cs` — replace 3 service registrations with 2 OpenRouter instances

```csharp
// Old (remove)
builder.Services.AddHttpClient<OpenAIService>();
builder.Services.AddHttpClient<ClaudeService>();
builder.Services.AddHttpClient<GeminiService>();
builder.Services.AddScoped<IAIFinancialAdvisor, OpenAIService>();
builder.Services.AddScoped<IAIFinancialAdvisor, ClaudeService>();
builder.Services.AddScoped<IAIFinancialAdvisor, GeminiService>();

// New
builder.Services.Configure<OpenRouterOptions>(builder.Configuration.GetSection("AI:OpenRouter"));
builder.Services.AddHttpClient("OpenRouter");

// Register two IAIFinancialAdvisor instances with different roles
builder.Services.AddScoped<IAIFinancialAdvisor>(sp => new OpenRouterService(
    sp.GetRequiredService<IHttpClientFactory>(),
    sp.GetRequiredService<IOptions<OpenRouterOptions>>(),
    sp.GetRequiredService<ILogger<OpenRouterService>>(),
    "Primary"));
builder.Services.AddScoped<IAIFinancialAdvisor>(sp => new OpenRouterService(
    sp.GetRequiredService<IHttpClientFactory>(),
    sp.GetRequiredService<IOptions<OpenRouterOptions>>(),
    "Verifier"));
```

- `PrimaryBackupAIAdvisor` — no changes needed (already resolves by `ServiceName` from config)

**Estimated: ~30 lines changed**

### Phase 3: Config Files

**Files modified:**
- `appsettings.Development.json` — add `AI:OpenRouter` section (template with placeholder key)
- `appsettings.Development.local.json` — add real OpenRouter API key
- `appsettings.json` — add `AI:OpenRouter` section (defaults)

**Old config sections left in place** (not read by new DI; safe to remove later)

### Phase 4: Legacy Archival

**Files moved (not deleted):**
- `Services/AI/OpenAIService.cs` → `Services/AI/archive/OpenAIService.cs`
- `Services/AI/ClaudeService.cs` → `Services/AI/archive/ClaudeService.cs`
- `Services/AI/GeminiService.cs` → `Services/AI/archive/GeminiService.cs`
- `Services/AI/AIService.cs` → `Services/AI/archive/AIService.cs` (legacy Azure)
- `Services/AI/DualAIAdvisor.cs` → `Services/AI/archive/DualAIAdvisor.cs` (legacy dual-panel)
- Old `*ServiceOptions` classes for individual providers → archive

**Retained (still active):**
- `IAIFinancialAdvisor.cs` — interface unchanged
- `PrimaryBackupAIAdvisor.cs` — orchestrator unchanged
- `ConsensusEngine.cs` — consensus logic unchanged
- `AIIntelligenceService.cs` — orchestrator unchanged
- `AIMemoryService.cs` — memory unchanged
- All models (`Advice.cs`, `AIConversation.cs`, etc.) — unchanged

### Phase 5: Comprehensive Financial Context

**The heart of this wave.** Rewrite the AI context-building in `AIIntelligenceService.cs` to give the AI a complete financial picture.

#### New method: `BuildFullFinancialContextAsync(int userId)`

Returns a structured text block (~2-5K tokens depending on user data) with all sections:

```
=== USER PROFILE ===
Age: 42 | Marital Status: Married | Gov Employee: Yes (DoD, GS-13)
Risk Tolerance: 7/10 | VA Disability: 30% ($540/mo, tax-free)

=== FINANCIAL GOALS ===
Retirement Target: $2,500,000 by 2048 (22 years)
Target Monthly Passive Income: $8,000
Emergency Fund Target: $30,000

=== CASH ACCOUNTS (4 accounts, $87,500 total) ===
• USAA Savings | Savings | 0.35% APY | $45,000 | Purpose: Emergency fund
• Marcus by Goldman Sachs | HYSA | 4.25% APY | $32,000 | Purpose: House down payment fund
• Navy Federal | Checking | 0.01% APY | $8,500 | Purpose: Primary checking
• USAA | Checking | 0.01% APY | $2,000 | Purpose: Bill pay account

=== INVESTMENT ACCOUNTS (3 accounts, $425,000 total) ===
• Vanguard | Brokerage | Taxable | $180,000
  Holdings:
  - VTI (Vanguard Total Stock Market) | ETF | 450 shares | Cost: $145,000 | Value: $162,000 | +11.7%
  - VXUS (Vanguard Intl Stock) | ETF | 200 shares | Cost: $42,000 | Value: $38,000 | -9.5%
  - BND (Vanguard Total Bond) | ETF | 100 shares | Cost: $18,500 | Value: $18,000 | -2.7%
  Purpose: Long-term growth, planning to tilt international allocation higher
• Fidelity | IRA | Tax-Deferred | $95,000
  Holdings: [similar breakdown]
• Schwab | Roth IRA | Tax-Free | $150,000
  Holdings: [similar breakdown]

=== TSP (Federal Thrift Savings Plan) ===
Balance: $285,000 | Contribution Rate: 10% | Employer Match: 5%
Allocations: C Fund 60% ($171k) | S Fund 20% ($57k) | I Fund 10% ($28.5k) | G Fund 5% ($14.25k) | F Fund 5% ($14.25k)
Lifecycle Positions: L2050 contributing 100%

=== PROPERTIES (2 properties, $855,000 total value, $670,000 equity) ===
• Primary Residence | Owner-Occupied | Value: $555,000
  Mortgage: $285,000 @ 3.25% | 30yr fixed | Lienholder: Navy Federal
  Payment: $1,240/mo | Taxes: $180/mo | Insurance: $95/mo | Equity: $270,000
  HELOC: No
• Rental Property | Tenant-Occupied | Value: $300,000
  Mortgage: $200,000 @ 5.75% | 30yr fixed | Lienholder: Wells Fargo
  Payment: $1,167/mo | Taxes: $250/mo | Insurance: $120/mo | Equity: $100,000
  Rental Income: $1,800/mo | Net Cash Flow: $263/mo
  Purpose: Cash flow investment, considering refinancing when rates drop

=== LIABILITIES (3 accounts, $497,000 total) ===
• Navy Federal Mortgage | $285,000 | 3.25% APR | $1,240/mo | 22yr remaining
• Wells Fargo Mortgage | $200,000 | 5.75% APR | $1,167/mo | 28yr remaining
• Chase Sapphire | Credit Card | $2,000 / $15,000 limit (13% util) | 24.99% APR | Payoff target: Monthly

=== INCOME SOURCES (3 sources, $9,040/mo gross) ===
• DoD Salary | Salary | $7,500/mo | Stable | Taxable (W-2) | Growth: 2.5%/yr
• VA Disability | VA Disability | $540/mo | Guaranteed | Tax-Free
• Rental Income | Rental | $1,800/mo | Variable | Taxable (1099)

=== EXPENSES (Monthly: $6,200 estimated) ===
• Housing: $2,800 | Transportation: $800 | Food: $900 | Insurance: $400
• Utilities: $350 | Healthcare: $200 | Entertainment: $250 | Other: $400

=== TAX PROFILE ===
Filing: Married Filing Jointly | State: AR | Marginal Rate: 22% | Effective Rate: 16%

=== INSURANCE ===
• Homeowners (State Farm) | Coverage: $555,000 | Premium: $1,140/yr | Adequate
• Auto (USAA) | Coverage: $300,000 | Premium: $1,800/yr | Adequate
• Term Life (USAA) | Coverage: $500,000 | Premium: $480/yr | Needs Review (may be underinsured)

=== LONG-TERM OBLIGATIONS ===
• College Fund (Child 1) | Target: 2032 | Est: $120,000 | Funded: $45,000 (37.5%) | CRITICAL
```

#### Analysis-specific prompts still appended

After the full context, each analysis type appends its focused instruction:
- **Cash**: "Analyze cash allocation efficiency. Flag low-yield accounts with excess balances. Recommend specific institution alternatives with current competitive rates."
- **Portfolio**: "Analyze portfolio allocation vs risk tolerance. Flag drift, concentration risk, tax-loss harvesting opportunities."
- **TSP**: "Analyze TSP allocation vs age/retirement timeline. Check contribution rate vs match optimization."
- **Risk**: "Identify misalignments between stated risk tolerance and actual portfolio composition."
- **Comprehensive**: "Provide a holistic financial health assessment. Identify the top 3-5 highest-impact opportunities or risks."

#### Enhanced dry-run endpoint

`GET /api/Advice/preview/{userId}?analysisType=comprehensive`

Returns:
```json
{
  "systemPrompt": "You are a financial advisor...",
  "fullContext": "[the entire text block above]",
  "analysisPrompt": "Provide a holistic financial health assessment...",
  "estimatedTokens": 2847,
  "contextSections": {
    "cashAccounts": 4,
    "investmentAccounts": 3,
    "totalHoldings": 12,
    "properties": 2,
    "liabilities": 3,
    "incomeSources": 3,
    "hasExpenseBudget": true,
    "hasTaxProfile": true,
    "insurancePolicies": 3,
    "longTermObligations": 1
  }
}
```

This lets you inspect exactly what the AI will see before spending credits.

### Phase 6: Tests

**Backend tests updated:**
- Existing AI controller/service tests verify the new `OpenRouterService` via `WebApplicationFactory`
- Test config provides mock/stub responses via test HTTP handler
- Verify: primary model, verifier model, consensus flow, fallback on error
- New tests for `BuildFullFinancialContextAsync` — verify all sections present
- Test dry-run endpoint returns expected structure

**No frontend test changes** (API contract unchanged)

### Phase 7: Validation

- Start servers, call `GET /api/Advice/preview/20?analysisType=comprehensive` — inspect full context
- Call `POST /api/Advice/generate/20` — verify advice uses full context
- Verify logs show: `Primary=google/gemini-3.1-pro-preview`, `Verifier=anthropic/claude-sonnet-4.6`
- Verify advice record in DB has `PrimaryRecommendation`, `BackupCorroboration`, `ConsensusText`
- Verify cost tracking from `usage` block

---

## Prerequisite: Wave 15.1 — Property Field Enrichment

Before Wave 16 can send complete property data to the AI, the following fields must be added to `PropertyProfile`:

| New Field | Type | Purpose |
|-----------|------|---------|
| `InterestRate` | decimal(8,4)? | Mortgage APR (for manual properties not linked to a liability) |
| `MortgageTerm` | int? | Loan term in years (15, 20, 30) |
| `Lienholder` | string(150)? | Mortgage lender name |
| `MonthlyPropertyTax` | decimal(18,2)? | Monthly property tax amount |
| `MonthlyInsurance` | decimal(18,2)? | Monthly homeowner's insurance |
| `Purpose` | string(500)? | Owner's notes — strategy, plans, context for AI |

These fields also need: DTOs, controller mapping, frontend form fields, migration, tests.
Wave 15.1 is a prerequisite and will be completed first.

---

## Files Changed Summary

| Action | File | Phase |
|--------|------|-------|
| **Create** | `Services/AI/OpenRouterService.cs` | 1 |
| **Create** | `Services/AI/OpenRouterOptions.cs` | 1 |
| **Modify** | `Program.cs` (DI section) | 2 |
| **Modify** | `appsettings.Development.json` | 3 |
| **Modify** | `appsettings.Development.local.json` | 3 |
| **Modify** | `appsettings.json` | 3 |
| **Archive** | `Services/AI/OpenAIService.cs` | 4 |
| **Archive** | `Services/AI/ClaudeService.cs` | 4 |
| **Archive** | `Services/AI/GeminiService.cs` | 4 |
| **Archive** | `Services/AI/AIService.cs` | 4 |
| **Archive** | `Services/AI/DualAIAdvisor.cs` | 4 |
| **Modify** | `Services/AI/AIIntelligenceService.cs` (context builders) | 5 |
| **Modify** | `Controllers/AdviceController.cs` (enhanced preview) | 5 |
| **Update** | Backend tests | 6 |

## Unchanged (Preserved)

- `IAIFinancialAdvisor.cs` — interface contract
- `IDualAIAdvisor` / `PrimaryBackupAIAdvisor.cs` — orchestrator
- `ConsensusEngine.cs` — consensus logic
- `AIMemoryService.cs` — memory system
- `AdviceService.cs` — advice lifecycle
- All AI models / DTOs
- All frontend code (zero frontend changes)
- `AISafetyOptions` — safety guards

---

## Acceptance Criteria

- [ ] `OpenRouterService` implements `IAIFinancialAdvisor` with all 4 methods + `ServiceName` + `ModelVersion`
- [ ] Single `AI:OpenRouter` config section controls both models
- [ ] `PrimaryService` / `BackupService` resolved correctly (Primary → Gemini 3.1 Pro, Verifier → Claude Sonnet 4.6)
- [ ] Advice generation works end-to-end: generates consensus from two models via OpenRouter
- [ ] Token usage and cost tracked from OpenRouter `usage` response block
- [ ] Old provider files archived (not deleted)
- [ ] `BuildFullFinancialContextAsync` includes ALL financial sections (cash, investments, holdings, properties, liabilities, TSP, income, expenses, tax, insurance, obligations)
- [ ] Privacy guardrails enforced: no account numbers, names, SSNs, tokens in AI context
- [ ] Property context includes new fields (interest rate, lienholder, taxes, insurance, term, purpose)
- [ ] Dry-run endpoint (`GET /api/Advice/preview/{userId}`) returns complete context for inspection
- [ ] `dotnet build`: 0 errors
- [ ] Backend tests pass
- [ ] Model swap requires only config change (no code change)
- [ ] Frontend unaffected (no changes needed)

---

## Risk & Mitigation

| Risk | Mitigation |
|------|------------|
| OpenRouter downtime | Old service files archived, can restore quickly |
| Model name changes | Config-driven; update appsettings only |
| Different response quirks per model | OpenRouter normalizes to OpenAI format |
| Rate limiting | Retry with backoff; respect `Retry-After` header |
| Cost surprise | `usage` block in every response; tracking in place |
| Prompt caching loss (Claude-specific) | OpenRouter supports prompt caching for Claude models automatically |

---

## Version Target

**v0.16.0-alpha** upon completion

---

## Supplement: Phase 8 — Pre-Computed Context Enrichments (added 2026-04-29)

Wave 13 closeout exposed several places where the AI was either inferring numbers it couldn't verify (per-share price from value÷qty), repeating math we already do server-side (concentration %, dividend cash flow, shortfall to retirement target), or being told "no market context available." Phase 8 ships those pre-computed values directly into `BuildFullFinancialContextAsync` so the AI spends tokens on judgement rather than arithmetic.

**Status: in progress.** First two items shipped 2026-04-29 in commit `a7ab45d` (per-holding `Px: $X.XX as of YYYY-MM-DD` + Crypto/Estate Planning added to comprehensive review scope). §8.5 reliable-income-offset cash buffer block shipped 2026-04-29 with 5 xUnit tests in `AIIntelligenceServiceLiquidityBufferTests`. §8.1 position-weight-per-holding and §8.2 `=== PORTFOLIO KEY METRICS ===` (cash drag %, forward annual dividend, latest snapshot + 30/90/365-day net worth deltas) shipped 2026-04-29 with 3 additional xUnit tests in the same file. §8.3 partial: state top bracket lookup added to `=== TAX PROFILE ===`, TSP match-capture status + Roth conversion runway added to the existing `=== TSP ===` block, with 5 additional xUnit tests. Remaining items below.

### 8.1 Per-holding price metadata (high value, cheap)

| Item | Source | Format in context |
|------|--------|-------------------|
| ✅ Current price + as-of date | `Holding.CurrentPrice` + `LastPriceUpdate` | `Px: $653.62 as of 2026-04-28` |
| ⬜ 52-week high / low | FMP `quote` endpoint (already pulled) | `52w: $498–$667` |
| ⬜ YTD return % | FMP `historical-price-full` (already pulled) | `YTD: +12.4%` |
| ⬜ Days held / oldest tax-lot date | `Holding.DateAcquired` (add if missing) or earliest `InvestmentTransaction` | `Held: 380d (long-term)` |
| ⬜ Position % of portfolio | computed in builder (`CurrentValue / investmentTotal`) | `Weight: 31.0% of brokerage` |

### 8.2 Cash & income-derived metrics

| Item | Computation | Notes |
|------|-------------|-------|
| ⬜ Effective monthly expenses | `sum(ExpenseBudgets where Frequency=Monthly) + annualized/12` | Already partially done; expose as a single number. |
| ⬜ Liquidity buffer math | `cashTotal - (expenses × liquidityBufferMonths) - reliableMonthlyIncome × 0` (see §8.5) | Render as `Cash buffer: $X above target / $Y short` |
| ⬜ Cash drag % | `cashTotal / (cashTotal + investmentTotal + tspTotal)` | One line; AI uses to decide deploy size. |
| ⬜ Dividend TTM + forward | `sum(Holding.AnnualDividendIncome)` (already on model) | `Forward div: $1,247/yr ($104/mo)` |
| ⬜ Net worth deltas (30/90/365d) | `NetWorthSnapshots` already has the data | `NW Δ: 30d +$3,210 / 90d +$8,940 / 1y +$41,205` |

### 8.3 Tax + retirement pre-computes

| Item | Computation | Notes |
|------|-------------|-------|
| ⬜ Marginal + effective federal bracket | from `Filing` + gross income + withholdings already collected | `Marginal: 24% federal / Effective: ~17%` |
| ⬜ State top bracket | static lookup table keyed on `TaxProfile.State` | `AR top: 4.4%` |
| ⬜ Retirement income gap | `targetMonthlyPassive − projectedMonthlyAtAge62` from existing FERS projections | `Goal gap @62: -$1,073/mo` |
| ⬜ Roth conversion runway | `(retirementAge − currentAge)` capped at `(73 − currentAge)` | `Roth conversion runway: 16 years` |
| ⬜ TSP match-capture status | `EmployeeContributionPercent vs 5%` | `Match: fully captured / leaving $X/yr on table` |

### 8.4 Sector / asset-class roll-ups

`PortfolioAnalyticsController` already returns these for the dashboard pie. Surface the same numbers in the AI context as a one-line summary so the AI doesn't recompute:

```
Brokerage allocation: Equity 87% | Bonds 0% | Cash 0% | Alt 13% (DXYZ pre-IPO)
Sector exposure: Tech/AI 28% | Utilities 14% | Industrials 15% | Broad-market 31% | Other 12%
```

### 8.5 Reliable income offset for cash-buffer warnings ⭐ user request

**Problem**: AI flags "low cash reserves" because it computes the buffer as `cash ≥ expenses × liquidityBufferMonths`, ignoring the fact that ~$2,500/mo of VA disability is contractually guaranteed and arrives on the 1st of every month regardless of market conditions. Buffer math should subtract guaranteed income before sizing the cash requirement.

**Constraint**: Must apply only to users who actually have guaranteed-income streams. Users without disability/pension/SS-in-payment income still need the full traditional buffer.

**Source data**: `IncomeSources.Reliability` is already an enum on the model. Treat the following as "guaranteed" for buffer math:

| `IncomeSource.Type` | Guaranteed? | Rationale |
|---------------------|-------------|-----------|
| `va_disability` | ✅ always | Tax-free, COLA-adjusted, federal obligation |
| `pension` (in-payment) | ✅ always | Already-vested annuity payments |
| `social_security` (in-payment) | ✅ always | Currently being received |
| `salary` | ❌ | Job loss is the exact scenario buffers exist for |
| `rental` | ❌ | Vacancy / tenant default risk |
| `other` | only if `Reliability = Guaranteed` | User opt-in, e.g. trust distribution |

**Computation**:

```csharp
var guaranteedMonthly = incomeSources
    .Where(s => s.Type is "va_disability" or "pension" or "social_security"
                || s.Reliability == IncomeReliability.Guaranteed)
    .Sum(s => s.NetMonthlyAmount ?? s.MonthlyAmount);

var monthlyExpenses = computedMonthlyExpenses;
var bufferMonths = user.LiquidityBufferMonths ?? 6;

// Net cash gap per month after guaranteed income covers it
var netMonthlyGap = Math.Max(0, monthlyExpenses - guaranteedMonthly);
var requiredCashBuffer = netMonthlyGap * bufferMonths;

var cashSurplus = totalCash - requiredCashBuffer;
```

**Context output** (only printed when `guaranteedMonthly > 0`):

```
=== LIQUIDITY BUFFER ANALYSIS ===
Monthly expenses: $2,698 | Guaranteed monthly income: $2,500 (VA disability)
Net monthly gap after guaranteed income: $198
Required cash buffer (6 mo × $198): $1,188
Current cash: $37,130 → Surplus over buffer: $35,942
Note: Only guaranteed income (VA disability, pension/SS in payment) offsets the buffer requirement. Salary and rental income are NOT counted because the buffer exists to cover their loss.
```

For users with no guaranteed income, fall back to the existing `cash ≥ expenses × bufferMonths` framing — no special block printed.

**Tests required**:
- User with VA disability $2,500/mo, expenses $2,698/mo, 6-mo buffer → required = $1,188 (not $16,188).
- User with VA disability covering 100%+ of expenses → required = $0, surplus = full cash.
- User with no guaranteed income → block omitted, AI sees the original buffer math only.
- User with `rental` income → rental NOT subtracted even at high reliability.

### 8.6 Insurance & estate gap math

| Item | Computation | Notes |
|------|-------------|-------|
| ⬜ Recommended life coverage | `10 × annualGrossIncome` (industry rule of thumb) | `Recommended life: $1.44M / Current FEGLI: $145k / Gap: $1.30M` |
| ⬜ Beneficiary completion % | `designatedAccounts / totalAccounts` (already shown) | already in context — promote to `=== KEY METRICS ===` header |
| ⬜ Document staleness | `now − lastReviewedAt` for will/trust/POAs | Flag any > 5 years |

### 8.7 Market context block (replace "no market context available")

Even refresh-once-daily values would unblock macro framing. Stand up a `MarketContextService` that pulls the following daily:

| Series | Source | Format |
|--------|--------|--------|
| 10-yr Treasury yield | FMP `treasury` endpoint | `10y UST: 4.21%` |
| S&P 500 YTD % | FMP `historical-price-full/SPY` (already pulled) | `S&P 500 YTD: +6.4%` |
| CPI YoY | BLS public API (no key, monthly cadence) | `CPI YoY: 2.8%` |
| Fed funds rate | FRED `DFF` series | `Fed funds: 4.50–4.75%` |

Cache in-memory for 24h; render as a single block:

```
=== MARKET CONTEXT (as of 2026-04-29) ===
S&P 500 YTD: +6.4% | 10y UST: 4.21% | CPI YoY: 2.8% | Fed funds: 4.50–4.75%
```

### 8.8 Acceptance for Phase 8

- [x] Per-holding `Px: $X.XX as of YYYY-MM-DD`
- [x] Crypto + Estate Planning listed in comprehensive review scope
- [ ] 52w high/low + YTD % per holding
- [x] Position weight % per holding
- [x] Cash drag % + forward dividend total in `=== PORTFOLIO KEY METRICS ===` block
- [x] Net worth deltas (30/90/365d)
- [x] State top bracket lookup in `=== TAX PROFILE ===`
- [x] TSP match-capture status + Roth conversion runway in `=== TSP ===`
- [ ] Marginal/effective federal bracket auto-derivation (currently rendered only when user-supplied)
- [ ] Retirement income gap @ MRA / 62 / 65
- [x] **§8.5 reliable-income-offset cash buffer block** — applies only when guaranteed income > 0; preserves existing math otherwise
- [ ] Sector/asset-class roll-up line
- [ ] Recommended life coverage + gap
- [ ] Document staleness flags (> 5y)
- [ ] `MarketContextService` daily refresh + context block
- [ ] xUnit tests for §8.5 (4 cases above) + smoke test for each §8.1–§8.7 line being present in `BuildFullFinancialContextAsync` output
