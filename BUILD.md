# Build & Test Guide

## Scripts Overview

- `build-all.bat`
  - Windows convenience wrapper for CI-style build.
  - Supports flags:
    - `-SkipFrontend` : Skip npm install + frontend build
    - `-SkipBackend` : Skip .NET restore/build/test
  - Exit codes: non-zero on failure. Prints explicit FAILED line.

- `scripts/ci-build.ps1`
  - Core build pipeline steps:
    1. Restore .NET backend
    2. Build .NET backend (Release)
    3. Run backend tests (if `PFMP-API.Tests` exists)
    4. Install frontend dependencies (npm install)
    5. Lint + typecheck + build frontend (Vite production build)
  - Flags: `-SkipFrontend`, `-SkipBackend`.

## Health Endpoint

The backend exposes `GET /health` returning JSON:
```
{
  "status": "OK",
  "service": "PFMP-API",
  "utc": "2025-10-01T00:00:00Z",
  "env": "Development"
}
```
Used by test `HealthEndpointTests` to verify service is up.

## Adding Tests

Place unit/integration tests under `PFMP-API.Tests`. The CI script auto-discovers and executes them via `dotnet test` after a successful backend build.

### Example Test Included
- `HealthEndpointTests` validates `/health` shape.
- `AdviceServiceSmokeTests` exercises advice lifecycle (generate, accept, dismiss, provenance linking).

## Typical Local Build Flow

Full build:
```
build-all.bat
```
Skip frontend:
```
build-all.bat -SkipFrontend
```
Skip backend:
```
build-all.bat -SkipBackend
```
Run PowerShell script directly:
```
powershell -ExecutionPolicy Bypass -File scripts/ci-build.ps1
```

## Failure Diagnosis
- Batch script returns non-zero and prints `CI build FAILED`.
- Inspect preceding step output for the first failing step banner (e.g., `Step failed: Build .NET (Release)`).
- Re-run a single step manually (e.g., `dotnet build PFMP-API -c Release`).

## Environment Notes
- Assumes Node.js & npm installed and on PATH.
- Assumes .NET 9 SDK installed (`dotnet --version`).
- Frontend build artifacts emitted to `pfmp-frontend/dist`.

## Solution File

The repository includes `PFMP.sln` bundling:
1. `PFMP-API`
2. `PFMP-API.Tests`

Build via:
```
dotnet build PFMP.sln
```
Add another project:
```
dotnet sln PFMP.sln add path\to\Project.csproj
```

## Code Coverage

Automatic coverage collection (Cobertura) occurs during the test step using:
```
dotnet test PFMP-API.Tests -c Release --collect:"XPlat Code Coverage"
```
Coverage files: `PFMP-API.Tests/TestResults/<run>/coverage.cobertura.xml`.
Generate HTML locally (optional):
```
dotnet tool install -g dotnet-reportgenerator-globaltool
reportgenerator -reports:PFMP-API.Tests/TestResults/**/coverage.cobertura.xml -targetdir:coverage-report
```

## Swagger / OpenAPI

Swagger UI enabled in Development automatically. Force-enable elsewhere with configuration key:
```
Swagger:Always=true
```
Endpoints:
* UI: `/swagger`
* Spec: `/swagger/v1/swagger.json`

## Custom Endpoint Listing

`GET /api/docs/endpoints` returns a simplified JSON list of controller/action routes (supplements Swagger).

## Frontend Smoke Script

`npm run smoke` (inside `pfmp-frontend`) performs:
1. GET /health
2. GET /api/Advice/user/1
3. POST /api/Advice/generate/1
4. POST /api/Advice/{id}/accept
5. GET /api/Tasks?userId=1 (verifies linkage)
Fails fast with non-zero exit on any failure.

## Docker (API + Postgres)

### Compose Startup (API only, external DB)
Create a `.env` from `.env.example` and set `EXTERNAL_DB_CONN`.
```
docker compose -f docker/docker-compose.yml up --build -d
```
Services started:
- `api`: PFMP-API (host port 5052, container 8080)

Health check:
```
curl http://localhost:5052/health
```

Swagger (dev): `http://localhost:5052/swagger`

### Tear Down & Cleanup
```
docker compose -f docker/docker-compose.yml down -v
```
Removes containers and the named volume `pgdata`.

### Iteration Tips
- For fastest C# feedback keep using `dotnet run` locally; reserve containers for integration/system tests.
Rebuild only API layer after code changes:
```
docker compose -f docker/docker-compose.yml build api
docker compose -f docker/docker-compose.yml up -d api
```

### Environment Overrides
Add a `.env` file at repo root (auto-loaded by compose) with the external connection string:
```
EXTERNAL_DB_CONN=Host=192.168.1.108;Port=5433;Database=pfmp_dev;Username=pfmp_user;Password=REDACTED;Include Error Detail=true
```

### Backups (External Postgres)
Since Postgres runs on Synology, schedule regular dumps (example Windows scheduled task or Synology cron):
```
pg_dump --format=custom --file pfmp_$(Get-Date -Format yyyyMMdd_HHmm).dump --dbname "Host=192.168.1.108;Port=5433;Database=pfmp_dev;Username=pfmp_user;Password=..."
```
Retain a rotation (e.g., last 7 daily, 4 weekly). Consider verifying restore quarterly.

### Future Hardening
- Non-root runtime user
- Read-only filesystem
- Multi-arch build (amd64/arm64)
- Image vulnerability scan in CI (Trivy/Grype)

## Next Enhancements (Optional)
- HTML coverage publishing in CI (artifact upload).
- Parallelize backend + frontend phases.
- Frontend container (optional) for unified deploy.
- OpenAPI-driven TypeScript client generation.
- Automated migration validation step (apply + diff).

---
This document maintained alongside `scripts/ci-build.ps1` and `build-all.bat`; update when adding new flags or steps.
