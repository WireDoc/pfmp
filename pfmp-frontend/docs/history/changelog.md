# PFMP Frontend Changelog

## Unreleased
- _No changes yet_

## [0.8.0-alpha] - 2025-10-12

### Added
- Quick glance metrics panel on the Wave 4 dashboard featuring net worth change, outstanding tasks, and upcoming long-term obligation milestones.
- Live long-term obligation polling subscriber with drop-in SignalR path, wired through `useDashboardData`.

### Tests
- Extended `dashboardWave4Direct.test.tsx` coverage for real-time dashboard updates and quick glance tile assertions.
