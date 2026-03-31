# PFMP – Personal Financial Management Platform

PFMP is an AI-assisted financial planning platform for government employees and service members. The solution combines a .NET 9 backend, a React 19 frontend, and Azure Entra ID authentication to deliver tailored advice, alerts, and portfolio management.

**Core Innovation**: Dual AI Pipeline (Azure OpenAI + Anthropic) with consensus-based financial recommendations for unparalleled accuracy and safety in automated financial advice.

## Overview

- **Backend**: `PFMP-API/` (.NET 9 Web API, PostgreSQL)
- **Frontend**: `pfmp-frontend/` (React 19 + TypeScript + Vite)
- **Authentication**: Azure Entra ID with local bypass mode for development
- **AI Architecture**: Dual-model pipeline planned (Azure OpenAI + Anthropic) with consensus scoring - See Phase 3 in roadmap
- **Current Highlights**: 
  - **Wave 12.5 Complete** - Unified Plaid account linking with liabilities sync (March 2026)
  - Single "Link Account" button connects banks, investments, credit cards, and mortgages
  - Credit card, mortgage, and student loan sync via Plaid Liabilities
  - Mortgage-to-property auto-linking with equity tracking
  - Synced field protection: Plaid-managed fields are read-only in edit dialogs
  - Credit utilization alerts and overdue payment detection
  - ITEM_LOGIN_REQUIRED detection with SyncStatus.Expired handling
  - 10 custom sandbox users for comprehensive testing
  - **Wave 12 Complete** - Plaid investment account linking with holdings sync (January 2026)
  - Investment transactions: buy, sell, dividend, contribution, withdrawal tracking
  - Opening balance detection with dialog for adding historical cost basis
  - Automatic price refresh with FMP API integration
  - Tax insights: Short/long-term gains, holding period tracking, tax-loss harvesting
  - **Wave 11 Complete** - Plaid bank account linking with transaction sync (December 2025)
  - Automatic balance + transaction sync for 12,000+ financial institutions
  - Connection lifecycle: connect, reconnect, disconnect, delete
  - **Wave 10 Complete** - Background jobs with Hangfire (TSP prices, market data, net worth snapshots)
  - **Wave 9.3 Complete** - D3.js visualizations, debt payoff strategies, investment analytics
  - **Wave 5 MVP Complete** - Production dashboard with 15-section onboarding, AI advisory, and TSP tracking
  - All 93 backend + 289 frontend tests passing
- **Planning Frames**: Wave 0–6 rebuild plan (tactical) aligned with roadmap Phases 1–5 (product milestones)

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

- Active version: **v0.12.0-alpha** (Wave 12.5 Complete - March 2026)
- **Milestone**: Wave 12 + 12.5 complete — full Plaid integration (banks, investments, liabilities)
- **Achievement**: Unified account linking, synced field protection, 382 total tests passing
- **Next Phase**: Wave 13 (Crypto Exchange Integration) or Wave 15 (Property Management)
- Roadmap Phase 2 (Data Aggregation) complete; Phase 3 (AI Advisory) on deck

### Upcoming Waves

| Wave | Focus | Target |
|------|-------|--------|
| **13** | Crypto Exchange Integration | Q2-Q3 2026 |
| | • Coinbase, Binance, Kraken, Gemini APIs | |
| | • Holdings sync with staking support | |
| **14** | Spending Analysis & Budgeting | Q3 2026 |
| | • Category breakdowns & trends | |
| | • Budget tracking & cash flow forecasting | |
| **15** | Property Management | Q3 2026 |
| | • Dashboard CRUD for properties | |
| | • Automated valuation via AVM providers | |

Track progress, migration notes, and future waves in `docs/waves/`

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