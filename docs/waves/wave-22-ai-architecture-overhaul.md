# Wave 22 — AI Architecture Overhaul (Fusion Spike + Admin UI + Model Aliases + News Slot)

**Status:** ✅ Complete (Phase A spike → rollback verdict; Phase B canceled; Phases C/D/E/F shipped)
**Owner:** Solo project; user is sole customer
**Predecessors:** Wave 16 (OpenRouter rewire), Wave 14 (Spending Analysis — provides the prompt's SPENDING ACTUALS section)
**Successors blocked on this wave:** AI Chatbot with Memory (needs `ChatModel` slot properly wired); News Aggregator (needs `NewsModel` slot); future Market Context Awareness (needs web-search aware AI)

---

## Phase A outcome (recorded 2026-06-16)

**Verdict: ROLLBACK.** Do not adopt Fusion for the routine analyze path.

**Measured cost ratio**: 21.6× (Fusion at `general-high` preset + Sonnet judge override = **$2.305** per cash analysis vs. baseline Primary→Verifier = **$0.107**). Well past the user's 3× rollback threshold.

**Measured latency ratio**: 5.3× (Fusion 463s vs. baseline 88s wall time). Fusion was slower, not faster — panel members made ~5 web search/fetch tool calls each, adding latency without the cost-equivalent quality lift.

**Quality delta**: Fusion's output was meaningfully better (~20–30% richer) with 3 unique insights baseline missed (T-bill/state-tax exemption, HDHP/HSA at Open Season, deeper crypto custody framing). Instruction-following was inconsistent — Fusion nailed the Ally preference baseline's Primary violated, but missed the crypto "Reserved for bot investing" purpose statement. Of the 3 Fusion-unique insights, only 1 (HDHP/HSA) was actionable for the user; the T-bill recommendation trades down on liquidity and the crypto suggestion misread intent.

**Web search did genuine work**: Fusion flagged a real ~$800 discrepancy between PFMP's stored brokerage value ($103,323) and live market prices ($102,545). Root cause: PriceRefreshJob runs at 10 PM ET, leaving the 6-hour post-close window (4 PM – 10 PM ET) using prior-day prices. Tracked as a separate small enhancement (move job to ~4:30 PM ET).

**OpenRouter `usage.cost` aggregation bug**: For Fusion responses, the response-level `usage.cost` field reports only one underlying completion's cost (~$0.96 of the $2.30 total in this run, matching the Opus 4.8 panelist line). `FusionAIAdvisor.ParseFusionResponse` reads this field and therefore underreports actual Fusion cost by ~2.4×. Documented in code; aggregation fix deferred unless Fusion is revived as a Deep Dive feature.

**Dormant code kept (not deleted)**: `FusionAIAdvisor.cs`, `AISpikeController.cs`, `OpenRouterOptions.FusionOptions`, `appsettings.AI.OpenRouter.Fusion` (Enabled: false). ~350 LOC total, low maintenance cost, available as scaffolding for a future "Deep Dive" opt-in feature (e.g., quarterly year-end planning at ~$2.30/run × 4/yr = ~$10/yr — defensible cadence).

**Full report**: `docs/temp_fusion_spike_report.log` (gitignored — local-only scratch).

**Total spike spend**: $2.41 (one baseline call + one Fusion call; runs 3c and 4 skipped as data was conclusive).

---

---

## Why this wave exists

Three threads converged at the end of Wave 14:

1. **User asked for an admin UI** to choose which model fills each role (Primary, Backup, future News aggregator) without editing `appsettings.json` + restart.
2. **User noted OpenRouter shortcut aliases** like `~google/gemini-pro-latest` and `~anthropic/claude-sonnet-latest` that auto-pin to the latest stable model in a family. Wants those adopted to remove the manual model-bump treadmill.
3. **User flagged [openrouter/fusion](https://openrouter.ai/openrouter/fusion)** — a multi-model deliberation primitive launched by OpenRouter that *appears* to do the work the current `PrimaryBackupAIAdvisor` + `ConsensusEngine` do, but with structured JSON output and built-in web search.

The Fusion question is the biggest. If Fusion is genuinely better, the existing ~700 LOC across `PrimaryBackupAIAdvisor.cs` and `ConsensusEngine.cs` becomes obsolete and the dashboard's analyze flow gets richer output for free. If it's not, we still want the admin UI and aliases.

This wave bundles all three because they share infrastructure (the OpenRouter options layer, the model-slot abstraction, the DI registration of `IAIFinancialAdvisor` instances) and decisions about one slot ripple into decisions about the others.

---

## State of the world at wave start

### What's already shipped (Wave 16)

- `OpenRouterService` is the single `IAIFinancialAdvisor` implementation. Zero direct Anthropic/OpenAI/Gemini SDK calls in the codebase.
- Two `IAIFinancialAdvisor` instances registered in [Program.cs:55-67](../../PFMP-API/Program.cs#L55-L67) with role discriminators `"Primary"` and `"Verifier"`.
- Config lives in `appsettings.json` → `AI.OpenRouter` ([appsettings.json:5-23](../../PFMP-API/appsettings.json#L5-L23)):
  - `PrimaryModel = google/gemini-3.1-pro-preview`
  - `VerifierModel = anthropic/claude-sonnet-4.6`
  - `ChatModel = google/gemini-3.1-pro-preview` (half-wired; substring-triggered in `OpenRouterService.DetermineModel`)
  - One API key, one HTTP format (OpenAI-compatible chat completions).

### Current analysis flow (the thing Fusion would replace)

[PrimaryBackupAIAdvisor.cs](../../PFMP-API/Services/AI/PrimaryBackupAIAdvisor.cs):

1. **Call 1 (Primary)** — Gemini Pro receives the full prompt.
2. **Call 2 (Verifier)** — Claude Sonnet receives a *re-templated* prompt that embeds Primary's response + the original raw data, with a "fact-check the primary" framing.
3. **[ConsensusEngine.BuildCorroboration](../../PFMP-API/Services/AI/ConsensusEngine.cs)** — parses Verifier's free-text response with **string-matching heuristics** (`lowerText.Contains("strongly agree")`, etc.) to extract agreement level, concerns, adjustments. Two TODOs in the file flag "enhance with embeddings."
4. Returns `ConsensusResult` with `PrimaryRecommendation`, `BackupCorroboration`, `AgreementScore`, `HasConsensus`, `DisagreementExplanation`.

**Single dispatch seam**: [AIIntelligenceService.cs](../../PFMP-API/Services/AI/AIIntelligenceService.cs) calls `_dualAI.GetConsensusRecommendationAsync(prompt)` from 7 separate analyze paths. Replacing the implementation is a one-line DI change. The harder part is the result-shape change rippling into the frontend.

### Prompt readiness

Re-scored against the original Gemini critique (see `docs/temp_scorecard_against_gemini_feedback.log`): **7 DONE, 4 PARTIAL, 1 OPEN**. All major prompt gaps the original Gemini review flagged are now closed (Estate Planning, FERS, Inflation, Spending Actuals section, Retirement Expenses). Remaining gaps are either (a) addressed by Fusion's built-in web search, (b) naturally fit Fusion's structured-JSON output, or (c) low-impact partials. **Prompt is ready for the empirical test.**

---

## What OpenRouter Fusion actually is (research summary)

Source: [openrouter.ai/openrouter/fusion](https://openrouter.ai/openrouter/fusion) and [docs/guides/features/plugins/fusion](https://openrouter.ai/docs/guides/features/plugins/fusion), researched 2026-06-16.

### Mechanism

1. **Panel**: 1–8 models run **in parallel** on the user's prompt. Default Quality preset:
   - `~anthropic/claude-opus-latest`
   - `~openai/gpt-latest`
   - `~google/gemini-pro-latest`
   - Budget preset substitutes cheaper members (not enumerated in public docs).
2. **Web search + web fetch** are enabled by default for every panel member. Not opt-in, not extra-cost on top of the underlying model call.
3. **Judge**: a single model (default `~anthropic/claude-opus-latest`) reads the panel's responses and synthesizes structured JSON output.
4. **Output JSON fields**: `consensus`, `contradictions`, `partial coverage`, `unique insights`, `blind spots`.

### Plugin parameters

```json
{
  "model": "openrouter/fusion",
  "messages": [...],
  "plugins": [
    {
      "id": "fusion",
      "preset": "quality" | "budget",
      "analysis_models": ["~anthropic/claude-opus-latest", "~openai/gpt-latest"],
      "model": "~anthropic/claude-sonnet-latest",
      "max_tool_calls": 5,
      "enabled": true
    }
  ]
}
```

- `analysis_models` array — 1–8 models, overrides preset.
- `model` (within plugin) — judge override.
- The plugin can also be attached to *any* base model, not just `openrouter/fusion`.

### Billing model

> "Your request is priced as the sum of those underlying completions rather than a single model."

Default Quality preset = 3 panelists + 1 judge = **4 completions per call**. Judge is top-tier (Claude Opus). Expect **2–3× cost vs. current Primary→Verifier** at defaults; Budget preset + Sonnet judge can pull that back toward 1.5×.

### Unknown / undocumented

- Exact Budget-preset composition
- Per-call pricing examples (must be measured empirically)
- Streaming support within the Fusion plugin context
- Whether `temperature`, `max_tokens`, `system` prompts propagate through to panelists uniformly

---

## Fusion vs. current — head to head

| Dimension | Current Primary→Verifier | Fusion |
|-----------|--------------------------|--------|
| Completions per analyze | 2 (sequential) | 3–4 (panel parallel + judge serial) |
| Cost per analyze | Gemini Pro + Claude Sonnet | Quality default: Opus + GPT + Gemini Pro + Opus judge (~2–3× current); Budget+Sonnet judge: ~1.5× |
| Latency | Sequential: Verifier waits for Primary | Panel parallel; only judge is serial → roughly half today's wall time |
| Output structure | Free text + brittle string parsing | Strict JSON: consensus / contradictions / partial coverage / unique insights / blind spots |
| Perspectives | 2 | 1–8 (3 default) |
| Web search | None | Built-in on every panel member |
| Partial-failure behavior | Explicit primary-only fallback in code | Judge handles partial failures internally; opaque |
| Per-model prompt control | Bespoke "fact-check the other model" prompt for Verifier | Same prompt to all panelists; judge synthesizes after |
| Portability off OpenRouter | High (each call is plain chat completion) | Low (Fusion is OpenRouter-proprietary) |
| Code surface area | ~700 LOC (PrimaryBackupAIAdvisor + ConsensusEngine) | ~150 LOC (thin Fusion wrapper) |

### Pros of switching the analysis path to Fusion

1. **Structured JSON output eliminates ConsensusEngine string-matching.** The `Contains("strongly agree")` parsing and sentiment-keyword scoring exist because today's models return free text. Fusion gives structured output natively.
2. **Parallel panel halves analyze latency.**
3. **"Blind spots" + "partial coverage" are net-new fields.** Today's engine only finds agree/disagree between two voices; it can't surface a third-perspective insight neither model caught.
4. **Web search at zero integration cost.** Future Market Context Awareness (scorecard #12) — covered for free.
5. **Customizable panel via config** maps perfectly onto the admin-UI plan.
6. **Net code reduction.** ~700 LOC out, ~150 LOC in.

### Cons / risks

1. **Cost goes up.** 2–3× at Quality defaults; ~1.5× with Budget + Sonnet judge. Must measure empirically.
2. **Loss of the "fact-check the other model" prompt.** Today's Verifier is explicitly told "here's the primary's answer, fact-check against the raw data." Fusion panelists answer independently. Whether the bespoke pattern was catching real errors or was theater needs evaluation.
3. **Web search is double-edged for finance.** A panelist anchoring on a Seeking Alpha blog or Reddit thread could degrade quality. `max_tool_calls` low + per-request review needed before trust.
4. **Result-shape change forces frontend work.** Anywhere the UI reads `PrimaryRecommendation` / `BackupCorroboration` / `AgreementScore` / `DisagreementExplanation` needs to switch to the new JSON shape. This is the real lift.
5. **Deeper vendor lock-in to OpenRouter.** Today's pattern is portable to any chat-completion provider; Fusion is not.
6. **Maturity unknown.** Fusion is newer than the current stack. Empirical evaluation is necessary, not optional.
7. **Wrong tool for the chatbot.** Fusion's 3–4 completion sequence is too slow + expensive for interactive chat. Chatbot needs a single-model fast path.

### Why Fusion is also wrong for the News Aggregator

The news aggregator profile (per user: Gemini Flash, runs periodically, very few tokens) is the opposite of Fusion's profile. News work is single-pass summarization at low cost. Fusion's panel + judge would be overkill and budget-breaking.

---

## Recommendation: hybrid three-slot architecture

| Slot | Use case | Model | Behavior |
|------|----------|-------|----------|
| **Analysis** | The 7 dashboard analyze endpoints (`/api/ai/analyze/*`) | `openrouter/fusion` with configurable preset + judge + analysis_models | Multi-model deliberation, structured JSON, web-search aware |
| **Chat** | Future chatbot (single fast turn-taking) | `~google/gemini-pro-latest` or `~anthropic/claude-sonnet-latest`, with `:online` suffix when web is needed | One completion, low latency, user-configurable |
| **News** | Periodic news aggregation (future Market Context Awareness wave) | `~google/gemini-flash-latest` (or 2.5-flash) | Cheap, summarization-heavy, runs on Hangfire schedule |

All three slots configurable via admin UI; all use the `~provider/model-latest` alias convention; all share one OpenRouter API key.

---

## Wave 22 phases

### Phase A — Empirical spike: Fusion vs. current Primary→Verifier

**Goal:** Measure cost + output quality on real user-20 data before committing to the refactor.

**Approach:**

1. Add a feature flag `AI:UseFusion: false` to `appsettings.json` (default off — current behavior unchanged).
2. Add a parallel `FusionAIAdvisor : IDualAIAdvisor` implementation alongside `PrimaryBackupAIAdvisor`.
3. When the flag is true, DI registers `FusionAIAdvisor`; when false, registers `PrimaryBackupAIAdvisor`. No frontend changes — `FusionAIAdvisor` returns a `ConsensusResult` with Fusion's JSON output flattened into the existing shape (best-effort mapping) for the spike.
4. Run the comprehensive analyze (`/api/ai/analyze/{userId}/full`) on user 20 with the flag **off** → save response + cost.
5. Toggle the flag **on** → run again → save response + cost.
6. Repeat 3× to smooth variance. Capture wall-clock latency, total tokens, total dollar cost, and raw response text for both modes.
7. **Side-by-side qualitative comparison**: which output identifies issues the other missed? Are Fusion's `blind spots` actually novel insights? Does the loss of the "fact-check" prompt hurt?

**Deliverable:** `docs/temp_fusion_vs_primary_backup_comparison.log` — table of 3-run results + a recommendation paragraph.

**Decision criteria:**

| Outcome | Action |
|---------|--------|
| Fusion cost ≤ 1.7× and qualitative output materially richer | **Commit** — proceed to Phase B (full refactor) |
| Fusion cost 1.7×–2.5× and richer but not dramatically | **Decide** — discuss whether the richer output justifies the cost. Possibly switch to Budget preset + cheaper judge and re-measure. |
| Fusion cost ≥ 2.5× without obvious quality win | **Roll back** — keep current architecture, proceed with admin UI + aliases only (Phase C/D), skip Phase B |
| Fusion quality worse | **Roll back** unconditionally |

### Phase B — Full Fusion adoption ❌ CANCELED

Phase A failed the cost gate (21.6× vs. the 3× rollback threshold). Phase B is canceled.
Primary→Verifier flow remains the production analyze path; `ConsensusEngine` and
`PrimaryBackupAIAdvisor` keep running unchanged.

If a "Deep Dive" opt-in feature is later spec'd, the dormant scaffolding
(`FusionAIAdvisor` + `AISpikeController` + `OpenRouterOptions.FusionOptions`)
can be revived behind its own feature flag without needing this refactor.

### Phase C — Admin UI for model selection

**Backend:**

1. Add `AISettings` table (or simpler: a `SettingsKvp` table for user-overridable config) with one row per slot (`AnalysisJudge`, `AnalysisPanelist1..N`, `ChatModel`, `NewsModel`, `FusionPreset`, `FusionMaxToolCalls`).
2. Migration: `Wave22_AdminAIModelOverrides`.
3. `IAIModelResolver` service: reads from DB first, falls back to `appsettings.json` `AI.OpenRouter` values. Replace `IOptions<OpenRouterOptions>` consumers with `IAIModelResolver` injection so changes take effect without restart.
4. New endpoints: `GET /api/admin/ai-models`, `PUT /api/admin/ai-models`, `POST /api/admin/ai-models/test` (issues a tiny ping to a chosen model to verify it's reachable + accepts a prompt).

**Frontend:**

1. New page `/dashboard/settings/ai-models`:
   - Slot pickers (dropdown + free-text override) for Analysis judge, Analysis panel (multi-select), Chat, News, Fusion preset, Fusion max_tool_calls.
   - "Test this model" button next to each slot — hits the `/test` endpoint, displays latency + cost estimate from the ping response.
   - Reset-to-default button per slot.
2. Model catalog: fetch from `https://openrouter.ai/api/v1/models` and cache; allow free-text override for models not yet in the catalog.

### Phase D — Model alias migration

Adopt `~provider/model-latest` everywhere:

1. Update `appsettings.json` and `appsettings.Development.json` defaults:
   - `PrimaryModel`: `google/gemini-3.1-pro-preview` → `~google/gemini-pro-latest`
   - `VerifierModel`: `anthropic/claude-sonnet-4.6` → `~anthropic/claude-sonnet-latest`
   - `ChatModel`: same as Primary alias
   - Add `NewsModel: ~google/gemini-flash-latest`
2. If Phase B ran, set Fusion's analysis_models defaults to aliases as well.
3. Add a docs note on alias semantics (auto-updates to latest stable; production-safe per OpenRouter docs).

### Phase E — News slot wiring (no consumer yet, just the slot)

1. Add `NewsModel` to `OpenRouterOptions`.
2. Register a third `IAIFinancialAdvisor` instance with role `"News"` in DI.
3. Add `appsettings.json` default and admin-UI control.
4. **No consumer code in this wave** — the slot exists ready for the future Market Context Awareness wave.

### Phase F — ChatModel proper wiring (Chatbot prep)

1. Remove the brittle substring trigger in [OpenRouterService.cs:119-130](../../PFMP-API/Services/AI/OpenRouterService.cs#L119-L130).
2. Add `AIPromptRequest.Mode` enum: `Analysis | Chat | News`.
3. `OpenRouterService` selects the model from its role + the request mode (or, post-Phase C, from `IAIModelResolver`).
4. **No chatbot UI in this wave** — the slot exists ready for the AI Chatbot wave.

---

## Phasing summary + dependency graph

```
Phase A (spike, 1–2 days)
  └─→ Decision gate
        ├─ pass: Phase B (Fusion refactor, ~1–2 weeks) ──┐
        └─ fail: skip B                                  │
                                                          ├─→ Phase C (admin UI)
Phase D (aliases) ── independent, ~1 hour ───────────────┤
Phase E (news slot) ── independent, ~2 hours ────────────┤
Phase F (chat slot proper) ── independent, ~half day ────┘
```

**Suggested order:** A → D → E → F → (B if passed) → C. This lets the low-risk wins land first and gives you the admin UI on top of whatever architecture wins the bake-off.

---

## Refactor scope (worst case — Phase B + C both ship)

**Net code change:** −700 LOC (deleted ConsensusEngine + PrimaryBackupAIAdvisor) + ~150 LOC (FusionAIAdvisor) + ~250 LOC (admin UI controllers + page) + ~200 LOC frontend refactor of analyze result rendering = **roughly net zero or slightly negative**, but with substantially better output structure and a UI for model swaps.

**Frontend touchpoints to identify in Phase B:**

- `/dashboard/insights` and any `InsightsView` components reading `ConsensusResult`
- Wherever `BackupCorroboration` / `PrimaryRecommendation` appear in components
- Any tests asserting on the legacy result shape

---

## Open questions for the user (resolve before Phase B kickoff)

1. **Decision threshold for cost vs. quality.** The criteria table above uses 1.7× / 2.5× as cutoffs. Is that the right shape, or do you want different thresholds?
2. **Default Fusion preset for production.** Quality (3 frontier panelists + Opus judge) or Budget (cheaper panelists + Sonnet judge)? My instinct: Budget preset, Sonnet judge for the routine analyze; let the admin UI optionally bump to Quality for the deeper-dive endpoints.
3. **How many panelists by default?** Quality preset gives 3 but you can override. 2 panelists + judge = 3 completions (1.5× current) might be the sweet spot.
4. **Should Phase A run on more than one user?** Today the only fully-populated user is 20. If we ever seed a second test user with materially different financial state, that would broaden the bake-off.
5. **Frontend appetite for the new output.** Are you OK with the analyze view being substantially redesigned to expose `blind spots` and `contradictions` as first-class UI elements? Or do you want them flattened into the existing layout?

---

## Cross-references

- **Memory of this conversation**: full Fusion research + comparison memo lives in the chat transcript at `C:\Users\wired\.claude\projects\c--pfmp\` for the 2026-06-16 session. This wave doc captures the durable design conclusions.
- **Gemini scorecard**: `docs/temp_scorecard_against_gemini_feedback.log` — refreshed 2026-06-16 to confirm prompt readiness.
- **Current AI service surface**:
  - [PFMP-API/Services/AI/OpenRouterService.cs](../../PFMP-API/Services/AI/OpenRouterService.cs)
  - [PFMP-API/Services/AI/OpenRouterOptions.cs](../../PFMP-API/Services/AI/OpenRouterOptions.cs)
  - [PFMP-API/Services/AI/PrimaryBackupAIAdvisor.cs](../../PFMP-API/Services/AI/PrimaryBackupAIAdvisor.cs)
  - [PFMP-API/Services/AI/ConsensusEngine.cs](../../PFMP-API/Services/AI/ConsensusEngine.cs)
  - [PFMP-API/Services/AI/AIIntelligenceService.cs](../../PFMP-API/Services/AI/AIIntelligenceService.cs)
- **Wave 16 prior overhaul**: [wave-16-openrouter-ai-overhaul.md](./wave-16-openrouter-ai-overhaul.md) — this wave continues that thread.

---

## Acceptance criteria for wave closeout

- [x] Phase A spike report committed to `docs/temp_fusion_spike_report.log` with measured cost + quality comparison
- [x] Decision recorded in this doc (Section "Phase A outcome")
- [x] Phase D model aliases migrated in both appsettings files
- [x] Phase E News slot registered in DI (no consumer required)
- [x] Phase F ChatModel triggered by `AIPromptRequest.Mode` enum, not substring sniffing
- [x] Phase C admin UI live at `/dashboard/admin/ai-models` with test-ping per slot
- [n/a] Phase B ran — canceled per rollback verdict, no frontend / refactor needed
- [ ] Roadmap header updated (currently still says "v0.23.0-alpha"; Wave 14 already bumped VERSION to v0.24.0-alpha)
- [ ] VERSION bumped to v0.25.0-alpha at close

---

## Closeout summary (2026-06-20)

### What shipped

**Phase A** — Empirical spike measured Fusion vs. current Primary→Verifier on user 20's cash analysis. Cost ratio 21.6× ($2.305 vs. $0.107), latency 5.3×, quality ~20–30% richer with only 1 of 3 unique insights actually actionable. Past the user's 3× rollback threshold by 7×. Verdict: rollback. Full report at `docs/temp_fusion_spike_report.log`.

**Phase B** — Canceled. The 21.6× cost ratio made it indefensible for routine analyze. Fusion code (`FusionAIAdvisor.cs`, `AISpikeController.cs`, `OpenRouterOptions.FusionOptions`) kept dormant (~350 LOC, `Enabled: false`) as scaffolding for a possible future quarterly "Deep Dive" feature where the cost would amortize.

**Phase C** — Admin UI shipped at `/dashboard/admin/ai-models`. Per-slot cards (Primary / Verifier / Chat / News / Fusion) with model picker (Autocomplete + freeSolo), MaxTokens / Temperature / TopP / ReasoningEffort / ReasoningExclude / ReasoningMaxTokens, Fusion-only fields (Preset / JudgeModel / MaxToolCalls), Test / Clear / Save buttons per slot, and a manual-refresh OpenRouter model catalog. Backed by the `AISettings` EF table, `IAIModelResolver` (DB-first with appsettings fallback + 30s in-memory cache), and `GET/PUT/POST /api/admin/ai-models` endpoints. Test endpoint issues a real "Reply with exactly the word OK" / `max_tokens=10` ping to validate reachability + auth.

**Phase D** — Model aliases adopted: `~google/gemini-pro-latest`, `~anthropic/claude-sonnet-latest`, `~google/gemini-flash-latest` (News default). No more manual model-bump treadmill when OpenRouter promotes a new stable release.

**Phase E** — Third `IAIFinancialAdvisor` instance registered with `"News"` role in DI ([Program.cs:83-89](../../PFMP-API/Program.cs#L83-L89)). No consumer code yet — slot is ready for the future News Aggregator wave.

**Phase F** — `OpenRouterService.DetermineModel` (substring-sniffing the prompt to guess Chat vs. Analysis) replaced by typed `AIPromptMode` enum (`Analysis | Chat | News`) on `AIPromptRequest`. Service now picks the slot from `(Mode, role)` tuple and delegates to `IAIModelResolver`. No more brittle string matching.

### Post-Phase-A prompt refinements (analyst-driven)

After Phase C shipped, the user ran a separate Gemini Pro pass over the full AI prompt to flag remaining issues. That feedback drove a follow-up pass on `AIIntelligenceService.BuildFullFinancialContextAsync` and the system prompt:

**Prompt expansion** (previously-missing fields surfaced to the AI):
- TAX PROFILE: Federal Withholding %, Expected Refund, Expected Payment, Uses CPA flag, Notes textarea.
- New BENEFITS & PROGRAMS section iterating `BenefitCoverage` (non-federal civilian benefits).
- USER PROFILE: HouseholdServiceNotes, explicit Employment Type for non-federal (Military / Contractor / Private).
- Long-Term Obligations: Notes field per item.

**Prompt directives added** (in `SYSTEM_PROMPT`):
- `CONTEXTUAL OVERRIDE PROTOCOL` — account-level notes + behavioral guardrails outrank the generic Analysis Scope and global Financial Goals. Lets the AI honor "frozen / bot-managed" assets without re-recommending movement, and apply Desired Checking Balance against the functional checking vehicle named in account notes rather than the rigid account type.
- `NUMERICAL DATA TRUST POLICY` — pre-computed numerics are authoritative; don't re-fetch to verify prices. Qualitative web research on holdings / institutions still encouraged. Internal-inconsistency flags emit as `DATA INCONSISTENCY:` lines.
- `RESPONSE FORMAT` directive — no conversational preamble, start directly with `## CRITICAL_ALERTS` so parsers don't break on "Here is the analysis you requested" framing.

**Prompt wording / fidelity fixes**:
- "Target Monthly Passive Income" relabeled "Target Monthly Retirement Cash Inflow (All Sources Combined — pension, SS, VA, investments, rental, dividends)" so a literalist LLM doesn't compare it against dividend income alone.
- "Liquidity Buffer: 6.0 months" reframed as "6.0 months of un-covered expenses" with cross-reference to `LIQUIDITY BUFFER ANALYSIS` section — heads off hallucinated shortfalls.
- USER PROFILE "Years of Service" now whole-month arithmetic (`23y 7m`) matching the FEDERAL RETIREMENT BENEFITS "Creditable Service" line. Eliminates 23.6-vs-23y-7m precision drift the verifier was flagging.
- SPENDING ACTUALS empty paths now tell the AI to use the EXPENSES section as the authoritative outflow baseline instead of complaining about missing Plaid data.
- Crypto block's static trailing "Note:" disclaimer removed — was being confused with user-authored notes.

**TSP total alignment with snapshot**:
- The TSP section was reading `TspLifecyclePositions.CurrentMarketValue` (stale unless `TspPriceRefreshJob` happened to have run in the last few hours). Now re-prices every position live from `TSPFundPrices` at prompt-render time, using the same `NetWorthSnapshotJob.GetCachedTspFundPrice` helper the snapshot uses. The ~$4k drift between the TSP section and the snapshot is gone.

### Job scheduling fixes (data integrity prerequisite for the prompt refinements)

Empirical investigation of the TSP / snapshot drift revealed a job-cadence bug: `TspPriceRefreshJob` was scheduled at 22:00 ET and `NetWorthSnapshotJob` at 23:30 ET, but DailyTSP_API observably posts the previous day's EOD prices to its endpoint at ~03:00 ET. Both jobs were running 12 hours before the data was available; the snapshot was always one trading day behind.

- TSP refresh moved to 04:00 ET (1 hour after DailyTSP posts).
- Net worth snapshot moved to 05:00 ET (1 hour after the TSP refresh — clean dependency chain).
- Snapshot job converted from idempotent-skip-if-exists to upsert (so manual re-triggers actually recompute).
- Hangfire `MisfireHandlingMode.Ignorable` applied to both jobs — missed cron ticks are skipped rather than fired late on next startup.
- Timezone resolution switched to IANA `America/New_York` with Windows `Eastern Standard Time` as fallback.

### Code provenance

Final closeout commits:

| Commit | What |
|---|---|
| `cc1cafa` | AI prompt expansion + directives + TSP live-pricing alignment |
| `b58f915` | Job rescheduling + snapshot upsert + misfire handling |
| `dbb5ffb` | Investment Account.Purpose cap 500 → 2000 (parallel to cash-account fix) |
| Earlier | `8654d2c` (Phase A spike), `f4c0c3d` (Phases D/E/F), `ce2fcbe` (Phase C admin UI) |

### What this wave unblocks

- **Next: News Aggregator** — the `News` role advisor is wired and waiting. Slot defaults to `~google/gemini-flash-latest` (cheap, fast, periodic). No consumer yet — that's the Wave 23 candidate.
- **After: AI Chatbot with Memory** — `Chat` slot is properly wired via `AIPromptMode.Chat`. The chatbot UI + persistent conversation memory is the Wave 24 candidate.

### Lessons / non-obvious takeaways

- **Fusion is not a drop-in cheaper replacement for hand-built dual-AI**; it's a different product targeting "deep deliberation at frontier cost." For routine analyze the existing Primary→Verifier with a tight prompt wins on cost AND quality-per-dollar.
- **OpenRouter's `usage.cost` aggregation is broken for Fusion responses** — reports only one underlying completion's cost. Don't trust the API field; use the OpenRouter dashboard as source of truth. Documented in `FusionAIAdvisor.ParseFusionResponse` for future revival.
- **Background-job ordering matters more than the cron string suggests** — the schedule pre-Wave-22 looked sensible on paper (TSP refresh "before" snapshot) but the data source's actual posting cadence made both jobs systematically stale. Worth verifying real cadence against external data sources rather than trusting their published schedule comments.
