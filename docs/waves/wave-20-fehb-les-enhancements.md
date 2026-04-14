# Wave 20: FEHB Auto-Fill & LES Enhancements

_Created: 2026-04-14_  
_Status: Planned_

## Overview

Enhance the LES parser to extract FEHB plan codes, build an OPM plan lookup table from published premium data, and auto-fill FEHB plan name, coverage level, and employer contribution. Also add extraction of additional LES fields not yet persisted (tax withholding, leave balances, TSP deductions).

**Prerequisite**: Wave 18 (Federal Benefits Deep Dive) — LES parser and federal benefits profile must be complete.

---

## Phase 1: FEHB Plan Code Extraction & Lookup

### Problem
The LES contains `FEHB111133.77895.17` where `111` is the plan enrollment code, but the parser currently discards the code and only extracts the dollar amount. Without the code, FEHB plan name, coverage level, and employer share can't be auto-determined.

### Tasks

1. **Extract FEHB plan code from LES** — Modify `ExtractFehbDeduction()` in `LesParserService.cs` to also return the 2-3 digit enrollment code. Add `FehbCode` to `LesParseResult`.

2. **Import OPM premium rate tables** — Download the FFS and HMO premium XLSX files from `opm.gov/healthcare-insurance/healthcare/plan-information/premiums/2026/fehb/`, parse into a seed/lookup table with columns:
   - `EnrollmentCode` (3-digit plan code)
   - `PlanName` (carrier + option)
   - `PlanType` (FFS, HMO, HDHP, CDHP)
   - `CoverageLevel` (Self Only, Self Plus One, Self and Family)
   - `BiweeklyTotal` (total premium)
   - `BiweeklyEmployee` (employee share)
   - `BiweeklyGovernment` (government share)
   - `Year` (plan year)

3. **Auto-fill FEHB fields on LES upload** — When LES is uploaded:
   - Match extracted code against lookup table
   - Set `FehbPlanName` (e.g., "Blue Cross Blue Shield Standard")
   - Infer `FehbCoverageLevel` by matching biweekly deduction to the correct tier
   - Compute `FehbEmployerContribution` from (total - employee) share
   - Display all values in the Federal Benefits form

### Acceptance Criteria
- [ ] LES upload extracts FEHB plan code and stores it
- [ ] OPM 2026 premium data loaded into lookup table
- [ ] Plan name, coverage level, and employer share auto-populated after LES upload
- [ ] AI prompt shows full FEHB details (plan name, coverage, premiums)
- [ ] Manual override still works for all FEHB fields

---

## Phase 2: Additional LES Fields

### Problem
The LES parser extracts many fields that aren't yet persisted or displayed: biweekly gross/net pay, tax withholding (federal, state, OASDI, Medicare), TSP deduction details (traditional, Roth, catch-up, agency match), and leave balances (annual, sick). These provide valuable financial context for the AI advisor and budget analysis.

### Tasks

1. **Persist tax withholding data** — Add fields to a suitable model (User or new TaxWithholding model):
   - Federal tax withholding (biweekly → annual)
   - State tax withholding (biweekly → annual)
   - OASDI deduction (validates SS participation)
   - Medicare deduction

2. **Persist leave balances** — Add to User or FederalBenefitsProfile:
   - Annual leave balance (hours)
   - Sick leave balance (hours) — relevant because OPM credits sick leave toward retirement service

3. **TSP deduction details** — Feed extracted TSP data to TspProfile:
   - Employee traditional contribution (biweekly)
   - Employee Roth contribution (biweekly)
   - Catch-up contribution (biweekly)
   - Agency match (biweekly)
   - These support Wave 19's Roth/Traditional split feature

4. **Include new fields in AI prompt** — Extend the `BuildFullFinancialContextAsync` to include leave balances, tax estimates, and detailed TSP contributions.

### Acceptance Criteria
- [ ] Leave balances persisted and displayed on Federal Benefits tab
- [ ] Tax withholding data persisted and available to AI advisor
- [ ] TSP deduction breakdown persisted to TspProfile
- [ ] AI prompt includes leave balances, tax withholding summary, TSP contribution details

---

## Notes

- **OPM data refresh**: Premium tables change annually during Open Season (November). The lookup table will need a yearly refresh mechanism.
- **Employer share is NOT a fixed %**: It's capped at 72% of the weighted average premium across all plans. For 2026: $324.76 biweekly (Self Only), $711.17 (Self+1), $778.03 (Family). The actual employer share varies per plan.
- **SF-50 uploader retained**: The SF-50 provides two fields the LES cannot: Date of Birth and Service Computation Date — both essential for FERS pension calculations. SF-50 is a one-time upload; LES is the recurring data source.
