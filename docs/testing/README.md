# Testing Guides Index

Modular testing references grouped by subject. Each guide provides:
- Purpose & scope
- Key endpoints or UI paths
- Minimal PowerShell examples (primary) + curl equivalents
- Validation checklist

## Available Guides

### Backend API Testing
- [Advice Testing](./advice-testing.md) - Generate, list, accept (auto-creates task), dismiss, provenance fields
- [Task Testing](./tasks-testing.md) - Direct task CRUD, status transitions, linkage from accepted advice
- [Onboarding Testing](./onboarding-testing.md) - Wave 3 persistence (GET/PUT/PATCH/RESET) + dev user switching

### Frontend Testing
- [Dashboard Wave 4 Manual Smoke](./dashboard-wave4-manual-checks.md) - Run the app with mock data to validate end-to-end UX before enabling real data
- [Dashboard MSW Handlers](./dashboard-msw-handlers.md) - Troubleshooting matcher patterns and shared fixtures for dashboard API
- [Visual Regression Plan](./visual-regression-plan.md) - Playwright visual regression strategy (future)

### Frontend Vitest Quick Reference

**Fast iteration during development** (instead of running all 112 tests):

```powershell
# Dashboard tests only (56 tests, ~25s)
npm test -- --run dashboard

# Pattern matching
npm test -- --run onboarding
npm test -- --run navigation

# Watch mode (auto-rerun on changes)
npm test -- dashboard

# Full suite (112 tests, ~3 min) - before pushing
npm test -- --run
```

**Test organization:**
- Dashboard: 9 files, 56 tests (~25s)
- Onboarding: ~60 tests (~2 min)
- Components/Layout: Unit tests for UI components

See [dashboard-wave4-manual-checks.md](./dashboard-wave4-manual-checks.md) for specific Vitest commands to run after manual testing.

## Conventions
- Base API URL: `http://localhost:5052/api`
- PowerShell is canonical; curl shown for portability
- Use test user IDs (1–4) already seeded

## Quick Snippets
Generate advice & accept (auto task creation):
```powershell
Invoke-RestMethod -Method POST http://localhost:5052/api/Advice/generate/1
# list (shows Proposed advice)
Invoke-RestMethod http://localhost:5052/api/Advice/user/1 | Format-Table adviceId,status,linkedTaskId,sourceAlertId
# accept (task auto-created; response includes linkedTaskId afterwards)
Invoke-RestMethod -Method POST http://localhost:5052/api/Advice/123/accept
# verify linkage
Invoke-RestMethod http://localhost:5052/api/Advice/123 | Select-Object adviceId,status,linkedTaskId,acceptedAt
```
