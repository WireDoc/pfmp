# Demo Dataset Refresh Plan

_Last updated: 2025-10-12_

## Goals
- Showcase dashboard value immediately after onboarding completion.
- Provide realistic sample data spanning cash, investments, liabilities, real estate, benefits, and tasks.
- Support automated and manual QA scenarios for real data flows.

## Target Personas
1. **Sarah Johnson (User 1)** – Young professional with aggressive TSP allocation, starter brokerage, student loan.
2. **Michael Smith (User 2)** – Mid-career federal employee with VA disability benefits, diversified accounts, mortgage + HELOC.
3. **Jessica Rodriguez (User 3)** – Active duty USAF with blended retirement, housing allowance, minimal debt.
4. **David Wilson (User 4)** – Early-career civilian with focus on cash buffers and debt payoff.

## Data Domains & Actions
### Cash & Banking
- Seed 2–3 accounts per persona (checking, HYSA/CD) with balance, APR, institution metadata.
- Include one dormant account with zero balance to test empty-state messaging.
- Capture last-updated timestamps aligning with polling interval.

### Investments
- Populate TSP positions with contribution rate, current allocation, target mix; ensure at least one mismatch to trigger advisory insight.
- Add brokerage accounts (index fund ETF mix) and retirement accounts (IRA/401k) with cost basis.
- Provide simple historical valuation snapshots for net worth trend testing.

### Liabilities
- Mortgage/HELOC for Michael, student loan for Sarah, auto loan for David.
- Include credit card with small revolving balance to drive cashflow tasks.
- Set payoff focus flag for whichever debt is prioritized.

### Real Estate & Rentals
- Primary residence records for Michael & David including estimated value, mortgage balance, and cash flow summary.
- Rental property for Michael with occupancy rate and maintenance reserve.

### Income & Benefits
- Salary, overtime, and side hustle income lines as applicable.
- VA disability payments for Michael, BAH for Jessica, TSP match for all federal/military personas.
- Employer benefits matrix to feed upcoming recommendations (HSA eligibility, life insurance coverage).

### Tasks, Alerts, Advice
- Generate actionable alerts tied to seeded data (e.g., “Rebalance TSP allocation”, “Increase HYSA yield”).
- Map alerts to tasks with varying statuses to exercise optimistic updates.
- Pre-create one dismissed alert and one completed task for baseline history.

### Long-Term Obligations
- Populate obligations used by live polling (tuition fund, home renovation, vehicle replacement) with staggered due dates.
- Ensure at least one overdue obligation to test warning tone in quick glance tile.

## Implementation Checklist
1. Extend `DevelopmentDataSeeder` with new entities/relationships.
2. Update SQL/JSON seed files under `pfmp-postgresql/init/` to mirror seeder outputs for local containers.
3. Document sample payloads in `docs/api/sample-data/` for manual API calls.
4. Verify dashboard renders expected totals after running seeder (manual QA script).
5. Update `docs/testing/dashboard-wave4-manual-checks.md` with new verification steps.

## QA Notes
- Use Vitest fixtures to mirror seeded data where deterministic assertions are required.
- Provide PowerShell script to reset database to seeded state (`scripts/reset-demo-data.ps1`).
- Track data drift by logging seeded hash values and comparing during startup.
