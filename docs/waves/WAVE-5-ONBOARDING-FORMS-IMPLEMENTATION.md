# Wave 5 Onboarding Forms – Implementation Plan

_Last updated: 2025-10-12_

## Objectives
- Replace placeholder onboarding cards with full data-entry experiences described in `WAVE-5-DASHBOARD-MVP.md`.
- Persist user inputs via refined onboarding DTOs and section-specific API endpoints.
- Maintain Momentum: auto-save on change, resume incomplete sessions, and unlock dashboard once review step is complete.

## Progress Snapshot (2025-10-13)
- Implemented `ProfileStepLayout` to centralize onboarding chrome (progress rail, nav controls, status badges) and drive rendering via a consolidated `stepRegistry`.
- Added a reusable `useAutoSaveForm` hook with debounced persistence, dirty tracking, and status callbacks.
- Upgraded Household and Risk & Goals sections to leverage autosave, opt-out sanitization, and the new status indicator component.

## Frontend Tasks
1. **Stepper Architecture**
   - Build reusable `ProfileStepLayout` with left-rail progress, primary/secondary CTAs, and autosave indicator.
   - Introduce step registry describing component, validation schema, API route, and opt-out behavior.
   - Wire registry into `useDashboardData` gating logic so dashboard remains locked until review step marks complete.

2. **Form Implementation**
   - Welcome & household: formik/react-hook-form (decision), validation for required fields, dependent repeater.
   - Risk & goals: slider components, computed retirement target preview.
   - TSP & Brokerage: dynamic list of accounts, default templates, opt-out toggles.
   - Cash accounts & liabilities: list editors with inline add/remove rows, APR validation, currency formatting.
   - Expenses & income: budget categories with monthly normalization helper, copy opt-out CTA text from spec.
   - Benefits & protections: checklists + rich text notes.
   - Review step: summary cards with status badges; enable edit buttons to jump back to sections.

3. **Shared Utilities**
   - Introduce `useAutoSaveForm` hook wrapping debounce + optimistic toast, calling new persistence endpoints.
   - Extend onboarding context to expose section states `{ status: 'completed' | 'in-progress' | 'skipped'; updatedAt }`.
   - Add route guard that redirects to next incomplete step when user lands on onboarding root.

4. **Testing**
   - Vitest: component-level tests per form verifying validation + opt-out flows.
   - Playwright: scenario coverage for full completion, skip-heavy path, resume mid-way.

## Backend Tasks
1. **DTO & Entity Updates**
   - Extend `OnboardingProgress` aggregate with sections defined in the spec, including opt-out metadata (`reason`, `acknowledgedAt`).
   - Create new entities: `LiabilityAccount`, `ExpenseBudget`, `TaxProfile`, `BenefitCoverage`, `FinancialProfileSnapshot`.

2. **Endpoints**
   - Implement section-specific POST/PUT endpoints (cash, liabilities, expenses, tax, benefits, income, equity placeholder).
   - Add PATCH for opt-outs to avoid sending full payload when skipping.
   - Expand existing onboarding controller to return profile completion percentage and outstanding sections list.

3. **Snapshot Generation**
   - Background service or transactional trigger to recompute `FinancialProfileSnapshot` whenever sections change.
   - Expose snapshot in dashboard summary payload so quick glance tiles can leverage real totals once onboarding is complete.

4. **Validation & Telemetry**
   - FluentValidation rules ensuring numeric ranges, opt-out justifications, and consistent IDs.
   - Instrument endpoints with telemetry events consumed by dashboard logging hook.

## Data & Seeding
- Update development seeding (`DevelopmentDataSeeder`) to populate realistic accounts, liabilities, expenses, and benefits aligned with the new schema.
- Provide migration script to backfill existing demo users with partial data to demo resume flows.

## Dependencies & Sequencing
1. Schema & migrations (backend)
2. API endpoints + DTO alignment
3. Frontend stepper + autosave utilities
4. Individual forms & tests (parallelized)
5. Review step, unlock flow, and dashboard gating adjustments

## Risks & Mitigations
- **Scope overload:** Break work into per-section branches with review checkpoints.
- **Validation churn:** Document JSON payload examples per endpoint in `docs/api` to keep FE/BE aligned.
- **Performance:** Debounce autosave, batch writes per section to avoid chatty traffic.

## Definition of Done
- All steps in the spec implemented with real inputs and persistence.
- Dashboard unlock requires review confirmation; quick glance tiles reflect saved data.
- Automated tests covering happy paths, skips, and resume flows.
- Dev demo script updated to walk through the new onboarding experience end-to-end.
