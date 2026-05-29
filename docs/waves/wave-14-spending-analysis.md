# Wave 14: Spending Analysis & Budgeting

_Created: 2026-05-04_
_Last updated: 2026-05-29 (P1 ✅, P2 ✅, Net-vs-Gross basis toggle ✅, cash-account allotment destinations ✅; P2.5 Income Frequency Model 📋 planned next; P3 + P4 📋)_
_Status: P1 + P2 shipped; P2.5 design pending implementation; P3 + P4 still planned_

## Overview

Wave 14 adds spending analysis, budgeting, **cash-flow reconciliation**, and 90-day forecasting to PFMP. Building on Wave 11 / Wave 12.5 (Plaid bank, credit-card, and transaction sync), this wave introduces a dedicated spending dashboard, an extended budget model with period and rollover support, recurring transaction detection (Plaid Recurring Transactions + heuristic fallback for non-Plaid accounts), category-level anomaly alerts, and a 90-day cash-flow forecast with P10 / P50 / P90 confidence bands. AI context gains a capped `=== CASH FLOW SUMMARY ===` section that combines profile-reported baseline (IncomeSources, ExpenseBudgets, InsurancePolicies, federal benefits) with Plaid observed actuals, so the dual-AI pipeline reasons over a reconciled picture rather than budget estimates alone.

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
| **AI context cap** | New `=== CASH FLOW SUMMARY ===` section: profile baseline (monthly inflows by `IncomeType`, outflows by `ExpenseBudget` category + insurance premiums + federal benefit deductions) + Plaid observed (last 6 months × top 10 Plaid-primary categories + top recurring streams + top 3 unresolved anomalies). Section opens with an explicit "data is capped to..." statement. | Plaid taxonomy is 16 primary × 100+ detailed; uncapped, this would balloon the prompt. Profile baseline is small and stable — included in full so the AI sees the user's intent vs reality. |
| **Cash-flow reconciliation** | Three-layer model: **Profile Baseline** (`IncomeSource` + `ExpenseBudget` + `FinancialProfileInsurancePolicy` + federal benefits) → **Plaid Observed** (`CashTransaction` + `RecurringTransactionStream`) → **Reconciled Cash Flow** (`CashFlowSummaryService` picks canonical source per stream, flags variances). Plaid wins where it has `Mature` recurring data; profile fills gaps; profile-only items (VA disability to a non-linked account, payroll-deducted FEGLI, etc.) carry a "Profile only" tag. | Originally Wave 14 was framed around Plaid actuals only, but PFMP already knows a lot from onboarding (VA disability, insurance premiums, TSP / FEHB deductions). Ignoring that would give worse numbers than a fresh user gets. Reconciliation surfaces what hits the bank vs what the user reported. |
| **Allotments** | Three nullable columns on `IncomeStreamProfile` (the canonical source standardized in this wave — `IncomeSource` is the legacy parallel model retained for the dedicated controller): `AllotmentType` enum (`None` / `SavingsToLinkedAccount` / `ExternalOutflow` / `Other`) + `AllotmentDestinationAccountId` (FK to investment `Account`, nullable) + `AllotmentDestinationCashAccountId` (FK to `CashAccount`, nullable — added P2 because most DFAS savings allotments land in a checking / savings / MM account, not a brokerage). Semantics: `SavingsToLinkedAccount` with destination set → internal transfer (neutral to net cash flow, suppresses matching Plaid deposit on destination to prevent double-count); `ExternalOutflow` → reduces net cash flow (child support, support payments to outside parties); `Other` → ambiguous, flagged in AI context. Set EITHER `AllotmentDestinationAccountId` OR `AllotmentDestinationCashAccountId`, never both. | LES allotments don't fit the income-vs-expense dichotomy cleanly. Federal users on DFAS routinely route part of pay to savings; child-support allotments are pure outflows masquerading as paycheck deductions. Capturing the destination + type avoids both double-counting (savings allotment lands in Plaid too) and undercounting (external allotment never appears in Plaid). |
| **Cash-flow basis (Gross vs Net)** | Per-stream toggle `IncomeStreamCashFlowBasis` (enum: `Gross` \| `Net`, default `Net`) on `IncomeStreamProfile`. `Net` consumes `MonthlyNetAmount` for inflow math; falls back to `MonthlyAmount` with an `IsMissingNetAmount` flag when net is null. `Gross` consumes `MonthlyAmount` directly. AI prompt continues to include BOTH gross + net regardless of basis so the model can reason about either. | Added P2 (2026-05-28). Default of Gross overstated net cash flow because the dashboard's outflow side does not model payroll deductions (federal/state tax, FICA, TSP contributions, FEHB / FEGLI premiums, etc.). Without a way to opt into Net, a $12,000/mo GS-13 salary inflated cash flow by ~$4,700/mo of invisible deductions. Toggle lets users avoid this without forcing the outflow side to grow new "payroll deductions" categories. |
| **Income frequency model (P2.5 — planned)** | Add `AmountFrequency` enum to `IncomeStreamProfile` (`Weekly` / `Biweekly` / `Semimonthly` / `Monthly`; default `Monthly`) + treat `MonthlyAmount` / `MonthlyNetAmount` as stored monthly equivalents derived from a per-period entry the user provides. Same fields applied to allotments so a `$450 biweekly` allotment renders as `$975/mo` on the dashboard. Conversion factors: weekly ×52/12, biweekly ×26/12, semimonthly (military / DFAS 1st & 15th) ×2, monthly ×1. | Federal civilian paychecks are biweekly; active-duty military is semimonthly. Forcing users to do the math is a UX wart and a data-quality hazard — they enter wrong monthly figures from rough arithmetic. Storing the per-period amount + frequency keeps the LES figure as source of truth and lets the dashboard reconcile to monthly without losing fidelity. See **Phase 2.5** below for full design. |
| **Internal-transfer exclusion** | `SpendingAnalyticsService` and `CashFlowSummaryService` exclude transactions whose `PlaidCategoryDetailed` matches a configurable list of internal-transfer categories: `LOAN_PAYMENTS_CREDIT_CARD_PAYMENT`, `TRANSFER_IN_ACCOUNT_TRANSFER`, `TRANSFER_OUT_ACCOUNT_TRANSFER`, `TRANSFER_IN_DEPOSIT` (when counterparty is a user-owned account), `TRANSFER_OUT_WITHDRAWAL` (when counterparty is a user-owned account). List stored in `appsettings` so it can be tuned without code changes. | Credit-card-heavy users have a $0 outflow picture if you sum bank tx (one big monthly CC payment looks like a single expense). Real outflows are the CC purchases. Excluding the payment line prevents double-counting (CC payment from bank + the CC purchases that the payment paid for); excluding own-account transfers prevents the same artifact for savings sweeps. |
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

