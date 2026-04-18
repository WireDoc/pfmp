# Wave 21: Estate Planning & Beneficiary Tracking

_Created: 2026-04-18_
_Status: Complete_

## Overview

Add estate planning awareness to PFMP so the AI can identify gaps in beneficiary designations, legal documents, and ownership structures. This is the only completely missing item from the Gemini feedback scorecard (#4). The design favors actionable checklists over detailed document management — PFMP is a financial planner, not an estate attorney's filing system.

## Why Now?

1. Estate planning is the **only fully missing** feedback item — everything else is at least partial.
2. Beneficiary designation gaps are a critical blind spot for retirement-focused federal employees — TSP, FEGLI, and bank/investment accounts all have separate designation processes.
3. The AI currently cannot warn about missing wills, outdated beneficiaries, or absent powers of attorney.
4. Low model complexity — mostly booleans and dates — with high advisory value.

---

## Design Decisions

### Per-account beneficiaries: flag, not full detail

**Question**: Should we track full beneficiary details (name, relationship, percentage, primary vs contingent) per account?

**Answer**: No. A `HasBeneficiaryDesignation` boolean on each Account is sufficient.

**Rationale**:
- PFMP's job is to surface *"you haven't designated a beneficiary on your Schwab IRA"* — not to store *"Jane Doe, spouse, 60%, primary"*.
- Full beneficiary modeling would require a many-to-many `Beneficiary` table, CRUD UI per account, and ongoing data freshness concerns.
- Users maintain actual designations with their custodians (Fidelity, Schwab, TSP.gov, OPM). PFMP just needs to know whether it's been done.
- The AI can prompt: *"3 of your 7 accounts lack beneficiary designations — here's what to do for each account type."*

### Federal-specific designations: separate flags

TSP (Form TSP-3) and FEGLI (Form SF-1823) have their own designation processes outside normal brokerage accounts. These get dedicated flags on `FederalBenefitsProfile` so the AI can give federal-specific guidance.

### Estate documents: checklist model

A new `EstatePlanningProfile` stores document-level checklist items. Each is a boolean (exists?) plus an optional date (last reviewed/updated). This lets the AI say *"your will was last reviewed 4 years ago — consider updating after your recent marriage."*

---

## Phase 1: Backend Model & Migration

### New Model: EstatePlanningProfile

| Field | Type | Purpose |
|-------|------|---------|
| EstatePlanningProfileId | int (PK) | Primary key |
| UserId | int (FK, unique) | One-to-one with User |
| HasWill | bool | Last will and testament exists |
| WillLastReviewedDate | DateTime? | When the will was last reviewed/updated |
| HasTrust | bool | Revocable/irrevocable trust exists |
| TrustType | string? | "Revocable", "Irrevocable", or null |
| TrustLastReviewedDate | DateTime? | When the trust was last reviewed |
| HasFinancialPOA | bool | Financial power of attorney exists |
| HasHealthcarePOA | bool | Healthcare POA / advance directive exists |
| HasAdvanceDirective | bool | Living will / advance directive |
| AttorneyName | string? | Estate attorney name (optional) |
| AttorneyLastConsultDate | DateTime? | Last consultation date |
| Notes | string? | Free-text estate planning notes |
| DateCreated | DateTime | Record creation |
| DateUpdated | DateTime | Last update |

### Account Model Addition

| Field | Type | Purpose |
|-------|------|---------|
| HasBeneficiaryDesignation | bool (default false) | Whether a beneficiary has been designated on this account |

### FederalBenefitsProfile Additions

| Field | Type | Purpose |
|-------|------|---------|
| HasTspBeneficiaryDesignation | bool (default false) | TSP-3 filed |
| HasFegliBeneficiaryDesignation | bool (default false) | SF-1823 filed |

### Tasks

1. Create `EstatePlanningProfile` model in `Models/FinancialProfile/`
2. Add `HasBeneficiaryDesignation` to `Account.cs`
3. Add TSP/FEGLI beneficiary flags to `FederalBenefitsProfile.cs`
4. Add `EstatePlanningProfile` navigation to `User.cs`
5. Register `DbSet<EstatePlanningProfile>` in `ApplicationDbContext`
6. Create EF migration
7. Apply to database

---

## Phase 2: API Endpoints & DTOs

### New Controller: EstatePlanningController

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/estate-planning/user/{userId}` | Get estate planning profile (create default if none) |
| PUT | `/api/estate-planning/user/{userId}` | Update estate planning profile |

### Account DTO Update

Add `hasBeneficiaryDesignation` to account GET/PUT DTOs so users can toggle it per-account.

### FederalBenefits DTO Update

Add `hasTspBeneficiaryDesignation` and `hasFegliBeneficiaryDesignation` to the existing federal benefits save/response DTOs.

### Tasks

1. Create DTOs: `EstatePlanningResponse`, `UpdateEstatePlanningRequest`
2. Create `EstatePlanningController` with GET/PUT
3. Update `AccountsController` DTOs to include beneficiary flag
4. Update `FederalBenefitsController` DTOs to include TSP/FEGLI beneficiary flags
5. Add backend tests

---

## Phase 3: AI Context Integration

### New Section in AIIntelligenceService

Add an `ESTATE PLANNING` section to `BuildFullFinancialContextAsync()`:

```
--- ESTATE PLANNING ---
Will: Yes (last reviewed 2024-03-15) | Trust: No | Financial POA: Yes | Healthcare POA: No
TSP Beneficiary (TSP-3): Designated | FEGLI Beneficiary (SF-1823): Not designated
Accounts without beneficiary designations: Schwab IRA, USAA Checking, Ally Savings (3 of 7)
```

This gives the AI everything it needs to flag:
- Missing legal documents
- Outdated documents (reviewed 5+ years ago)
- Accounts without beneficiary designations
- Federal-specific gaps (TSP-3, SF-1823)

### Tasks

1. Load `EstatePlanningProfile` in context builder
2. Build estate planning text block
3. Enumerate accounts missing beneficiary designations
4. Include TSP/FEGLI beneficiary status from federal benefits

---

## Phase 4: Frontend — ProfileView Estate Planning Tab

### New Tab: "Estate Planning" (Tab 10)

**Document Checklist Section**:
- Will: Switch + date picker for last review
- Trust: Switch + type dropdown (Revocable/Irrevocable) + date picker
- Financial POA: Switch
- Healthcare POA / Advance Directive: Switches
- Attorney: text field + date picker for last consult
- Notes: multiline text

**Beneficiary Status Section**:
- TSP Beneficiary (TSP-3): Switch
- FEGLI Beneficiary (SF-1823): Switch
- Per-account list: table showing each account with a beneficiary toggle
  - Columns: Account Name | Type | Institution | Beneficiary Set?

### Tasks

1. Add "Estate Planning" to `TAB_KEYS` array
2. Create estate planning tab content with MUI components
3. Wire API calls for estate planning profile CRUD
4. Add beneficiary toggle to account rows
5. Update frontend types (`api.ts`, new `estatePlanningApi.ts`)
6. Add frontend tests

---

## Acceptance Criteria

| # | Criterion | Metric |
|---|-----------|--------|
| 1 | Estate planning profile CRUD | GET returns default, PUT persists all fields |
| 2 | Per-account beneficiary flag | Toggling saves to DB, visible in account list |
| 3 | Federal beneficiary flags | TSP-3 and SF-1823 flags persist and display |
| 4 | AI context | Estate planning section appears in AI prompt with accurate data |
| 5 | AI gap detection | AI can identify missing documents and undesignated accounts |
| 6 | ProfileView tab | 10th tab renders, saves, and loads correctly |
| 7 | Tests | All new backend + frontend tests pass; no regressions |

## Out of Scope

- Full beneficiary detail modeling (name, relationship, percentage, primary/contingent)
- Document upload/storage (wills, trusts, POA documents)
- Spouse/dependent detail modeling beyond existing `MaritalStatus` + `DependentCount`
- State-specific estate law guidance
- Estate tax calculations (federal estate tax exemption is $13.61M in 2024 — irrelevant for most users)

## Files Expected to Change

| File | Change |
|------|--------|
| `PFMP-API/Models/FinancialProfile/EstatePlanningProfile.cs` | New model |
| `PFMP-API/Models/Account.cs` | Add `HasBeneficiaryDesignation` |
| `PFMP-API/Models/FinancialProfile/FederalBenefitsProfile.cs` | Add TSP/FEGLI beneficiary flags |
| `PFMP-API/Models/User.cs` | Add `EstatePlanningProfile` navigation |
| `PFMP-API/ApplicationDbContext.cs` | Register `EstatePlanningProfiles` DbSet |
| `PFMP-API/Migrations/` | New migration |
| `PFMP-API/Controllers/EstatePlanningController.cs` | New controller |
| `PFMP-API/DTOs/EstatePlanningDTOs.cs` | New DTOs |
| `PFMP-API/Controllers/AccountsController.cs` | Update DTOs for beneficiary flag |
| `PFMP-API/Controllers/FederalBenefitsController.cs` | Update DTOs for TSP/FEGLI flags |
| `PFMP-API/Services/AI/AIIntelligenceService.cs` | Add estate planning context section |
| `pfmp-frontend/src/services/estatePlanningApi.ts` | New API service |
| `pfmp-frontend/src/services/api.ts` | Update Account type |
| `pfmp-frontend/src/views/dashboard/ProfileView.tsx` | Add 10th tab |
| `pfmp-frontend/src/tests/views/ProfileView.test.tsx` | Update tab count + estate tests |
| `PFMP-API.Tests/EstatePlanningControllerTests.cs` | New test file |
