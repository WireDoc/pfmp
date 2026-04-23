# PFMP – Personal Financial Management Platform

PFMP is an AI-assisted financial planning platform for government employees and service members. The solution combines a .NET 9 backend, a React 19 frontend, and Azure Entra ID authentication to deliver tailored advice, alerts, and portfolio management.

**Core Innovation**: Dual AI Pipeline (Azure OpenAI + Anthropic) with consensus-based financial recommendations for unparalleled accuracy and safety in automated financial advice.

## Overview

- **Backend**: `PFMP-API/` (.NET 9 Web API, PostgreSQL)
- **Frontend**: `pfmp-frontend/` (React 19 + TypeScript + Vite)
- **Authentication**: Azure Entra ID with local bypass mode for development
- **AI Architecture**: Dual-model pipeline planned (Azure OpenAI + Anthropic) with consensus scoring - See Phase 3 in roadmap
- **Current Highlights**:
  - **Wave 21 Complete** – Estate planning & beneficiary tracking; AI now flags missing wills, POAs, and TSP/FEGLI designations (April 2026)
  - **Wave 20 Complete** – LES SCD extraction, FEHB plan auto-fill from OPM table, SF-50 uploader retired (April 2026)
  - **Wave 19 Complete** – TSP Roth/traditional split, COLA modeling, custom retirement age, survivor benefit, income gap analysis (April 2026)
  - **Wave 18 Complete** – Federal benefits deep dive: SF-50/LES PDF parsing, FERS pension auto-calc, multi-scenario retirement projector (April 2026)
  - **Wave 17 Complete** – Dashboard expansion: profile editor, accounts hub, insights/tasks pages, command palette, goal projections, data export (April 2026)
  - **Wave 16 Complete** – OpenRouter unified AI gateway (Gemini primary + Claude verifier) with full 14-section financial context (March 2026)
  - **Wave 15 Complete** – Property management with Estated AVM auto-valuation and USPS address validation (March 2026)
  - **Wave 12.5 Complete** – Unified Plaid linking (banks + investments + liabilities) with synced-field protection (March 2026)
  - **Wave 12 Complete** – Plaid Investments: holdings sync, opening balance detection, tax-aware transaction tracking (January 2026)
  - **Wave 11 Complete** – Plaid bank linking with daily transaction sync for 12,000+ institutions (December 2025)
  - **Wave 10 Complete** – Hangfire background jobs (TSP prices, market data, net worth snapshots)
  - **Wave 9.3 Complete** – D3.js visualizations, debt payoff strategies, investment analytics; 9.3.7 polish shipped April 2026
  - **Wave 5 MVP Complete** – Production dashboard with 15-section onboarding, AI advisory, and TSP tracking
  - 625 tests passing (485 frontend + 140 backend) as of Wave 17 sign-off
- **Planning Frames**: Wave 0–6 rebuild plan (tactical) aligned with roadmap Phases 1–5 (product milestones); Waves 13 (Crypto) and 14 (Spending Analysis) are the only outstanding planned waves

The platform is currently in the Wave rebuild effort. Implementation details, historical notes, and migration guidance now live inside the reorganized `docs/` directory.

## Quick start

### Prerequisites
- Windows with PowerShell 5.1+
- .NET 9 SDK
- Node.js 18+
- PostgreSQL (development database available at `192.168.1.108:5433`)

> **Package manager**: npm is the supported frontend runner. The repo does not use pnpm or yarn.

### Preferred startup

```powershell
cd C:\pfmp
./start-dev-servers.bat
```

The batch script launches the API (`http://localhost:5052`) and the Vite dev server (`http://localhost:3000`) in separate PowerShell windows. Close those windows to stop the services.

### Manual startup

```powershell
# API
cd C:\pfmp\PFMP-API
dotnet run --launch-profile http

# Frontend (new window)
cd C:\pfmp\pfmp-frontend
npm run dev
```

### Health checks

```powershell
cd C:\pfmp
Invoke-WebRequest -Uri "http://localhost:5052/health" | Select-Object StatusCode
Invoke-WebRequest -Uri "http://localhost:5052/api/auth/config" | Select-Object Content
Invoke-WebRequest -Uri "http://localhost:3000" | Select-Object StatusCode
```

Restart the API whenever controllers, DTOs, or EF models change. Database migrations should be applied with services stopped to avoid file locks.

## Documentation

All in-depth documentation lives under `docs/`, organised by subject. Start with:

