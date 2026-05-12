# Wave 14: Spending Analysis & Budgeting

_Created: 2026-05-04_
_Status: Planned_

## Overview

Wave 14 adds spending analysis, budgeting, and cash-flow forecasting to PFMP. Building on Wave 11 / Wave 12.5 (Plaid bank, credit-card, and transaction sync), this wave introduces a dedicated spending dashboard, an extended budget model with period and rollover support, recurring transaction detection (Plaid Recurring Transactions + heuristic fallback for non-Plaid accounts), category-level anomaly alerts, and a 90-day cash-flow forecast with P10 / P50 / P90 confidence bands. AI context gains a capped `=== SPENDING ACTUALS ===` section so the dual-AI pipeline can finally reason over actual spend instead of budget estimates alone.

This is the last major analytical gap on the bank / credit-card side. Wave 13 closed crypto; Wave 15 closed properties; Wave 14 closes the cash-flow loop.

**Prerequisites:**
- Wave 11 + Wave 12.5 (Plaid bank, credit card, and transaction sync) — already complete
- Wave 16 (OpenRouter AI Overhaul) — `BuildFullFinancialContextAsync` must be in place for P4

---

## Why Now?

1. **Plaid already pays for the data.** Bank and credit-card transactions sync daily; categorization is already populated; Plaid's free Recurring Transactions endpoint is available on the same product. Building spending analysis now leverages infrastructure that's already running, with no new vendor cost.

2. **Budget model is unfinished.** `ExpenseBudget` was added during onboarding with no period support and no actuals comparison. The AI sees "user said $1,200/mo on groceries" but never gets told whether they're hitting that number.

3. **AI is reasoning over the wrong signal.** `BuildFullFinancialContextAsync` includes budgeted expenses but no actuals. The dual-AI pipeline cannot give cash-flow advice that reflects reality — only what the user told us during onboarding.

4. **Recurring detection unlocks downstream features.** Knowing the user's recurring outflows (subscriptions, bills, mortgage, insurance) is the foundation for cash-flow forecasting (P4), tighter liquidity-buffer math, and possible bill-negotiation / unused-subscription work later.

---

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Categorization taxonomy** | Hybrid: Plaid primary + detailed taxonomy is authoritative; PFMP tables mirror Plaid types and category strings exactly so future Plaid evolution slots in without remapping. PFMP-only annotations / overrides layered via `SpendingCategoryRule` (read-time application). | Avoids divergence; user manual overrides are stored as rules, not destructive edits to Plaid-synced fields. |
| **Budget model** | Extend `ExpenseBudget` in place: add `PeriodType` (Monthly / Weekly / Biweekly / Annual), `EffectiveFrom`, `EffectiveTo`, `RolloverEnabled`, `RolloverAmount`. Existing rows backfill as `Monthly`, `EffectiveFrom = DateCreated`, `EffectiveTo = null`. | Minimal disruption; AI context continues to read the same table; no orphaned schema. |
| **Recurring detection** | Plaid Recurring Transactions endpoint as primary; heuristic detector (merchant + amount tolerance + cadence over rolling 90d) as fallback for manual-entry / non-Plaid accounts. Both write to a single `RecurringTransactionStream` table with a `Source` discriminator. | Plaid is more accurate but only covers linked accounts. Heuristic catches the rest. Plaid wins on conflict. |
| **Anomaly detection** | Per-category rolling 6-month median + IQR; flag transactions where `(amount - median) / IQR > 2`. Single alert family (`SpendingAnomaly`) with 24h dedup, mirroring Wave 13's alert pattern. | Cheap, explainable, no model training. Tight scope keeps false-positive rate manageable. |
| **Cash-flow forecast** | 90-day horizon. Combines confirmed recurring outflows + recurring inflows + averaged discretionary spend by Plaid primary + scheduled bills (from liability due dates). Surfaces P10 / P50 / P90 confidence bands. | 90 days matches typical bill / paycheck cycles; bands convey uncertainty without false precision. |
| **AI context cap** | New `=== SPENDING ACTUALS ===` section: last 6 months × top 10 Plaid-primary categories + top recurring outflows + top 3 unresolved anomalies. Section opens with an explicit "data is capped to..." statement so the AI does not extrapolate beyond what it sees. | Plaid taxonomy is 16 primary × 100+ detailed; uncapped, this would balloon the prompt. Capping protects both token budget and AI accuracy. |
| **Permission model** | Read-only on Plaid-synced fields; user manual overrides stored in `SpendingCategoryRule` and applied at read time. Never mutate `CashTransaction.PlaidCategory` (Plaid would re-overwrite on next sync). | Mirrors Wave 12.5 "synced field protection" pattern. |
| **Sync frequency** | `SpendingRollupJob` runs after `PlaidSyncJob` (daily ~10:15 PM ET). On-demand recompute available from spending dashboard, rate-limited 1/hour/user (429 + Retry-After). | Same pattern as Wave 13's `CryptoSyncJob`. |
| **Nav placement** | New top-level route `/dashboard/spending`. Not folded into Accounts Hub — different mental model (flow vs balance). | Discoverable; aligns with roadmap Phase 4 daily-experience direction. |
| **Investment + crypto** | Excluded from spending analysis. Buys / sells / dividends / staking rewards are not "spending" and would distort category roll-ups. `Transaction` and `CryptoTransaction` rows never enter the rollup. | Already handled by Wave 12 / Wave 13. |

