# Wave 19: Advanced Retirement Planning

_Created: 2026-04-12_  
_Status: Planned_

## Overview

Extend the Wave 18 FERS Retirement Projector with tax-aware TSP projections (Roth vs traditional split), TSP benefit statement parsing, COLA projections, and additional retirement scenario modeling. Builds on the multi-scenario projector, inflation adjustment, and AI context integration delivered in Wave 18.

**Prerequisite**: Wave 18 (Federal Benefits Deep Dive) — FERS Retirement Projector with TSP projection, inflation adjustment, and AI context must be complete.

---

## Phase 1: TSP Roth/Traditional Split

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

## Phase 2: Additional Retirement Enhancements

- Custom retirement age scenario (user picks any age)
- COLA (Cost of Living Adjustment) projections
- Survivor benefit calculations
- Retirement income goal gap analysis (projected income vs. target)
- Tax impact modeling (federal + state tax on pension income)
- TSP withdrawal strategy integration (lump sum, annuity, installments)
