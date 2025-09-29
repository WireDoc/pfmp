# Frontend & Backend Guide

## High-Level Architecture
- Backend: .NET 9 Web API (`PFMP-API`)
- Frontend: React + Vite + TypeScript (`pfmp-frontend`)
- Database: PostgreSQL (remote dev host + optional local)
- Auth: Azure AD (dev bypass in frontend)

## Key Paths
- Backend root: `PFMP-API/`
- Frontend root: `pfmp-frontend/`
- Docs: `docs/`
- Wave plans: `docs/waves/`

## Auth Dev Mode
If `import.meta.env.DEV` is true, simulated accounts are provided; real MSAL flow used in production build.

## Advice (Wave 1)
- Endpoints:
  - `POST /api/Advice/generate/{userId}`
  - `GET /api/Advice/user/{userId}`
  - `POST /api/Advice/{id}/accept` (idempotent)
  - `POST /api/Advice/{id}/reject` (idempotent)
- Status transitions: Proposed → Accepted | Rejected; cross changes blocked.

## Future Waves (See `docs/waves/REBUILD-WAVE-PLAN.md`)
- Routing & protection restoration
- Setup / onboarding context
- Dual-AI consensus scaffold
- Intelligence dashboards
- Performance & a11y hardening

## Restart Guidance
Restart backend after model/controller/service/auth wiring changes. Frontend handles hot reload for component/style logic.

## Adding a New API Endpoint (Pattern)
1. Add model / DTO (if needed)
2. Add DbSet / migration (if persistence required)
3. Create service interface + implementation
4. Register service in DI (`Program.cs`)
5. Add controller action
6. Add frontend service method (axios)
7. Integrate into UI component

## Simplified Data Flow (Advice Example)
Frontend button → `adviceService.generate` → API controller → AdviceService → AI service (mock) → EF save → return JSON → UI list refresh.