- `docs/documentation-map.md` – canonical index
- `docs/history/roadmap.md` – product phases (Onboarding MVP → Intelligence engine)
- `docs/waves/REBUILD-WAVE-PLAN.md` – tactical wave breakdown and current status
- `docs/waves/MIGRATION_STATUS.md` – latest migration + onboarding updates (including TSP lifecycle positions and daily snapshots)
- `docs/testing/onboarding-persistence.md` – QA checklist + integration test commands for the onboarding flow
- `docs/auth/overview.md` and `docs/auth/getting-started.md` – authentication guidance & bypass mode
- `docs/dev/mcp-integration.md` – MCP PostgreSQL server integration for AI database access
- `.github/instructions/instructions.md` – PowerShell workflow, daily startup, npm-only note

Update the documentation map whenever you add or relocate material.

## Development notes

- Use PowerShell for local workflows and chain commands with `;`
- Keep backend and frontend running in dedicated terminals (see `start-dev-servers.bat`)
- MUI Grid v2 `size` API is mandatory; ESLint blocks legacy `<Grid item>` usage
- Feature development follows conventional commits (e.g., `feat(auth): enable azure callback logging`)
- **MCP PostgreSQL Integration**: AI assistants can query the database directly using natural language (see `docs/dev/mcp-integration.md`)
  - Example: "Using MCP Postgres, list all tables" or "Using MCP Postgres, show me the schema for the Accounts table"
  - Test the bridge: `cd C:\pfmp\mcp-bridge; node .\test-client.mjs`
- Run sanity checks before committing:
  - `dotnet build C:\pfmp\PFMP-API\PFMP-API.csproj`
  - `npm run lint`
  - `npm run test -- onboardingLongTermObligations.integration.test.tsx`

## Postman collection

Use the bundled Postman assets for quick API exploration:

- Collection: `PFMP-API/postman/PFMP-API.postman_collection.json`
- Environment: `PFMP-API/postman/PFMP-Local.postman_environment.json`

Steps:
1. Import both files into Postman
2. Set `{{baseUrl}}` to `http://localhost:5052`
3. Adjust variables like `{{userId}}` as needed (defaults to 1)

See `docs/api/postman.md` for details.

## Status & roadmap

- Active version: **v0.22.0-alpha** (see `VERSION`; reserved `v0.21` for the Wave 16–21 audit, `v0.22` opens Wave 13 work, bumps to `v0.23` on Wave 13 closeout)
- **Latest milestone**: Wave 21 (Estate Planning & Beneficiary Tracking) shipped April 2026
- **Recently shipped**: Waves 15 (Property Mgmt) → 16 (OpenRouter AI) → 17 (Dashboard Expansion) → 18 (Federal Benefits Deep Dive) → 19 (Advanced Retirement Planning) → 20 (FEHB/LES Enhancements) → 21 (Estate Planning); plus Wave 9.3.7 polish (April 23, 2026)
- **Next up**: Wave 13 (Crypto Exchange Integration) – planning in progress; Wave 14 (Spending Analysis) follows
- **Roadmap phases**: Phase 2 (Data Aggregation) complete; Phase 3 (AI Advisory) materially complete via Waves 7/16/18/19; Phase 4 (Daily Experience & Notifications) and Phase 5 (Production Hardening) remain

### Upcoming Waves

| Wave | Focus | Status |
|------|-------|--------|
| **13** | Crypto Exchange Integration (Coinbase, Binance, Kraken, Gemini; read-only API keys; holdings + staking + transactions) | 📋 Planning – see `docs/waves/wave-13-crypto-exchanges.md` |
| **14** | Spending Analysis & Budgeting (category trends, budgets, recurring detection, cash-flow forecasting) | 📋 Planned |
| **Phase 4** | Daily summary, notifications, calendar/timeline, advisor-meeting export | 📋 Future |
| **Phase 5** | Production hardening: Azure Entra re-enable, Key Vault, audit logging, SLAs | 📋 Future |

Track progress, migration notes, and full wave history in `docs/waves/` and `docs/history/roadmap.md`.

## Testing resources

- Manual test flows, advice lifecycle validation, and visual regression strategy live in `docs/testing/`
- Run targeted API requests with PowerShell `Invoke-RestMethod` or the `PFMP-API.http` scratch file
- Jest/React Testing Library scaffolding is planned for a future wave

## TSP summary and snapshots (new)

- Financial Profile includes lifecycle funds (L2030–L2075) alongside G/F/C/S/I.
- Endpoints:
  - `GET /api/financial-profile/{userId}/tsp/summary` – computes current values and mix using market prices
  - `POST /api/financial-profile/{userId}/tsp/snapshot` – idempotently captures a daily snapshot (prior-market-close as-of)
  - `GET /api/financial-profile/{userId}/tsp/snapshot/latest` – fetches latest snapshot metadata
- Client temporarily triggers a freshness check on dashboard load; the API enforces once-per-day retention by normalized as-of date.

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