---

## Data Model

### Extended: `ExpenseBudget` (in place)

New columns added; existing rows backfilled as `PeriodType = Monthly`, `EffectiveFrom = DateCreated`, `EffectiveTo = null`, `RolloverEnabled = false`.

| Field | Type | Notes |
|-------|------|-------|
| (existing) `ExpenseBudgetId`, `UserId`, `Category`, `MonthlyAmount`, `IsEstimated`, `Notes`, timestamps | — | Unchanged |
| `PeriodType` | enum | `Monthly`, `Weekly`, `Biweekly`, `Annual` |
| `EffectiveFrom` | DateTime | When this budget begins applying |
| `EffectiveTo` | DateTime? | Null = open-ended |
| `RolloverEnabled` | bool | If true, unspent rolls into next period |
| `RolloverAmount` | decimal(18, 4) | Cached rollover from prior period |
| `PlaidPrimaryCategory` | string? | Plaid-compatible primary (e.g., `FOOD_AND_DRINK`); null = freeform |
| `PlaidDetailedCategory` | string? | Plaid-compatible detail (e.g., `FOOD_AND_DRINK_RESTAURANTS`); optional |

Unique index: `(UserId, PlaidPrimaryCategory, PlaidDetailedCategory, EffectiveFrom)` — allows time-boxed budget changes without duplicates.

### New: `SpendingCategoryRule`

User-defined recategorization rules. Applied at read time when computing roll-ups; never mutates the underlying `CashTransaction.PlaidCategory`.

| Field | Type | Notes |
|-------|------|-------|
| `RuleId` | int (PK) | |
| `UserId` | int (FK) | |
| `MatchType` | enum | `MerchantExact`, `MerchantContains`, `DescriptionContains`, `PlaidDetailedCategory` |
| `MatchValue` | string | The string to match |
| `AssignedPrimaryCategory` | string | Plaid-compatible primary |
| `AssignedDetailedCategory` | string? | Plaid-compatible detailed (optional) |
| `Priority` | int | Lower = applied first; ties broken by `RuleId` |
| `IsActive` | bool | |
| `DateCreated` / `DateUpdated` | DateTime | |

### New: `RecurringTransactionStream`

Mirrors Plaid's Recurring Transactions response. Heuristic-detected streams populate the same table with `Source = Heuristic`.

| Field | Type | Notes |
|-------|------|-------|
| `StreamId` | int (PK) | |
| `UserId` | int (FK) | |
| `Source` | enum | `PlaidRecurring`, `Heuristic` |
| `PlaidStreamId` | string? | Populated when `Source = PlaidRecurring`; uniqueness key |
| `MerchantName` | string | |
| `Description` | string? | |
| `Direction` | enum | `Inflow`, `Outflow` |
| `AverageAmount` | decimal(18, 4) | |
| `LastAmount` | decimal(18, 4) | |
| `Frequency` | enum | `Weekly`, `Biweekly`, `SemiMonthly`, `Monthly`, `Annual`, `Unknown` (mirrors Plaid frequencies) |
| `LastDate` | DateTime | |
| `NextExpectedDate` | DateTime? | Null when status is `EarlyDetection` |
| `IsActive` | bool | |
| `Status` | enum | `Mature`, `EarlyDetection`, `Tombstoned` (mirrors Plaid) |
| `ConfidenceScore` | decimal(5, 4)? | Heuristic only; Plaid is taken as authoritative |
| `PlaidCategory` | string? | Carried through from Plaid where available |
| `DateCreated` / `DateUpdated` | DateTime | |

