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

---

## Files Modified (Phase 2)

| File | Changes |
|------|---------|
| `Models/FinancialProfile/FederalBenefitsProfile.cs` | +2 nullable decimal fields |
| `DTOs/FederalBenefitsDTOs.cs` | +2 fields in Response/Request; +3 new DTOs (RetirementProjectionResponse, RetirementScenario, RetirementProjectionInputs) |
| `Controllers/FederalBenefitsController.cs` | +GetRetirementProjection endpoint, +BuildRetirementProjection(), +BuildScenario(), +field mapping |
| `Services/AI/AIIntelligenceService.cs` | +retirement projection section in AI context |
| `pfmp-frontend/src/services/federalBenefitsApi.ts` | +projection types and fetch function |
| `pfmp-frontend/src/views/dashboard/ProfileView.tsx` | +Retirement Projector UI section |

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

## Phase 3: Future Enhancements (Not Started)
- Custom retirement age scenario (user picks any age)
- COLA (Cost of Living Adjustment) projections
- Survivor benefit calculations
- Retirement income goal gap analysis (projected income vs. target)
- Tax impact modeling (federal + state tax on pension income)
- TSP withdrawal strategy integration
