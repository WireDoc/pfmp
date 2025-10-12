# PFMP – Personal Financial Management Platform

PFMP is an AI-assisted financial planning platform for government employees and service members. The solution combines a .NET 9 backend, a React 19 frontend, and Azure Entra ID authentication to deliver tailored advice, alerts, and portfolio management.

## Overview

- **Backend**: `PFMP-API/` (.NET 9 Web API, PostgreSQL 15)
- **Frontend**: `pfmp-frontend/` (React 19 + TypeScript + Vite)
- **Authentication**: Azure Entra ID with local bypass mode for development
- **Current Highlights**: Rebuilt onboarding through long-term obligations, Wave 4 dashboard quick glance metrics, and live obligation polling with SignalR-ready service abstraction
- **Planning Frames**: Wave 0–6 rebuild plan (tactical) aligned with roadmap Phases 1–5 (product milestones)

The platform is currently in the Wave rebuild effort. Implementation details, historical notes, and migration guidance now live inside the reorganized `docs/` directory.

## Quick start

### Prerequisites
- Windows with PowerShell 5.1+
- .NET 9 SDK
- Node.js 18+
- PostgreSQL 15 (remote instance available at `192.168.1.108:5433` for development)

> **Package manager**: npm is the supported frontend runner. The repo does not use pnpm or yarn.

### Preferred startup

```powershell
cd P:\
./start-dev-servers.bat
```

The batch script launches the API (`http://localhost:5052`) and the Vite dev server (`http://localhost:3000`) in separate PowerShell windows. Close those windows to stop the services.

### Manual startup

```powershell
# API
cd P:\PFMP-API
dotnet run --launch-profile http

# Frontend (new window)
cd P:\pfmp-frontend
npm run dev
```

### Health checks

```powershell
cd P:\
Invoke-WebRequest -Uri "http://localhost:5052/weatherforecast" | Select-Object StatusCode
Invoke-WebRequest -Uri "http://localhost:3000" | Select-Object StatusCode
Invoke-WebRequest -Uri "http://localhost:5052/api/auth/config" | Select-Object Content
```

Restart the API whenever controllers, DTOs, or EF models change. Database migrations should be applied with services stopped to avoid file locks.

## Documentation

All in-depth documentation lives under `docs/`, organised by subject. Start with:

- `docs/documentation-map.md` – canonical index
- `docs/history/roadmap.md` – product phases (Onboarding MVP → Intelligence engine)
- `docs/waves/REBUILD-WAVE-PLAN.md` – tactical wave breakdown and current status
- `docs/waves/MIGRATION_STATUS.md` – latest migration + onboarding updates (including long-term obligations support)
- `docs/testing/onboarding-persistence.md` – QA checklist + integration test commands for the onboarding flow
- `docs/auth/overview.md` and `docs/auth/getting-started.md` – authentication guidance & bypass mode
- `.github/instructions/instructions.md` – PowerShell workflow, daily startup, npm-only note

Update the documentation map whenever you add or relocate material.

## Development notes

- Use PowerShell for local workflows and chain commands with `;`
- Keep backend and frontend running in dedicated terminals (see `start-dev-servers.bat`)
- MUI Grid v2 `size` API is mandatory; ESLint blocks legacy `<Grid item>` usage
- Feature development follows conventional commits (e.g., `feat(auth): enable azure callback logging`)
- Run sanity checks before committing:
  - `dotnet build P:\PFMP-API\PFMP-API.csproj`
  - `npm run lint`
  - `npm run test -- onboardingLongTermObligations.integration.test.tsx`

## Status & roadmap

- Active version: **v0.8.0-alpha**
- Roadmap Phase 1 (Onboarding MVP) remains active, now bolstered by Wave 4 dashboard metrics and live obligation polling feeding future onboarding insights
- Track progress, migration notes, and future waves in `docs/waves/`

## Testing resources

- Manual test flows, advice lifecycle validation, and visual regression strategy live in `docs/testing/`
- Run targeted API requests with PowerShell `Invoke-RestMethod` or the `PFMP-API.http` scratch file
- Jest/React Testing Library scaffolding is planned for a future wave

## Test users (development only)

Four seeded accounts simplify local testing. All have `BypassAuthentication = true`:

| User | Profile | Notes |
|------|---------|-------|
| Sarah Johnson (1) | 22yo GS-07 | High-risk TSP strategies |
| Michael Smith (2) | 43yo GS-13 + VA disability | Balanced portfolio focus |
| Jessica Rodriguez (3) | 28yo USAF | Military integrations |
| David Wilson (4) | 26yo GS-09 | Onboarding wizard exercise |

See `docs/data/` and `docs/auth/implementation-complete.md` for deeper setup, advisory flows, and production hardening steps.

## Contributing

The project is currently private and under active development. Follow the established docs, keep commits scoped, and update the documentation map whenever you add or relocate material.

## License

Private project – all rights reserved.