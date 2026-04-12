# Wave 18: Federal Benefits Deep Dive

_Created: 2026-04-12_  
_Status: In Progress_

## Overview

Transform the Federal Benefits tab from a basic data-entry form into a comprehensive federal employee retirement planning tool. This wave adds SF-50/LES PDF upload parsing, FERS pension auto-calculation, FEGLI premium parsing, and a multi-scenario FERS Retirement Projector that feeds pre-calculated data to the AI intelligence service.

**Prerequisite**: Wave 17 (Dashboard Expansion) — Profile Management with tabbed editor must be complete so the Federal Benefits tab exists as an editable section.

---

## Why Now?

1. **Federal employee gap** — PFMP targets federal employees but lacked meaningful retirement projection tooling. Users had to manually calculate pension scenarios or use external tools like GRB Platform.
2. **AI token efficiency** — Without pre-calculated projections, AI analysts would spend tokens recalculating complex pension formulas on every query. Pre-computed scenarios in the AI context eliminate this waste.
3. **Passive income planning** — Users setting retirement income goals need to see projected pension + supplement + Social Security combined to understand their baseline passive income at each retirement age.
4. **Document parsing foundation** — SF-50 and LES PDFs contain authoritative federal employment data that can auto-populate fields instead of requiring manual entry.

---

## Phase 1: Document Parsing & Auto-Calculation (Complete — commit `37a6ed6`)

### SF-50 & LES PDF Upload
- Upload infrastructure for SF-50 (Standard Form 50) and LES (Leave & Earnings Statement) documents
- PDF text extraction and field parsing
- Auto-population of federal employment fields from parsed data

### FERS Pension Auto-Calculation
- **Creditable service**: Auto-calculated from SCD (Service Computation Date) to current date
- **Annual annuity**: `multiplier × High-3 × (years + months/12)` where multiplier = 1.1% (age 62+ with 20+ years) or 1.0%
- **Monthly pension**: Annual annuity ÷ 12
- **FERS Cumulative Retirement**: Parsed from LES PDF
- **Supplement eligibility**: Auto-inferred from retirement system and service years

### Other Changes
- CSRS retirement system removed (FERS-only focus)
- FEGLI premium parsing from LES
- Household fields (agency, pay grade, SCD) moved to Federal Benefits tab
- `numStrTrunc` helper for consistent number formatting
- Biweekly-to-monthly formula fix

---

## Phase 2: FERS Retirement Projector (Current)

### New Backend Fields
| Field | Type | Purpose |
|-------|------|---------|
| `SocialSecurityEstimateAt62` | `decimal?` | User's estimated SS benefit at age 62 from ssa.gov |
| `AnnualSalaryGrowthRate` | `decimal(5,2)?` | Projected annual salary growth (e.g., 2.5 for 2.5%/yr) |

### Retirement Projection Endpoint
`GET /api/federal-benefits/user/{userId}/retirement-projection`

Returns multi-scenario projections:

| Scenario | Description |
|----------|-------------|
| **MRA (Minimum Retirement Age)** | Earliest FERS retirement with 30+ years |
| **MRA + 30** | If MRA scenario has < 30 years, shows when 30 years is reached |
| **Age 60** | Unreduced with 20+ years of service |
| **Age 62** | Full eligibility — 1.1% multiplier with 20+ years |
| **Age 65** | Extended service scenario |

Each scenario includes:
- Projected service years/months at retirement age
- Projected High-3 salary (using salary growth rate)
- Correct multiplier (1.0% or 1.1%)
- Annual annuity and monthly pension
- FERS Special Retirement Supplement eligibility and estimate
- Social Security at 62 (if applicable for that age)
- Total monthly retirement income
- Eligibility determination with notes

### Calculation Details

**High-3 Projection**: `currentHigh3 × (1 + growthRate)^(yearsToRetire - 1.5)`  
The `-1.5` approximates that High-3 is the average of the 3 highest consecutive salary years.

**FERS SRS (Special Retirement Supplement)**: `ssAt62 × (serviceYears / 40)`  
Bridge payment from retirement until age 62. Only for unreduced retirements before 62.

**MRA+10 Reduced Annuity**: 5% per year (5/12% per month) reduction for each year under age 62.

**Multiplier**: 1.1% only at age 62+ with 20+ years service; 1.0% for all other scenarios.

### AI Context Integration
- `FersCumulativeRetirement` and `SocialSecurityEstimateAt62` added to Federal Benefits section
- New `=== FERS RETIREMENT PROJECTIONS ===` section in AI context
- All scenarios pre-formatted as single-line bullets with key numbers
- Explicit "do NOT recalculate" instruction prevents token waste
- Gracefully handles missing SCD/DOB with try/catch

### Frontend: Retirement Projector UI
Added to Federal Benefits tab in ProfileView:
- **SS Benefit Estimate at 62** input field (with ssa.gov link hint)
- **Annual Salary Growth Rate %** input field
- **Refresh Projections** button
- **Scenario comparison table**: Scenario, Age, Service, High-3, Annual Annuity, Monthly Pension, Supplement, SS at 62, Total Monthly, Notes
- Ineligible scenarios dimmed (opacity 0.5)
- Eligibility chips per scenario

### EF Migration
`20260412191828_AddRetirementProjectionFields` — adds `SocialSecurityEstimateAt62` and `AnnualSalaryGrowthRate` columns to `FederalBenefitsProfiles`.