### Extended: `IncomeStreamProfile` (canonical — allotment support)

Two nullable columns added so LES allotments can be captured without a separate table. Existing rows default to `AllotmentType = None`. **Note:** PFMP has two income models — the rich `IncomeSource` (used by the dedicated `IncomeSourcesController`) and the simpler `IncomeStreamProfile` (used by the Profile editor and what onboarding writes to). Wave 14 standardizes on `IncomeStreamProfile` as the canonical source for cash-flow reconciliation because it's what the user-facing Profile UI manages.

| Field | Type | Notes |
|-------|------|-------|
| (existing) `IncomeStreamId` (Guid), `UserId`, `Name`, `IncomeType` (string), `MonthlyAmount`, `AnnualAmount`, `IsGuaranteed`, `IsActive`, timestamps | — | Unchanged |
| `AllotmentType` | enum | `None` (default — regular income); `SavingsToLinkedAccount` (DFAS savings allotment to a PFMP-tracked account); `ExternalOutflow` (child support / outside party); `Other` (ambiguous — flagged) |
| `AllotmentDestinationAccountId` | int? | FK to `Account.AccountId` when `AllotmentType = SavingsToLinkedAccount`; null otherwise |

Semantics applied by `CashFlowSummaryService`:
- `None` — counts as inflow toward Total Monthly Inflows
- `SavingsToLinkedAccount` with destination set — internal transfer, neutral to net cash flow; the matching Plaid deposit on the destination account should be filtered from inflow totals to prevent double-counting (P3 work — depends on Plaid recurring stream matching); visible in the dashboard as a "Savings Allotments" line for transparency
- `ExternalOutflow` — reduces net cash flow, appears in outflows breakdown as "External Allotment: {Name}"
- `Other` — counted as inflow but tagged "ambiguous allotment" in AI context