Unique index: `(UserId, Source, PlaidStreamId)` — Plaid streams idempotent on stream id. Heuristic streams use `(UserId, MerchantName, Direction, Frequency)` as a soft uniqueness key with conflict resolution favoring Plaid.

### New: `SpendingCategoryRollup` (cache)

Pre-computed monthly roll-ups. Refreshed by `SpendingRollupJob` after every Plaid sync. Drives the spending dashboard and the AI context section.

| Field | Type | Notes |
|-------|------|-------|
| `RollupId` | int (PK) | |
| `UserId` | int (FK) | |
| `PeriodStart` | DateTime | First day of the calendar month, UTC |
| `PlaidPrimaryCategory` | string | Plaid-compatible primary |
| `PlaidDetailedCategory` | string? | Plaid-compatible detail |
| `ActualAmount` | decimal(18, 4) | Sum of qualifying tx for the period (after rule overrides) |
| `BudgetedAmount` | decimal(18, 4)? | From applicable `ExpenseBudget` |
| `TransactionCount` | int | |
| `DateUpdated` | DateTime | |

Unique index: `(UserId, PeriodStart, PlaidPrimaryCategory, PlaidDetailedCategory)`.

### New: `SpendingAnomaly`

Persists IQR-flagged transactions so the dashboard can show history without recomputing.

| Field | Type | Notes |
|-------|------|-------|
| `AnomalyId` | int (PK) | |
| `UserId` | int (FK) | |
| `CashTransactionId` | int (FK) | |
| `PlaidPrimaryCategory` | string | |
| `Amount` | decimal(18, 4) | |
| `CategoryMedian` | decimal(18, 4) | Trailing 6-month |
| `CategoryIqr` | decimal(18, 4) | Trailing 6-month |
| `DeviationMultiple` | decimal(8, 4) | `(Amount - Median) / IQR` |
| `DetectedAt` | DateTime | |
| `Dismissed` | bool | User dismissed from UI |

Unique index: `(CashTransactionId)` — anomaly is tied 1:1 to the underlying transaction.

---

## Phasing

### Phase 1 — Backend Foundation 📋

**Backend**
- Migration: extend `ExpenseBudget`; add `SpendingCategoryRule`, `RecurringTransactionStream`, `SpendingCategoryRollup`, `SpendingAnomaly`
- `SpendingAnalyticsService` — monthly roll-ups, budget-vs-actual variance, top-N merchant aggregation, cash-flow summary
- `BudgetService` — period-aware CRUD, rollover computation when crossing periods
- `CategoryRuleService` — applies rules at read time when computing roll-ups
- `SpendingController` endpoints:
  - `GET    /api/spending/summary?userId=&from=&to=`
  - `GET    /api/spending/by-category?userId=&periodStart=&periodEnd=`
  - `GET    /api/spending/budgets?userId=&asOf=`
  - `POST   /api/spending/budgets`
  - `PUT    /api/spending/budgets/{id}`
  - `DELETE /api/spending/budgets/{id}`
  - `GET    /api/spending/top-merchants?userId=&limit=&from=&to=`
  - `GET    /api/spending/transactions?userId=&category=&from=&to=`
  - `GET    /api/spending/rules`
  - `POST   /api/spending/rules`
  - `PUT    /api/spending/rules/{id}`
  - `DELETE /api/spending/rules/{id}`
  - `POST   /api/spending/recompute` (rate-limited 1/hour/user, 429 + Retry-After)
- Hangfire: `SpendingRollupJob` daily ~10:15 PM ET (chained after `PlaidSyncJob`)
- Tests: `SpendingAnalyticsServiceTests`, `BudgetServiceTests`, `CategoryRuleServiceTests`, `SpendingControllerTests`

**Acceptance**
- Existing `ExpenseBudget` rows continue to drive AI context with no behavior change
- `GET /api/spending/by-category` returns Plaid-primary roll-ups with rule overrides applied
- Re-running the rollup job is idempotent (no duplicate rows; `(UserId, PeriodStart, ...)` unique)
- Manual recompute respects 1/hour/user rate limit

