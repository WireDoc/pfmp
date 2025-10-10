# Changelog

All notable changes to this project will be documented in this file.

The format loosely follows [Conventional Commits](https://www.conventionalcommits.org/) and groups backend + frontend wave work.

## [Unreleased]

### Added
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
- test(api): onboarding & dev users controller coverage

### Changed
- docs: migrated legacy root files (`BUILD.md`, `DEV-SCRIPTS.md`, `pfmp.txt`, `CHANGELOG.md`) into subject folders
- docs: README and instructions rewritten to describe the new taxonomy
- docs: instructions relocated to `.github/instructions/instructions.md` for Copilot indexing
- docs: auth guidance consolidated under `docs/auth/`
- chore(api): OnboardingProgress EF entity + migration (jsonb storage)
- chore(dev): DevelopmentDataSeeder baseline + onboarding scenarios
- feat(api): onboarding progress controller now supports `?email=` lookup

### Planned / Pending
- Wave 2 onboarding refinement (validation schemas)
- Wave 3 persistence implementation (server endpoints, DTO normalization)
- Performance baseline + visual regression harness

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