Editing happens in the Profile editor's **Income tab** ([pfmp-frontend/src/views/dashboard/ProfileView.tsx](../../pfmp-frontend/src/views/dashboard/ProfileView.tsx)) — each income row has an allotment dropdown that reveals a destination account picker when `SavingsToLinkedAccount` is chosen. LES parser hookup remains deferred (Wave 20-bis); the schema and UI just make the room.

### Note on the legacy `IncomeSource` columns

The `IncomeSource` table also has `AllotmentType` + `AllotmentDestinationAccountId` columns from an earlier P1 design pass. These are inert for cash-flow purposes (the service no longer reads them). They remain in the schema in case the rich income model is revived for richer features in a future wave — removing them would be a destructive migration for no current benefit.

---

## Cash Flow Reconciliation

Three layers, reconciled by `CashFlowSummaryService` at presentation:

| Layer | Source | Update cadence |
|-------|--------|----------------|
| **Profile Baseline** | `IncomeSource` (with allotments) + `ExpenseBudget` + `FinancialProfileInsurancePolicy` + federal benefits fields on `User` | Static — only changes when the user edits |
| **Plaid Observed** | `CashTransaction` rows (after internal-transfer exclusion) + `RecurringTransactionStream` (Wave 14 P3) | Daily via `PlaidSyncJob` + `SpendingRollupJob` |
| **Reconciled Cash Flow** | Service merges both per stream, picks canonical source, flags variances ≥10% | Computed on rollup refresh |

**Conflict resolution per stream:**
- Plaid wins where it has `Mature` recurring data
- Profile fills any stream Plaid does not cover (VA disability to a non-linked account, payroll-deducted FEGLI / FEHB / TSP contributions, savings allotments to non-linked accounts)
- When both report the same stream with delta ≥ 10%, emit a "Profile Variance" advisory (informational, not an alert)

**Internal-transfer exclusion list** (configurable via `Spending:InternalTransferCategories` in `appsettings`):
```
LOAN_PAYMENTS_CREDIT_CARD_PAYMENT
TRANSFER_IN_ACCOUNT_TRANSFER
TRANSFER_OUT_ACCOUNT_TRANSFER
TRANSFER_IN_DEPOSIT                 (counterparty is user-owned)
TRANSFER_OUT_WITHDRAWAL             (counterparty is user-owned)
```

The `SpendingCategoryRollup` and the cash-flow service apply this filter at aggregation time so credit-card-heavy users see real spending in category breakdowns (the CC purchases) rather than the monthly payoff appearing as a single outflow.

**Cash Flow Summary shape** (returned by `GET /api/spending/cash-flow-summary?userId=`):

```jsonc
{
  "totalMonthlyInflows": 8420.50,
  "totalMonthlyOutflows": 6135.20,
  "netMonthlyCashFlow": 2285.30,
  "inflows": {
    "byIncomeType": [
      { "type": "Salary", "amount": 5500.00, "source": "Plaid", "variancePercent": 0.0 },
      { "type": "VADisability", "amount": 2420.50, "source": "Profile", "isProfileOnly": true }
    ],
    "savingsAllotments": [
      { "incomeSourceId": 12, "amount": 500.00, "destinationAccountId": 287, "destinationName": "USAA Savings" }
    ]
  },
  "outflows": {
    "byPlaidPrimary": [
      { "category": "FOOD_AND_DRINK", "actual": 720.40, "budgeted": 800.00, "source": "Plaid" },
      { "category": "INSURANCE", "actual": 412.00, "budgeted": 412.00, "source": "Profile", "isProfileOnly": true }
    ],
    "payrollDeductions": { "tspContribution": 825.00, "federalTax": 880.00, "stateTax": 220.00, "fehbPremium": 165.00, "fegli": 12.00 },
    "externalAllotments": [
      { "incomeSourceId": 13, "amount": 0.00, "notes": "n/a" }
    ]
  },
  "variances": [
    { "stream": "Salary", "profile": 5500.00, "plaid": 5510.20, "deltaPercent": 0.18, "severity": "info" }
  ],
  "asOf": "2026-05-12T13:45:00Z"
}
```