### Phase 2 — Frontend Spending Dashboard 📋

- New route `/dashboard/spending`; sidebar entry between Accounts and Insights
- `SpendingOverview` page composed of:
  - `MonthlySummaryCard` — total in / out / net, change vs prior month
  - `CategoryBreakdownChart` — donut + table on Plaid primary, click to drill into detailed
  - `BudgetVsActualPanel` — per-category bars, over / under indicators, period selector
  - `TopMerchantsTable` — top 10 outflows; click to filter transactions
  - `RecentTransactionsTable` — paged, with inline category override → "apply as rule going forward" checkbox
- `BudgetEditorDialog` — period type, effective dates, rollover toggle, Plaid category picker
- `spendingApi` service mirroring `cryptoApi` shape; MSW handlers; test fixtures
- Tests: Vitest cases for each panel + budget editor + override flow

**Acceptance**
- All views read from rollup cache (no on-the-fly aggregation in the request path)
- Manual recategorization creates a `SpendingCategoryRule`; rollup recomputes and reflects the change within the same session
- Budget editor handles all four `PeriodType`s and the rollover edge case (period crossing)

### Phase 3 — Recurring Detection + Anomaly Alerts 📋

- Extend `PlaidService` with `SyncRecurringTransactionsAsync(connectionId)` — populates `RecurringTransactionStream` rows where `Source = PlaidRecurring`
- `HeuristicRecurringDetector` — clusters non-Plaid `CashTransaction` rows by merchant + amount tolerance (±5%) + cadence; writes `Source = Heuristic` rows; runs nightly within `SpendingRollupJob`
- `AnomalyDetectionService` — IQR-based; writes `SpendingAnomaly` rows; hooked into `SpendingRollupJob`
- `SpendingAlertService` — single alert family `SpendingAnomaly` with 24h dedup via JSON `AlertKey`; severity High at deviation ≥ 4× IQR, Medium otherwise; Category `Spending`; ActionUrl `/dashboard/spending`
- New endpoints:
  - `GET  /api/spending/recurring?userId=&direction=&isActive=`
  - `POST /api/spending/recurring/{id}/dismiss`
  - `GET  /api/spending/anomalies?userId=&dismissed=`
  - `POST /api/spending/anomalies/{id}/dismiss`
- Frontend:
  - `RecurringStreamsPanel` on the spending dashboard (inflows / outflows tabs)
  - `AnomalyAlertsCard` summarizing recent anomalies + dismiss action
- Tests: heuristic detector unit tests with synthetic transaction series; anomaly service IQR math; alert dedup contract; controller integration tests; Vitest panel tests

**Acceptance**
- Plaid Recurring sync is idempotent on `PlaidStreamId`
- Heuristic detector does not duplicate streams that Plaid already covers (Plaid wins on same merchant + cadence)
- Anomaly alerts dedup within 24h on `(UserId, CashTransactionId)`
- Dismissed anomalies do not regenerate
- Categories with fewer than 6 transactions in the trailing 6 months are suppressed from anomaly evaluation

### Phase 4 — AI Context + Cash-Flow Forecast 📋

- `BuildFullFinancialContextAsync` gains `=== SPENDING ACTUALS ===` section:
  - **Cap statement (mandatory first line):** `Data shown is capped to the last 6 months and the top 10 Plaid-primary categories. Do not extrapolate beyond this window.`
  - Body: per-month totals (last 6 months); top 10 Plaid primary categories with monthly average + budget variance; top 5 recurring outflows (merchant, amount, frequency); top 3 unresolved anomalies
  - Renders `None — no transaction data available.` line when the user has no Plaid bank or credit-card connections
- `CashFlowForecastService` — 90-day horizon
  - Inputs: confirmed `RecurringTransactionStream` (in + out, `Mature` status only for P50) + averaged discretionary by Plaid primary + scheduled bills from liability due dates
  - Outputs: daily projected balance with P10 / P50 / P90 bands
  - Caches result; recomputes on rollup refresh
- New endpoints:
  - `GET /api/spending/forecast?userId=&horizonDays=`
  - `GET /api/spending/forecast/recurring-impact` (per-stream contribution to forecast)
- Frontend:
  - `CashFlowForecastChart` on spending dashboard (line + shaded bands, 90-day x-axis)
  - "Why this forecast" drawer listing the recurring streams and average rates feeding it
