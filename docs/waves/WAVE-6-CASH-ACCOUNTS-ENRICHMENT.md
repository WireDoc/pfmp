# Wave 6 – Cash Accounts Enrichment Plan

_Prepared 2025-10-11_

This plan extends the cash onboarding section so that it captures richer liquidity data, powers redistribution insights, and feeds AI-driven recommendations. It complements the Wave 5 dashboard hardening spec and should remain aligned with `docs/waves/WAVE-5-DASHBOARD-MVP.md` as milestones evolve.

## Objectives

1. **Capture a complete liquidity picture** – balances, account intent (e.g., checking float, vacation fund), rate details, and emergency-fund designation.
2. **Surface intelligent guidance** – calculate savings targets, flag idle cash, and recommend yield-optimized destinations.
3. **Enable automation & advice** – persist metadata that downstream engines can monitor for rate changes, excess buffers, and stale accounts.
4. **Respect user control** – let customers override recommendations, annotate opt-outs, and manage sub-accounts without friction.

## Functional Scope

### 1. Frontend Experience
- **Account grouping UI**: split the form into three zones – "Spending", "Savings & Goals", "Yield & Reserves" – so users can quickly classify accounts.
- **Structured account types**: replace free-text `accountType` with a picker that includes Checking, High-Yield Savings, Money Market, Certificate of Deposit, Cash Management, Prepaid, Goal-Specific (Vacation, Home Improvement, Personal Care, etc.), and an "Other" option with descriptive text input.
- **Purpose tagging**: add an optional text field "Account purpose" that stores categories like Vacation, Personal Care, Home Improvement, Taxes, Giving. Display tags in summaries so the AI engine can identify earmarked funds.
- **APR / APY handling**: provide radio toggle to input rate as APR or APY. Auto-convert to both representations for display and storage (retain original input + derived counterpart).
- **Savings target module**: show a recommended emergency-fund range (e.g., 3–6 months) calculated from income and expenses. Let the user set their own target while keeping the recommendation visible with explanatory copy.
- **Idle cash alerts**: inline highlight when checking balance exceeds configurable floor (default 10k) or when non-targeted savings balances fall below recommendation. Use callouts pointing toward "Move funds" actions.
- **Rate freshness indicator**: visualize `rateLastChecked` and prompt users when rates are older than 60 days.
- **Opt-out flow**: preserve existing opt-out switch but request a reason category (No liquid accounts, Managed elsewhere, Decline to share) plus optional free text.

### 2. Backend & API Enhancements
- **Payload updates**: extend `CashAccountPayload` to include `accountCategory`, `accountPurpose`, `interestRateApy`, `rateSource`, `targetBalance`, `recommendedBalance`, `userOverrideReason`, and `allocationPolicy` flags (e.g., keep 10k floor in checking).
- **DTO & persistence**: add columns to `CashAccounts` table (and EF model) for new fields. Store both APR and APY plus last-checked timestamp. Include migration scripts with defaults.
- **Savings target service**: create a domain service that derives target emergency fund and discretionary savings based on household expenses, income volatility, and dependents count. Expose via `FinancialProfileSnapshot` so downstream features can reuse.
- **Redistribution engine hooks**: add backend logic to compute `excessBalance` per account (balance minus target) and attach recommended actions (e.g., "Move $32,000 to High-Yield Savings"). Persist recommendation metadata for auditability.
- **Validation**: enforce account type whitelist, acceptable rate ranges (0–25%), non-negative balances, and future-date prevention for `rateLastChecked`.

### 3. Advice & Analytics
- **Snapshot metrics**: expand snapshot DTO to include `liquidityRunwayMonths`, `totalEmergencyReserve`, `idleCheckingBalance`, and `rateBenchmarkDelta`.
- **Advice rules**:
  - Flag checking accounts exceeding user-defined floor (default 10k) and propose transfers.
  - Recommend higher-yield options when APR/APY trails reference benchmark (tracked via provider feed) by >0.5%.
  - Highlight goal accounts falling below target before upcoming expense windows (needs calendar integration long term).
  - Detect stale rate checks (>90 days) and suggest refreshing.