---

## Phasing

### Phase 1 — Backend Foundation ✅ Shipped (2026-05-16)

**Backend**
- Migration `20260516225700_Wave14_SpendingAnalysis`: extends `ExpenseBudget` (period/effective/rollover/Plaid category); adds `SpendingCategoryRule`, `RecurringTransactionStream`, `SpendingCategoryRollup`, `SpendingAnomaly` tables
- Migration `20260517041809_Wave14_IncomeStreamAllotments`: adds `AllotmentType` + `AllotmentDestinationAccountId` to `IncomeStreams` (the canonical model the Profile editor writes to; `IncomeSource` retained for its dedicated controller)
- Backfill SQL for existing `ExpenseBudget` rows (`EffectiveFrom = CreatedAt`) to handle Postgres `-infinity` defaults
- Backfill of 32 legacy `ExpenseBudget` rows to map freeform categories to `PlaidPrimaryCategory` (Housing/Utilities → `RENT_AND_UTILITIES`, Food → `FOOD_AND_DRINK`, Charitable → `GOVERNMENT_AND_NON_PROFIT`, etc.) so budget vs actual reconciles
- `BudgetService` — period-aware CRUD, rollover computation when crossing periods
- `CategoryRuleService` — applies rules at read time when computing roll-ups
- `SpendingAnalyticsService` — monthly roll-ups (with internal-transfer exclusion applied), budget-vs-actual variance, top-N merchant aggregation
- `CashFlowSummaryService` — reconciles Profile Baseline (`IncomeSource` + `ExpenseBudget` + `FinancialProfileInsurancePolicy` + federal benefits) with Plaid Observed; applies allotment semantics; emits the cash-flow summary shape above
- `SpendingController` endpoints:
  - `GET    /api/spending/summary?userId=&from=&to=`
  - `GET    /api/spending/cash-flow-summary?userId=`  ← new in this refinement
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
- Configuration: `Spending:InternalTransferCategories` in `appsettings.json` lists Plaid detailed categories excluded from spending totals
- Hangfire: `SpendingRollupJob` daily ~10:15 PM ET (chained after `PlaidSyncJob`)
- Tests: `BudgetServiceTests`, `CategoryRuleServiceTests`, `SpendingAnalyticsServiceTests`, `CashFlowSummaryServiceTests` (including allotment + internal-transfer scenarios), `SpendingControllerTests`

**Acceptance**
- Existing `ExpenseBudget` rows continue to drive AI context with no behavior change
- `GET /api/spending/by-category` returns Plaid-primary roll-ups with rule overrides applied
- `GET /api/spending/cash-flow-summary` returns reconciled inflows/outflows with allotments routed correctly (savings allotment with destination → internal transfer, neutral; external allotment → outflow) and CC payoff transactions excluded from outflows
- Re-running the rollup job is idempotent (no duplicate rows; `(UserId, PeriodStart, ...)` unique)
- Manual recompute respects 1/hour/user rate limit

### Phase 2 — Frontend Spending Dashboard ✅ Shipped (2026-05-29)

**Route + nav**
- New top-level route `/dashboard/spending`; sidebar entry between Accounts and Crypto ([AppRouter.tsx](../../pfmp-frontend/src/AppRouter.tsx), [DashboardNav.tsx](../../pfmp-frontend/src/layout/DashboardNav.tsx)); breadcrumb wired ([DashboardBreadcrumbs.tsx](../../pfmp-frontend/src/components/navigation/DashboardBreadcrumbs.tsx))

