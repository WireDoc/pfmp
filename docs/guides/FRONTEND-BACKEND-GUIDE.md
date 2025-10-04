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
## Onboarding Persistence (Wave 3)
Endpoints (all under `/api/onboarding`):
| Method | Path | Description |
|--------|------|-------------|
| GET | /progress | Get current user onboarding snapshot (404 = fresh) |
| PUT | /progress | Upsert full snapshot (currentStepId, completedStepIds, stepPayloads) |
| PATCH | /progress/step/{stepId} | Partial step data update and/or mark complete |
| POST | /progress/reset | Delete snapshot (dev/testing convenience) |

Query parameters:
- `userId=` overrides dev registry default
- `email=` resolves user by email (dev only)

## Dev User Switching
Backend registry: `/api/dev/users` (GET list, POST `/api/dev/users/default/{userId}` to change default).
Frontend: DevUserSwitcher component (added in `App.tsx`) sets backend default and injects `userId` into onboarding persistence calls.

### Admin User Management (New)
Instead of startup seeding, create and remove users explicitly:
| Method | Path | Purpose |
|--------|------|---------|
| POST | /api/admin/users | Create baseline user |
| POST | /api/admin/users/test?scenario=fresh|mid|done | Create test user with optional onboarding snapshot |
| DELETE | /api/admin/users/{id} | Delete user + cascaded data |

Scenarios:
- `fresh`: no onboarding progress
- `mid`: currentStep financialProfile; welcome+profile completed
- `done`: currentStep confirmation; welcome+profile+financialProfile+preferences completed

Legacy automatic seeding retained under `archive/seeder` for reference.

## API Documentation & AI Integration
- Swagger/OpenAPI UI (dev): `http://localhost:5052/swagger` (always on in Development)
- OpenAI model usage central service: see `AIService` in backend (configuration in `appsettings.*` under `OpenAI`).

## Quick Onboarding Flow Example (PowerShell)
```powershell
Invoke-RestMethod -Method GET http://localhost:5052/api/onboarding/progress # 404 if no progress
Invoke-RestMethod -Method PATCH http://localhost:5052/api/onboarding/progress/step/welcome -Body '{"data":{"ack":true},"completed":true}' -ContentType 'application/json'
Invoke-RestMethod -Method GET http://localhost:5052/api/onboarding/progress
Invoke-RestMethod -Method POST http://localhost:5052/api/onboarding/progress/reset
```

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
