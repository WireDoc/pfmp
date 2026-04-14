# Wave 20: FEHB Auto-Fill & LES Enhancements

_Created: 2026-04-14_  
_Status: Planned_

## Overview

Enhance the LES parser to extract FEHB plan codes and SCD, build an OPM plan lookup table from published premium data, auto-fill FEHB plan name/coverage/employer contribution, persist additional LES fields (tax withholding, leave balances, TSP deductions), and remove the SF-50 uploader now that the LES covers all critical fields.

**Prerequisite**: Wave 18 (Federal Benefits Deep Dive) — LES parser and federal benefits profile must be complete.

---

## Phase 1: LES SCD Extraction & SF-50 Removal

### Problem
The LES box 11 "SCD Leave" contains the Service Computation Date (e.g., `10/26/02`), but the parser doesn't extract it. Meanwhile, the SF-50 uploader's only unique auto-fill value beyond the LES is Date of Birth — which users already enter in their profile. The SF-50 parser adds complexity for diminishing returns.

### Tasks

1. **Extract SCD from LES** — Add regex to `LesParserService` to parse box 11 "SCD Leave" date. Add `ServiceComputationDate` to `LesParseResult`. Apply to `User.ServiceComputationDate` in the LES apply endpoint (same as SF-50 currently does).

2. **Remove SF-50 uploader** — Remove the following:
   - **Backend**: `Sf50ParserService.cs`, the `ApplySf50` endpoint in `FederalBenefitsController.cs`, SF-50 response DTO fields
   - **Frontend**: SF-50 upload button/section in the Federal Benefits form, any SF-50-specific API calls
   - **Model cleanup**: Remove `LastSf50UploadDate` and `LastSf50FileName` from `FederalBenefitsProfile` (migration to drop columns)
   - **AI prompt**: Remove SF-50 upload date line from `BuildFullFinancialContextAsync`
   - **Tests**: Remove or update any SF-50-related test cases

3. **Verify no regressions** — Ensure all fields previously populated by SF-50 are covered:
   - PayGrade → LES ✅
   - AnnualBasicPay / High3 → LES ✅
   - RetirementSystem → LES ✅
   - SCD → LES (after this change) ✅
   - FEGLI enrollment → LES (better: codes + amounts) ✅
   - DOB → Manual profile entry ✅ (not on LES, but already a profile field)

### Acceptance Criteria
- [ ] LES upload extracts SCD from box 11 and saves to `User.ServiceComputationDate`
- [ ] SF-50 upload endpoint, parser service, and frontend UI fully removed
- [ ] DB migration drops `LastSf50UploadDate` and `LastSf50FileName` columns
- [ ] All pension calculations continue to work (SCD comes from LES instead of SF-50)
- [ ] No dead code references to SF-50 remain

---

## Phase 2: FEHB Plan Code Extraction & Lookup

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

## Phase 3: Additional LES Fields

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
- **SF-50 removal rationale**: The LES provides every field the SF-50 does (PayGrade, salary, retirement system, FEGLI, SCD) plus 20+ additional fields. The only SF-50-exclusive field is Date of Birth, which is already a manual profile entry. Removing the SF-50 uploader eliminates a complex PDF parser with marginal value.
- **LES as single document source**: After this wave, the LES becomes the sole document upload for federal benefits. One upload populates pay, benefits, deductions, leave, SCD, and retirement data.