**Panels (single scrollable page; tabs deferred to P3 when rules/recurring/anomalies arrive)**
- `CashFlowSummaryCard` — top card; inflows / outflows / net + inflow sources + savings allotments (informational) + external allotments (outflow) + insurance premiums + variance alerts
- `MonthlySummaryCard` — totals + transaction count + Recompute button (calls `POST /api/spending/recompute`; rate-limited 1/hour/user; surfaces "Recomputed at" timestamp)
- `CategoryBreakdownChart` — Recharts donut + right-side list grouped by Plaid primary; expandable rows reveal detailed categories; resolves the "duplicate Plaid primary row" cosmetic via the `groupByPlaidPrimary` helper in [spendingApi.ts](../../pfmp-frontend/src/services/spendingApi.ts)
- `BudgetVsActualPanel` — progress bars per Plaid primary; "Over budget" / "No budget" / "Unspent" / "Estimate" chips; per-row edit pencil; "New Budget" button
- `BudgetEditorDialog` — Plaid primary dropdown, period type, effective dates, rollover toggle, delete; modal pattern matches the holding transaction modal
- `TopMerchantsTable` — top 10 by total spend
- `RecentTransactionsTable` — last 25 with sign-colored amounts (outflow red, inflow green)

**Month picker**
- Current month default; arrows + 12-month dropdown to navigate prior months
- All panels refetch with the selected window

**Service + tests**
- `spendingApi` service ([spendingApi.ts](../../pfmp-frontend/src/services/spendingApi.ts)) mirrors `cryptoApi` shape; types match backend records
- 15 panel unit tests + 1 MSW-backed `SpendingView` integration test; ProfileView test gained mocks for `listUserAccounts` + `listCashAccounts` to match the new mount-time fetches

**Cash-flow basis toggle (added during P2; see Design Decisions row above)**
- Migration `20260529011457_Wave14_IncomeStreamCashFlowBasis` adds `CashFlowBasis` column to `IncomeStreams` (defaults to `Net` = 1; existing rows backfilled to Net)
- `CashFlowSummaryService.ResolveCashFlowAmount()` picks gross vs net per stream; `InflowByType` carries `Basis` + `IsMissingNetAmount` flags
- Profile Income tab gained a Net/Gross `ToggleButtonGroup` per stream; persists via the existing income upsert (DTO round-trip closed for `cashFlowBasis`, plus `allotmentType` and `allotmentDestinationAccountId` which were missing from the upsert payload — fixed)

**Cash-account allotment destinations (added during P2)**
- Migration `20260529165531_Wave14_IncomeStreamAllotmentCashDest` adds `AllotmentDestinationCashAccountId Guid?` to `IncomeStreams`
- `CashFlowSummaryService` now resolves destination name from either investment Account OR CashAccount tables
- Profile Income tab destination picker lists cash accounts first (Cash · Savings, Cash · Checking, Cash · MoneyMarket), investment accounts after, each with a sublabel
- Allotment field renamed to "Paycheck routing / deduction" with an info tooltip; option labels rewritten to be self-explanatory (None / Allotment to my own account / Garnishment / Other)
- Per-option caption now basis-aware ("Your Monthly Net $ already excludes this; the line is shown for reference" when basis = Net and routing = Garnishment)
- Guaranteed / Active Switch labels widened from `md: 1` to `md: 2` with left padding to fix the overlap

**Acceptance** (all met)
- All views read from rollup cache or the live summary endpoint (no client-side aggregation in the rendering path beyond the Plaid-primary grouping helper)
- Budget editor handles all four `PeriodType`s; rollover toggle persists
- Cash-flow summary returns reconciled inflows/outflows with allotments routed correctly
- User-20 dashboard reads: $10,439.03 inflows / $3,048.82 outflows / +$7,390.21 net (with Net basis) — was $15,200 / $3,048.82 / $12,151.18 under the old Gross-default before this wave

### Phase 2.5 — Income Frequency Model 📋 Planned (designed 2026-05-29)

**Problem**
Wave 14 P1 and P2 assume monthly-equivalent amounts everywhere, but real paychecks are not monthly:
- **Federal civilian**: biweekly (every other Friday, 26 paychecks/year)
- **Active-duty military / DFAS**: semimonthly (1st and 15th, 24 paychecks/year)
- **Hourly / weekly contracts**: weekly (52 paychecks/year)

