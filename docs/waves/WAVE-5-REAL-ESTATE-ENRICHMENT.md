# Wave 5 – Real Estate Enrichment Plan

_Prepared 2025-10-10_

This plan extends the Wave 5 onboarding work to deliver a richer "Real Estate & Liabilities" section, lay the groundwork for automated property valuations, and wire property insights into advice. It supplements the high-level onboarding spec in `docs/waves/WAVE-5-DASHBOARD-MVP.md` (section 6) and should be kept in sync with roadmap updates.

## Objectives

1. **Capture a complete property profile** – address, purchase and mortgage details, occupancy, HELOC status, rental cashflow.
2. **Automate valuation and equity insights** – integrate with external valuation data, track deltas, compute amortization-driven balances, and surface equity.
3. **Inform advice and portfolio analytics** – persist derived metrics for net-worth, refinancing recommendations, and HELOC prompts.
4. **Operate safely at scale** – design background refresh tasks, retry strategies, and provider abstractions that tolerate outages.

## Functional Scope

### 1. Frontend Experience
- **Form layout**: convert the current single-stack form into logical groups (Property Identity, Mortgage, Cashflow & Equity, Automation preferences). Display computed metrics inline (e.g., equity amount & percent).
- **Address capture**: support autocomplete + validation (Google Places, Smarty, or USPS) and allow manual override. Store standardized components (street, city, state, postal, county) plus latitude/longitude when available.
- **Valuation trigger**: add an "Estimate value" action that calls the backend valuation endpoint. Show provider, timestamp, and confidence band; protect user-entered values if they choose to override.
- **Mortgage calculators**: accept purchase price, purchase date, original loan amount, current principal, interest rate, amortization term, payment frequency, and optional escrow. Compute remaining term, amortization schedule summary, and monthly principal vs. interest breakdown.
- **Rental support**: capture rental income, expenses, vacancy rate estimate, and occupancy status to feed cashflow dashboards.
- **Opt-out behavior**: retain existing opt-out flow; when opted out, record reason and disable automation toggles.

### 2. Backend & API Enhancements
- **API contract**: extend `PropertiesRequest` / `PropertyInput` to include:
  - Address fields (line1, line2, city, state, postal, country, countyFips, latitude, longitude).
  - Purchase & loan fields (purchasePrice, purchaseDate, originalLoanAmount, currentPrincipal, interestRate, rateType, termMonths, firstPaymentDate, escrowMonthly, helocLimit).
  - Cashflow fields (monthlyRentalIncome, vacancyRate, monthlyExpenses, insuranceMonthly, propertyTaxesAnnual).
  - Automation flags (autoValuationEnabled, manualValuationOverride, valuationSource, valuationFetchedAt).
- **DTO versioning**: update `PropertyProfile` EF model and add a migration to persist new columns. Include `LastEquityCalculationAt`, `CurrentEquityAmount`, and `EquityPercent` for fast dashboard queries.
- **Valuation endpoint**: add `POST /financial-profile/{userId}/real-estate/{propertyId}/refresh-valuation` that triggers provider lookups, persists results, and returns updated totals.
- **Mortgage calculations**: centralize amortization logic in a dedicated service (e.g., `IMortgageAnalyticsService`) so both API and scheduled jobs can reuse it.
- **Validation**: enforce allowed ranges (e.g., interest rate 0–25%), protect against negative values, and ensure address completeness when automation is enabled.

### 3. Integrations & Providers
- **Address services**:
  - Primary: Google Places or Mapbox for autocomplete.
  - Validation fallback: USPS Web Tools or SmartyStreets (requires business account).
- **Valuation providers**:
  - Preferred: Estated or HouseCanary (developer APIs with Zestimate-like data).
  - Optional: Zillow (consider API limits) or public assessor data for fallback.
- **Provider abstraction**: define interfaces (`IPropertyValuationProvider`, `IAddressVerificationProvider`) to allow swapping implementations and mocking in tests. Log provider latency and error rates.

### 4. Automation & Background Jobs
- **Refresh cadence**: schedule a nightly job to run valuations for properties with `autoValuationEnabled`. Stagger requests to respect third-party quotas; store `lastScheduledRun` per property.
- **Amortization updates**: weekly job recalculates principal balance and equity even when valuations do not change.
- **Error handling**: use retry with exponential backoff, mark stale valuations when providers fail, and send alerts if failures exceed thresholds.
- **Telemetry**: emit structured logs or Application Insights events covering valuation attempts, success/failure, and equity changes.

### 5. Advice & Analytics
- **Snapshot integration**: update `FinancialProfileSnapshot` to include property equity totals, rental cashflow, and valuation confidence.
- **Advice rules**:
  - Refinance prompts when market rate (tracked separately) is at least 1% lower than `interestRate` and LTV < 80%.
  - HELOC suggestion when equity > 20% and cash reserves low.
  - Rental optimization when vacancy rate exceeds configured threshold.
- **Task generation**: create or update advice tasks with context (e.g., “Consider refinancing – current rate 7.0%, average market 6.0%”). Attach valuation history links.

## Phased Delivery

| Phase | Focus | Deliverables |
|-------|-------|--------------|
| 1 | **Data & UI foundations** | Schema migration, extended API payload, updated frontend form capturing new fields, compute equity locally, manual valuation entry. |
| 2 | **Automated valuations** | Integrate first valuation provider, add backend refresh endpoint, UI button to fetch values, store valuation history table (propertyId, value, source, fetchedAt). |
| 3 | **Background operations** | Nightly valuation job, weekly amortization recalculation, alerting and telemetry, feature flag to enable automation per environment. |
| 4 | **Advice integration** | Expand snapshot metrics, implement refinance/HELOC rules, surface insights on dashboard and inbox/tasks, document QA scenarios. |
| 5 (optional) | **Enhancements** | Multi-provider blending, comp comparisons, map visualizations, advanced rental analytics. |

## Dependencies & Open Questions

- **Licensing**: confirm preferred valuation and address providers, including cost and rate limits.
- **Feature flags**: determine rollout strategy (per environment vs. per user beta) and update configuration accordingly.
- **Security & privacy**: ensure address/valuation data aligns with storage and retention policies.
- **Analytics backlog**: coordinate with advice engine owners on new rules, thresholds, and test coverage.

## Documentation & Follow-up

- Update `docs/documentation-map.md` whenever this plan changes.
- Log engineering decisions (provider choices, feature flag states) in `docs/meta/documentation-strategy.md` after implementation steps begin.
- Record QA scenarios in `docs/testing/onboarding-testing.md` and `docs/testing/dashboard-wave4-manual-checks.md` as functionality lands.