- Postman: bump collection to v1.14.0 with full Spending folder + AI analyze example showing the new Spending Actuals section
- Tests: forecast math unit tests (synthetic stream sets); AI context shape + cap snapshot test; Vitest forecast chart

**Acceptance**
- AI context section never exceeds the documented cap; verified by snapshot test
- Forecast recomputes when streams change (new stream → next forecast incorporates it)
- 90-day forecast P50 within ±5% of a hand-computed control case from synthetic input
- Postman collection at v1.14.0 includes spending endpoints + AI analyze example with the new context section

---

## Out of Scope

- **Tax form export (Form 8949 generation)** — deferred to **Wave 14.5** as the dedicated tax-export follow-on. Wave 14.5 will produce IRS Form 8949 (Sales and Other Dispositions of Capital Assets) and Schedule D inputs from the realized P/L work shipped in Wave 13 P3 plus any taxable cash-flow events catalogued in Wave 14. Cross-referenced from `wave-13-crypto-exchanges.md`.
- **Wave 13.5 (self-custody wallets)** — no dependency in either direction; Wave 14 ships with or without it
- **Investment + crypto transactions in spending analysis** — `Transaction` and `CryptoTransaction` rows are excluded from spending roll-ups; they remain visible in their own dashboards
- **Multi-currency normalization** — all transactions assumed USD; FX-converted Plaid transactions inherit the converted amount
- **Receipt OCR / image upload** — out of scope for this wave
- **Bill negotiation / SaaS audit / "find unused subscriptions"** — adjacent to recurring detection but a separate UX surface; possible Wave 14.6 follow-on
- **Real-time forecast updates** — daily cache refresh is sufficient; no websocket layer

---

## Risks & Open Questions

| Risk | Mitigation |
|------|-----------|
| **Plaid Recurring Transactions data quality** — the endpoint returns `early_detection` status for streams it isn't fully sure about. | Persist `Status` field; UI marks early-detection streams with a "tentative" badge; only `Mature` streams contribute to forecast P50. |
| **Manual override clobbering on Plaid re-sync** — Plaid sync overwrites `CashTransaction.PlaidCategory` on every refresh. | Overrides stored in `SpendingCategoryRule`, applied at read time; never mutate the underlying tx column. Same pattern as Wave 12.5 synced-field protection. |
| **AI context bloat** — Plaid taxonomy is 16 primary × 100+ detailed × 6 months = thousands of cells uncapped. | Hard cap at 6 months × top 10 categories (Plaid primary only); explicit cap statement in the prompt's first line; snapshot test enforces section size. |
| **Anomaly false positives** — small categories with thin history (e.g., one-off medical expense) generate noisy IQR alerts. | Suppress alerts when category has fewer than 6 transactions in trailing 6 months; tune deviation multiple in P3. |
| **Budget rollover edge cases** — period boundary crossings (e.g., user changes from Monthly to Biweekly mid-quarter). | Effective-dated budgets — old budget closes via `EffectiveTo`, new one opens with `EffectiveFrom`; rollover only applies within a continuous chain of the same period type. |
| **Heuristic recurring duplicates Plaid streams** — same merchant detected twice. | Heuristic detector skips merchants Plaid already returned; Plaid wins on conflict. |

Open questions to revisit before P3:
- Should heuristic-detected streams contribute to the forecast at all, or only Plaid `Mature` streams? (Tentative: heuristic contributes to P10 / P90 bands only, not P50.)
- Do we expose raw Plaid detailed categories to the user, or only PFMP-curated groupings on the dashboard? (Tentative: Plaid detailed shown as drill-down only, never as the top-level chart.)

---

## Acceptance for Wave 14 Closeout

- [ ] All four phases shipped, with their per-phase acceptance criteria met
- [ ] Backend test count growth meets target across services, rollup job, and controllers
- [ ] Frontend test count growth meets target across spending dashboard, budget editor, recurring panel, anomaly card, and forecast chart
- [ ] Postman collection bumped to v1.14.0 with spending endpoints + AI analyze example showing the capped Spending Actuals section
- [ ] `BuildFullFinancialContextAsync` includes the capped Spending Actuals section with the explicit cap statement as its first line
- [ ] `docs/history/roadmap.md`, `docs/documentation-map.md`, and `README.md` highlights refreshed
- [ ] `VERSION` bumped on Wave 14 completion