Users were forced to do the math themselves (e.g., a $450 biweekly savings allotment becomes "$975/mo" only if the user remembers to multiply by 26/12). This is a UX wart AND a data-quality hazard: users enter rough arithmetic, the LES figure is lost, and partial allotments break entirely because the allotment slice has no amount field of its own — it currently inherits the full income stream's monthly value.

**Scope**
This phase adds (a) a frequency field to income streams so the per-period entry is the source of truth and the monthly value is derived, and (b) per-period amount + frequency fields to allotments so a $450/biweekly slice of a $5,500/biweekly salary is correctly modeled.

**Backend**

| Field | Type | Notes |
|-------|------|-------|
| `IncomeStreamProfile.AmountFrequency` | enum | `Weekly`, `Biweekly`, `Semimonthly`, `Monthly`; default `Monthly` for backward compat |
| `IncomeStreamProfile.PerPeriodAmount` | decimal(18,2)? | What the user enters from their LES / pay stub (e.g., $5,538.46 biweekly). Nullable to preserve legacy monthly-only entries. |
| `IncomeStreamProfile.PerPeriodNetAmount` | decimal(18,2)? | Net-of-deductions per-period equivalent (e.g., $2,769.23 biweekly). Nullable. |
| `IncomeStreamProfile.AllotmentFrequency` | enum | `Weekly`, `Biweekly`, `Semimonthly`, `Monthly`; default `Monthly` |
| `IncomeStreamProfile.AllotmentPerPeriodAmount` | decimal(18,2)? | The user's per-period allotment amount (e.g., $450 biweekly). Nullable for streams with no allotment. |

`MonthlyAmount` / `MonthlyNetAmount` remain the canonical monthly equivalents on the database side — derived on write from `PerPeriodAmount × factor(AmountFrequency)` when the per-period field is provided, or left as the user-entered monthly value when it isn't (existing data path). The service layer computes the same way on read so the AI prompt and dashboard never have to know which path produced the number.

**Conversion factors** (per-period → monthly):

| Frequency | Factor | Pay schedule |
|-----------|--------|--------------|
| `Weekly` | × 52 / 12 ≈ × 4.3333 | Hourly, weekly contracts |
| `Biweekly` | × 26 / 12 ≈ × 2.1667 | Federal civilian (every other Friday) |
| `Semimonthly` | × 2 | DFAS military (1st & 15th); civilian semimonthly (15th & end) |
| `Monthly` | × 1 | Legacy default; salaried with monthly paycheck |

Note: `Semimonthly` is twice a month (24 paychecks/year), distinct from `Biweekly`'s every-14-days (26 paychecks/year). Active-duty DFAS pay is canonically the 1st of the following month + 15th of the current month, treated as ×2 for monthly equivalence.

**Migration** `Wave14_IncomeStreamFrequency`:
- Adds the five columns above with sensible defaults (Monthly + null amounts)
- No backfill needed — existing monthly-only entries continue to work unchanged via the null-per-period path

**`CashFlowSummaryService` updates**
- New helper `ResolveAllotmentMonthlyAmount(IncomeStreamProfile s)` — returns `s.AllotmentPerPeriodAmount * factor(s.AllotmentFrequency)` when per-period set; falls back to `s.MonthlyAmount` (current behavior) when null
- `SavingsAllotment` and `ExternalAllotment` record `Amount` now uses the resolved allotment monthly amount instead of the full stream amount, fixing the long-standing bug where a partial savings allotment was reported as the entire paycheck
- `InflowByType.Amount` continues to use `ResolveCashFlowAmount` (gross vs net) — unchanged in this phase

**AI prompt**
- `=== INCOME SOURCES ===` section gains a `(per period: $X biweekly)` clause after each amount when `PerPeriodAmount` is set, so the AI sees both representations:
  - `• GS-13 Salary | salary | $12,000/mo gross \ $7,239.03/mo net (per period: $5,538.46 biweekly gross \ $3,341.09 biweekly net) | Guaranteed`
- Cap stays the same; this adds at most ~50 chars per stream

**Frontend (ProfileView Income tab)**

