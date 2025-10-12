# Changelog

All notable changes to this project will be documented in this file.

The format loosely follows [Conventional Commits](https://www.conventionalcommits.org/) and groups backend + frontend wave work.

## [Unreleased]

### Added
- _No changes yet_

### Changed
- _No changes yet_

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