### Inflation Adjustment
Wires the existing `User.InflationAssumptionPercent` field (decimal(5,2)?, already in DB) into projections and AI context.

**Problem**: Pension and TSP projections are in nominal (future) dollars (using salary growth and market returns), but SSA provides SS estimates in today's purchasing power. Without adjustment, columns aren't comparable.

**Solution**: Inflate SS and SRS by `(1 + inflationRate)^yearsUntilRetire` so all projection columns are in nominal dollars.

**Changes**:
- `BuildScenario()` accepts `inflationRate` parameter (default 2.5%)
- SS at 62 and FERS SRS inflated to nominal dollars before display
- `InflationAssumptionPercent` added to `RetirementProjectionInputs` DTO
- Risk & Goals tab: new **Inflation Assumption (%)** field saves to `User.InflationAssumptionPercent`
- Passive Income Goal shows inflation-adjusted display: "$10,000/mo ($13,459 inflation-adjusted to 2041 at 2.5%)"
- AI context: FINANCIAL GOALS section includes inflation-adjusted passive income and inflation rate
- AI context: FERS RETIREMENT PROJECTIONS header notes inflation adjustment rate

---

## Files Modified (Phase 2)

| File | Changes |
|------|---------|
| `Models/FinancialProfile/FederalBenefitsProfile.cs` | +2 nullable decimal fields |
| `DTOs/FederalBenefitsDTOs.cs` | +2 fields in Response/Request; +3 new DTOs; +TSP fields; +InflationAssumptionPercent in Inputs |
| `Controllers/FederalBenefitsController.cs` | +GetRetirementProjection endpoint, +BuildRetirementProjection(), +BuildScenario() with inflation, +field mapping |
| `Services/AI/AIIntelligenceService.cs` | +retirement projection section, +inflation-adjusted passive income, +inflation note |
| `Services/FinancialProfile/FinancialProfileModels.cs` | +InflationAssumptionPercent in RiskGoalsInput |
| `Services/FinancialProfile/FinancialProfileService.cs` | +save/load InflationAssumptionPercent |
| `pfmp-frontend/src/services/federalBenefitsApi.ts` | +projection types, +inflationAssumptionPercent |
| `pfmp-frontend/src/services/financialProfileApi.ts` | +inflationAssumptionPercent in RiskGoalsProfilePayload |
| `pfmp-frontend/src/views/dashboard/ProfileView.tsx` | +Retirement Projector UI, +inflation field, +inflation-adjusted passive income display |

---

## Test Results
- Backend: 158 passed, 0 failed
- Frontend: 512 passed, 2 skipped, 0 failed

---

## How to Get Your Social Security Estimate

1. Go to [ssa.gov/myaccount](https://www.ssa.gov/myaccount)
2. Sign in or create an account (requires ID verification)
3. View your **Social Security Statement**
4. Find **"Estimated Benefits"** → **"At age 62"** monthly amount
5. Enter that dollar amount in the **SS Benefit Estimate at 62** field

---

## Phase 3: TSP Expansion & Roth/Traditional Split (Not Started)

### Problem
The current projector treats TSP as a single balance. In reality, Roth withdrawals are tax-free while traditional withdrawals are taxed as ordinary income. The government match always goes traditional regardless of the employee's Roth election. Without this split, the effective after-tax retirement income is understated for employees with significant Roth balances.

### New Fields on `TspProfile` (all nullable — optional)
| Field | Type | Purpose |
|-------|------|---------|
| `RothBalance` | `decimal(18,2)?` | Current Roth TSP balance |
| `TraditionalBalance` | `decimal(18,2)?` | Current traditional TSP balance |
| `RothContributionRatePercent` | `decimal(8,4)?` | % of employee contribution going to Roth (remainder is traditional) |

### TSP Benefit Statement Parser
- Parse TSP participant statements from tsp.gov (PDF download)
- Extract Roth/traditional balances per fund
- Extract contribution history and loan balances
- Auto-populate the new fields (same pattern as SF-50 and LES parsers)
- All fields optional — users without Roth simply leave them blank

### Projection Logic Changes
- Project Roth and traditional balances independently
- Government match always grows in traditional bucket
- Employee contributions split by `RothContributionRatePercent`
- Show two withdrawal lines: Roth (tax-free) and traditional (taxable)
- Apply marginal tax rate estimate to traditional withdrawals for after-tax income

### Retirement Projector Updates
- Add "TSP Roth/mo" and "TSP Trad/mo" columns (or expandable detail row)
- Show estimated after-tax total when tax profile data is available
- Include Roth/traditional split in AI context so advisors can give tax-aware retirement guidance

### AI Context Integration
- Add Roth vs traditional split to `=== FERS RETIREMENT PROJECTIONS ===` section
- Include effective after-tax monthly income per scenario
- Enable AI advisors to recommend Roth conversion strategies based on projected tax brackets

---

## Phase 4: Additional Future Enhancements (Not Started)
- Custom retirement age scenario (user picks any age)
- COLA (Cost of Living Adjustment) projections
- Survivor benefit calculations
- Retirement income goal gap analysis (projected income vs. target)
- Tax impact modeling (federal + state tax on pension income)
- TSP withdrawal strategy integration (lump sum, annuity, installments)
