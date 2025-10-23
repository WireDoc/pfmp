# Changelog

All notable changes to this project will be documented in this file.

The format loosely follows [Conventional Commits](https://www.conventionalcommits.org/) and groups backend + frontend wave work.

## [Unreleased]

### Added
- feat(frontend): Cash Accounts section now uses dropdown for account types (Checking, Savings, Money Market, CD, High-Yield Savings, Other) instead of free text
- feat(frontend): Tax section completely redesigned with W-4 focus and state dropdown
  - Added US states dropdown (all 50 states + DC) for state of residence
  - Simplified to W-4 withholding information (removed confusing marginal/effective rates)
  - Removed unnecessary fields: expected refund, expected payment due
  - Consolidated CPA toggles into single "I work with a CPA" option
  - Added helper text explaining federal withholding percentage
- feat(backend): Dev user reset now comprehensively clears all financial profile data
  - Updated `OnboardingProgressService.ResetAsync` to remove all related entities
  - Clears: cash accounts, investments, properties, liabilities, expenses, income, insurance, TSP, obligations
  - Resets User profile fields to defaults while preserving authentication
- feat(frontend): Dev user reset button now triggers page reload for immediate visual feedback

### Changed
- refactor(frontend): All onboarding API sections now use proper PascalCase mapping for backend compatibility
  - Fixed 11 sections: Income, Equity, Liabilities, Investments, Cash, Properties, Expenses, Long-Term Obligations, Tax, Insurance, Benefits
  - Added default values for required fields to prevent 400 errors during autosave
  - Properly map OptOut object with IsOptedOut, Reason, AcknowledgedAt fields
- improve(frontend): Equity & Private Holdings section now auto-completes on first visit when default option is selected

### Fixed
- fix(frontend): sidebar status chips now update in real-time after form completion
  - Root cause: `mountedRef` in `useAutoSaveForm` hook was not being reset to `true` on component remount
  - React StrictMode intentionally remounts components during development, leaving `mountedRef=false` from cleanup
  - This caused all autosave callbacks to abort with "component unmounted" message
  - Solution: Added `mountedRef.current = true` in useEffect setup function to properly handle remounting
- fix(backend): Risk & Goals liquidity buffer field now persists to database
  - Added `LiquidityBufferMonths` column to `User` model (type: `decimal(5,2)`)
  - Updated `UpsertRiskGoalsAsync` to save `input.LiquidityBufferMonths` value
  - Updated `GetRiskGoalsAsync` to return actual value instead of hardcoded `null`
  - Created and applied EF migration: `20251021202604_AddLiquidityBufferMonths`
- fix(frontend): All onboarding sections no longer produce 400 Bad Request errors during autosave
  - Fixed PascalCase/camelCase mismatches between frontend and backend
  - Added proper null handling and default values for required fields
- fix(frontend): Income section API payload mapping corrected (Streams, OptOut casing)
- fix(frontend): Liabilities section properly maps all required fields with defaults
- fix(frontend): Investments section includes all required account fields
- chore(frontend): added comprehensive debug logging for status update chain (temporary, for diagnostics)
- chore(frontend): fixed TypeScript error in `CashAccountsSectionForm` error rendering
- test(frontend): fixed regex escape sequences in `onboardingEquity.integration.test.tsx`

### Planned / Pending
- Wave 2 onboarding refinement (validation schemas)
- Wave 3 persistence implementation (server endpoints, DTO normalization)
- Performance baseline + visual regression harness

## [0.8.0-alpha] - 2025-10-12

### Added
- docs: `docs/testing/onboarding-persistence.md` refreshed with long-term obligations coverage and regression commands
- docs: `README.md` updated with npm-only workflow note and current onboarding highlights
- docs: subject-based documentation map at `docs/documentation-map.md`
- docs: dedicated `docs/scripts/` folder consolidating automation references
- docs: `docs/auth/overview.md` capturing platform-wide auth architecture
- docs: `docs/data/runbooks/database-backup.md` for PostgreSQL + Synology flows
- docs: onboarding testing guide and troubleshooting updates (Wave 2 support)
- feat(api): database-backed onboarding progress (GET/PUT/PATCH/RESET)
- feat(api): reset endpoint POST `/api/onboarding/progress/reset` for manual testing
- feat(dev): DevUserRegistry with dynamic default test user id
- feat(dev): dev users listing & default selection endpoints (`/api/dev/users`)
- feat(frontend): DevUserSwitcher component & default onboarding flags
- feat(frontend): long-term obligations onboarding section, API client wiring, and snapshot fields
- feat(frontend): dashboard derives long-term obligations insights with automated coverage
- feat(frontend): dashboard long-term obligations polling subscriber with drop-in SignalR path
- feat(frontend): quick glance metrics on Wave 4 dashboard combining net worth change, outstanding tasks, and upcoming obligation milestones
- test(api): onboarding & dev users controller coverage
- test(frontend): `onboardingLongTermObligations.integration.test.tsx` for complete + opt-out flows
- test(frontend): `dashboardWave4Direct.test.tsx` coverage for live obligation updates

### Changed
- docs: `docs/waves/MIGRATION_STATUS.md` now captures frontend support for long-term obligations
- docs: migrated legacy root files (`BUILD.md`, `DEV-SCRIPTS.md`, `pfmp.txt`, `CHANGELOG.md`) into subject folders
- docs: README and instructions rewritten to describe the new taxonomy
- docs: instructions relocated to `.github/instructions/instructions.md` for Copilot indexing
- docs: auth guidance consolidated under `docs/auth/`
- feat(frontend): Wave 4 dashboard layout refreshed with quick glance summary and live obligation polling hooks
- chore(api): OnboardingProgress EF entity + migration (jsonb storage)
- chore(dev): DevelopmentDataSeeder baseline + onboarding scenarios
- feat(api): onboarding progress controller now supports `?email=` lookup

## [0.7.0-alpha] - 2025-10-03
### Added
- Wave 0 documentation alignment completed (root wave docs, plan artifacts)
- Wave 1 routing & protection: React Router shell, `ProtectedRoute`, NotFound handling, Dev Flags Panel
- Wave 2 onboarding scaffold: context, wizard UI, feature flag gating, simulated auth integration
- Persistence design doc (`WAVE-3-PERSISTENCE-DESIGN`) and feature flag `onboarding_persistence_enabled`
- Hydration + debounced PATCH/PUT client scaffolding for onboarding progress
- Authentication toggle documentation (simulated vs real MSAL) in frontend README
- Storybook setup + visual regression plan scaffolds (deferred execution)
- Git version file `VERSION`

### Changed
- Feature flag infrastructure stabilized (cached snapshot for `useSyncExternalStore`)
- Theming integration (MUI theme provider + baseline)
- Environment overrides for Azure AD configuration (MSAL readiness)

### Removed
- Misplaced duplicate persistence design doc under `pfmp-frontend/docs/waves` (canonical resides in `docs/waves`)

### Notes
This release marks the transition from documentation / architectural consolidation to interactive onboarding + persistence preparation.

## [0.6.x] - 2025-09 (Historical Summary)
### Added
- AI integration (Azure OpenAI) and intelligent alert system
- Market data ingestion + real-time portfolio valuation
- Comprehensive task management domain & recommendation endpoints
- TSP full fund coverage + demographic-aware portfolio modeling

---

### Updating the Changelog
For new work:
1. Add an entry under Unreleased.
2. When tagging a release, move Unreleased items into a new version section with date.
3. Keep sections (Added / Changed / Deprecated / Removed / Fixed / Security) as needed.

