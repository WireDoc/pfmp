NOTE TO SELF (TEMP CONTEXT SNAPSHOT) – AUTOSAVE + TEST REFACTOR IN PROGRESS

Last push baseline (before current autosave/test work):
- Unified TSP onboarding form (compact add‑fund table, Contribution% + Units only, validation = 100%, reset modal planned).
- Layout: Full-width onboarding, header redesign with LogoMark variants, Dev User Switcher moved to bottom, loading view now 100%.
- Backend: Denormalized TSP position fields (CurrentPrice, CurrentMarketValue, CurrentMixPercent, TotalBalance) + migration; contributionPercent rename + DateUpdated column applied successfully.
- Docs: Instructions updated (Grid v2 guidance, single-thread Vitest rationale).
- Postman collection updated for new endpoints (summary-lite, backfill).
- Solution consolidation: Only PFMP.sln retained.

Current active task: Standardize AUTOSAVE across all 14 onboarding sections and remove manual save buttons. Adapt tests to new autosave + navigation flow (no more *-submit buttons).

Autosave implementation status:
- ProfileStepLayout.tsx: Added safeGoNext / safeGoPrev that await a global flush hook reference (window.__pfmpCurrentSectionFlush).
- InvestmentAccountsSectionForm.tsx: Converted to use useAutoSaveForm + AutoSaveIndicator; manual submit button removed.
- Household & Risk & Goals: Previously had autosave; flush registration logic planned (verify still needed).
- Remaining sections (NOT yet converted): Income, Expenses, CashAccounts, Benefits, TaxPosture, Tsp, Properties, LongTermObligations, Liabilities, Insurance, RealEstate (if separate), Equity placeholder, etc. Still using manual save or vulnerable to data loss if navigating without explicit save.

Issues encountered:
1. Test files still reference removed submit buttons (e.g. investments-submit, household-submit) causing Vitest failures.
2. File edit persistence intermittently failing earlier (writes not sticking). Manual verification fixed; persistence restored for one marker; then intermittent again; ultimately confirmed can add comments now.
3. Helper file (onboardingTestHelpers.tsx) still contains legacy submit-click logic. Full rewrite requested but not yet successfully applied due to earlier persistence problems.
4. Investments integration test still uses investments-submit (see current content). Needs refactor to:
   - Fill fields
   - Wait for autosave (watch indicator state or a debounce period)
   - Click “Next section” (data-testid onboarding-next) OR invoke advance helper that ensures flush + navigation.
5. Stuck “Saving…” indicator previously reported: rely purely on useAutoSaveForm state transitions (saved → idle). Need to confirm each converted section calls resetBaseline on hydration.

Planned refactor steps (order):
A. Stabilize file writes (confirmed; proceed).
B. Full rewrite of src/tests/utils/onboardingTestHelpers.tsx:
   - Remove all *-submit interactions.
   - Add utility: waitForAutosaveComplete(sectionName) using AutoSaveIndicator states (saving → saved → idle).
   - Add navigation helpers: clickNextSection(), clickPrevSection(), jumpToSection(sideNavLabel).
   - Ensure advanceTo<Section> helpers chain autosave waits + navigation.
C. Update each integration test:
   - Replace submit clicks with: fill fields → waitForAutosaveComplete → clickNextSection.
   - Opt-out scenarios: set optOut checkbox + reason → wait for autosave → navigate.
D. Convert remaining section forms to autosave pattern:
   - Extract buildPayload() + deriveStatus().
   - Integrate useAutoSaveForm.
   - Remove manual save button entirely (do NOT leave hidden artifacts).
   - Register window.__pfmpCurrentSectionFlush in useEffect.
E. Add Reset modal (already requested earlier) AFTER autosave standardization (optional if time permits).
F. Run full test suite (single-thread) ensuring no leftover *-submit references.
G. Lint + build.
H. Manual UI click-through across all sections to confirm no data loss on Next navigation.
I. Commit autosave refactor in logical batches (forms + tests) then push.

Validation strategy for autosave:
- Type in a field, immediately click Next → new section loads → navigate back → field value persisted.
- Simulate rapid sequential edits while waiting for flush; ensure only latest payload sent (check network inspector or API spy).
- Opt-out toggles save promptly (status becomes Opted Out without manual click).

Outstanding risk / watchpoints:
- Global flush on window may conflict if two sections mount simultaneously (unlikely in current linear wizard; acceptable for now).
- Tests relying on timing: must ensure autosave debounce interval (if any) is awaited correctly (maybe expose a test override or set debounce to 0 in test env).
- Need consistent deriveStatus logic so summary UI marks sections Completed / Needs Info / Opted Out identically.

To do next (immediate):
1. Rewrite onboardingTestHelpers.tsx fully.
2. Refactor Investments integration test.
3. Confirm no household-submit leftover references.
4. Begin converting Income + Expenses sections.

Hold off pushing until:
- All tests green.
- Manual verification done by user.

After push:
- Update docs snippet for autosave pattern (architecture note + useAutoSaveForm usage).
- Possibly remove now-unused form-level save state variables from legacy sections.

Reference components/hooks involved:
- useAutoSaveForm.ts (central autosave logic)
- AutoSaveIndicator.tsx (state display)
- ProfileStepLayout.tsx (navigation flush)
- Section forms (various) needing conversion.

Next branch suggestion (if branching desired):
- feat/onboarding-autosave-standardization

END NOTE