Per-stream layout becomes (left to right):
1. Name (md: 2)
2. Type (md: 2)
3. **Per-period Gross $** (md: 2) — replaces "Monthly Gross $" as the primary input
4. **Per-period Net $** (md: 2)
5. **Frequency** dropdown (md: 2): Weekly / Biweekly / Semimonthly (1st & 15th) / Monthly
6. Cash flow basis ToggleButtonGroup (md: 2)
7. Guaranteed switch (md: 2)
8. Active switch (md: 2)

Below the inputs: live-derived caption `≈ $X,XXX.XX/mo gross · $X,XXX.XX/mo net` so the user can sanity-check the math (per option 3A from the pre-flight).

Allotment row (when routing ≠ None) gains:
- **Allotment per-period $** field
- **Allotment frequency** dropdown (defaults to Biweekly per option 2A; can be set independently of the income stream's pay frequency for cases where the user has a monthly direct deposit but a biweekly auto-transfer)
- Live caption `≈ $X,XXX.XX/mo routed to {destination}`

**Backward compatibility**
- Existing rows have `PerPeriodAmount = null`, `AmountFrequency = Monthly`, and a populated `MonthlyAmount` — the editor will detect this on load and render the legacy single "Monthly Gross $" / "Monthly Net $" inputs unless the user explicitly switches the frequency dropdown to a non-monthly value
- Once the user picks a non-monthly frequency, the editor switches to the per-period input + derived caption; on save, `MonthlyAmount` is recomputed from `PerPeriodAmount × factor`
- No coercion on save — if the user wants to keep entering monthly figures forever, that path stays open

**Tests**
- `IncomeFrequencyConversionTests` — table-driven unit test for all four factors with edge cases (null per-period, zero per-period, very large amounts)
- `CashFlowSummaryServiceTests` — extend with a fixture where a $450 biweekly allotment on a $5,538.46 biweekly salary computes to $975/mo savings allotment and $11,083.33/mo gross inflow
- `ProfileView.test.tsx` — add test case for switching frequency from Monthly → Biweekly and seeing the derived monthly caption update; submit flow round-trips `perPeriodAmount` + `amountFrequency`

**Acceptance**
- A user can enter "$450 biweekly" as a savings allotment on a "$5,538.46 biweekly" salary and the dashboard's `SavingsAllotment` line reads "$975.00/mo" with destination set to their savings account
- Existing monthly-only income streams continue to render and save unchanged
- AI prompt for a biweekly user includes the per-period clause; verified by snapshot test
- Frequency `Semimonthly` is documented in-app (tooltip on the dropdown option) as "1st & 15th — DFAS military pay" to disambiguate from biweekly

**Out of scope (deferred)**
- Per-paycheck date-of-deposit tracking (so the dashboard can project "next paycheck on May 31") — possible Phase 4 input but not required for this phase
- Different frequencies for gross vs net on the same stream — assumed identical (the deductions happen on the same paycheck cadence)
- Frequency on `ExpenseBudget` — already has `PeriodType` from P1; no change needed

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

- [x] **Phase 1 — Backend Foundation** shipped 2026-05-16 (migrations applied, services + controller + tests in place)
- [x] **Phase 2 — Frontend Spending Dashboard** shipped 2026-05-29 (panels, page, route, basis toggle, cash-account allotment destinations)
- [ ] **Phase 2.5 — Income Frequency Model** (this revision)
- [ ] **Phase 3 — Recurring Detection + Anomaly Alerts**
- [ ] **Phase 4 — AI Context + 90-Day Cash-Flow Forecast**
- [ ] Backend test count growth meets target across services, rollup job, and controllers
- [ ] Frontend test count growth meets target across spending dashboard, budget editor, recurring panel, anomaly card, and forecast chart
- [ ] Postman collection bumped to v1.14.0 with spending endpoints + AI analyze example showing the capped Spending Actuals section
- [ ] `BuildFullFinancialContextAsync` includes the capped Spending Actuals section with the explicit cap statement as its first line
- [ ] `docs/history/roadmap.md`, `docs/documentation-map.md`, and `README.md` highlights refreshed
- [ ] `VERSION` bumped on Wave 14 completion