- **Task generation**: create actionable tasks with context (e.g., "Move $25,000 from Checking · 0.01% APY to Ally High Yield · 4.20% APY"). Include quick links to provider comparisons and savings target explanation.

### 4. Integrations & Providers
- **Rate benchmarking**: integrate with public rate APIs (e.g., DepositAccounts.com, NerdWallet feeds) or maintain manual benchmark table updated weekly.
- **Expense insights**: tap into budget/expense data (from Wave 7 pipeline) to refine recommended savings target (monthly expenses × months coverage).
- **Automation connectors** (future): design placeholders for bank integrations or Plaid/Rize connectors that could pull balances and rates automatically while respecting security standards.

### 5. Background Jobs & Monitoring
- **Benchmark refresh**: nightly job to fetch new rate benchmark data and mark recommendations stale if deltas exceed threshold.
- **Savings target recalculation**: rerun targets when income or expense data changes (hook into corresponding event streams).
- **Alerting & telemetry**: log cash redistribution recommendations, track acceptance/ignore rates, and monitor rate-staleness warnings to tune thresholds.

### 6. Testing & QA
- **Unit coverage**: validate conversion between APR/APY, target calculations, recommendation thresholds, and account-category persistence.
- **Integration tests**: simulate onboarding submissions with varied account mixes (single checking, multiple goal accounts, high balances) and ensure recommendation payload matches expectations.
- **Manual QA**: scenarios covering opt-out, conversion toggles, stale rate prompts, and savings target overrides.

## Phased Delivery

| Phase | Focus | Deliverables |
|-------|-------|--------------|
| 1 | **Data capture upgrade** | Updated form with category picker, purpose tagging, APR/APY handling, API/DB migrations, baseline validation. |
| 2 | **Target & recommendations** | Savings target service, UI module showing recommended vs user target, idle cash alerts, snapshot fields. |
| 3 | **Benchmark integration** | Rate benchmark ingestion, APR/APY comparison logic, advice rules for redistribution, task creation hooks. |
| 4 | **Automation & enhancements** | Background jobs, telemetry dashboards, goal timelines, pre-built provider suggestions. |
| 5 (optional) | **Advanced automation** | Bank connectors, automatic transfers (via partner APIs), machine-learning prioritization of cash moves. |

## Dependencies & Open Questions

- **Income & expense availability**: confirm when reliable expense data lands (tie to budgeting wave) to calibrate savings recommendations.
- **Benchmark provider selection**: evaluate cost, coverage, and licensing constraints for rate feeds.
- **Feature flags**: determine rollout (beta cohorts vs. environment-based) and analytics needed to evaluate adoption.
- **Security**: ensure account purpose labels and balances comply with data classification policies.

## Beyond the Basics

- **Goal-based insights**: Combine cash purpose tags with upcoming events (vacations, renovations) to generate timeline reminders and funding milestones.
- **Dynamic bucketing**: Offer “smart envelopes” that automatically sweep excess checking funds into designated goal accounts while maintaining the floor.
- **AI advisor integration**: Feed tagged accounts into the AI engine so it can suggest micro-optimizations (e.g., “Your Home Improvement fund is under target ahead of scheduled project. Consider reallocating $5,000 from discretionary savings.”).
- **Rate shopping concierge**: Present curated offers when rates slip, including estimated annual earnings delta and straight-through account opening links.
- **Household collaboration**: Support shared notes/comments per account so spouses/partners can align on liquidity plans.

## Documentation & Follow-up

- Reference this plan from the dashboard MVP spec and `docs/documentation-map.md`.
- Record major implementation decisions (rate sources, target formula) in `docs/meta/documentation-strategy.md` once work begins.
- Append new QA checklists to `docs/testing/onboarding-testing.md` as features land.
- Revisit the plan after the income onboarding work ships to prioritize phases and staffing.
