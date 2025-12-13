# PFMP Development Instructions

> **Quick navigation**
> - `docs/guides/QUICK-START.md` – End-to-end environment setup and workflow
> - `docs/waves/REBUILD-WAVE-PLAN.md` – Current rebuild scope and acceptance criteria
> - `docs/waves/MIGRATION_STATUS.md` – Live migration checklist
> - `docs/waves/SESSION_COMPLETE.md` – Prior session summary
> - `docs/history/roadmap.md` – Delivery roadmap tied to PFMP vision
> - `docs/documentation-map.md` – Canonical index of every doc

## 1. Documentation guardrails

- Check `docs/documentation-map.md` and `docs/meta/documentation-strategy.md` before creating, moving, or deleting docs. Keep both updated with any change you make.
- Every document except the root `README.md` lives under `docs/`, organized by the existing taxonomy. Use the relevant folder or its `archive/` counterpart when retiring content.
- Do **not** create new directories (under `docs/` or elsewhere) without maintainer approval; reuse the established structure.
- Update the applicable guide(s), the documentation map, and the `README.md` whenever you complete a notable milestone—ideally before running `git push`.
- Treat `docs/meta/pfmp-overview.txt` as the authoritative product vision. Reference it when planning features or roadmap changes to avoid scope drift.
- Keep the document count lean: one active doc per wave/initiative, archive superseded notes promptly, and consolidate overlapping content.

## 2. Daily workflow

1. Open **Windows PowerShell** (not CMD).
2. Navigate to the repo root:
   ```powershell
   cd C:\pfmp
   ```
3. Start both services via the helper script:
   ```powershell
   .\start-dev-servers.bat
   ```
   - API: http://localhost:5052
   - Frontend: http://localhost:3000
   - Package management: use **npm** for all frontend scripts; pnpm and yarn are not supported in this repo.
   - **Note**: The script has built-in timing—the terminal isn't ready until servers finish starting. No `sleep` commands needed before subsequent commands.
4. To restart servers (stop if running, then start fresh):
   ```powershell
   .\restart-dev-servers.bat
   ```
   - Use this after any controller, DTO, or EF model change, or when a clean restart is needed.
   - Also has built-in timing—wait for completion before running further commands.
5. To stop servers only (without restarting):
   ```powershell
   .\stop-dev-servers.bat
   ```

## 3. Manual service control & probes

```powershell
# API (window 1)
cd C:\pfmp\PFMP-API
dotnet run --launch-profile http

# Frontend (window 2)
cd C:\pfmp\pfmp-frontend
npm run dev

# Quick health checks (any window)
cd C:\pfmp
Invoke-WebRequest -Uri "http://localhost:5052/weatherforecast"
Invoke-WebRequest -Uri "http://localhost:5052/api/auth/config"
Invoke-WebRequest -Uri "http://localhost:3000"
```

## 4. Functional testing cadence

- Before any manual QA run, (re)launch services with:
   ```powershell
   cd C:\pfmp; .\restart-dev-servers.bat
   ```
   This stops any running servers and starts fresh. The script has built-in timing—no sleep commands needed.
- Follow the scenarios documented in `docs/testing/` (wave-specific smoke scripts, onboarding flows, alerts/tasks exercises) and record gaps in the relevant guide.
- After finishing functional testing—or before switching contexts—shut everything down with:
   ```powershell
   cd C:\pfmp; .\stop-dev-servers.bat
   ```
   to avoid orphan ports and stale caches.

## 5. Handy command patterns

```powershell
# Build + lint sanity check (npm is the standard package runner—do not substitute pnpm)
cd C:\pfmp; dotnet build PFMP-API/PFMP-API.csproj; npm run lint --prefix pfmp-frontend

# Restart servers (stops if running, then starts—has built-in timing)
cd C:\pfmp; .\restart-dev-servers.bat

# Stop servers only
cd C:\pfmp; .\stop-dev-servers.bat

# Git snapshot
cd C:\pfmp; git status; git log --oneline -5

# Quick PostgreSQL query (remote dev DB)
psql "postgresql://pfmp_user:MediaPword.1@192.168.1.108:5433/pfmp_dev" --% -c "SELECT COUNT(*) FROM \"Users\";"

# Kill stray dev processes (use cautiously—prefer stop-dev-servers.bat)
Stop-Process -Name "dotnet" -Force -ErrorAction SilentlyContinue
Stop-Process -Name "node"  -Force -ErrorAction SilentlyContinue
```

## 6. Troubleshooting cheatsheet

| Issue | What to check |
|-------|---------------|
| `&&` syntax errors | PowerShell chains commands with `;`, not `&&`. |
| Port already in use | `Get-Process | Where-Object { $_.ProcessName -match "(dotnet|node)" }` and terminate as needed. |
| API returns 404 | Confirm the API window is running and still bound to port 5052. |
| Frontend build failures | Run `npm run lint` / `npm run build` inside `pfmp-frontend` for details. |
| CORS/auth problems | Verify frontend origin in `Program.cs` and review `docs/auth/overview.md` plus `appsettings*.json`. |
| Auth login scripts failing | Re-run guidance in `docs/auth/getting-started.md` and `scripts/Azure-Config-Instructions.ps1`. |

Log monitoring: keep the API and frontend PowerShell windows visible, and use the browser console (F12) for frontend errors.

## 7. Key references & access

- **Vision**: `docs/meta/pfmp-overview.txt` (ground truth for product goals).
- **Wave planning**: `docs/waves/REBUILD-WAVE-PLAN.md` (current scope) and supporting wave docs.
- **Roadmap**: `docs/history/roadmap.md` (milestones mapped to the vision).
- **Testing**: `docs/testing/` (manual QA flows, MSW harness notes).
- **Runbooks & scripts**: `docs/ops/runbooks/`, `docs/scripts/dev-scripts.md`.
- **Credentials**:
  - Azure Entra tenant: `90c3ba91-a0c4-4816-9f8f-beeefbfc33d2`
  - Azure client ID: `efe3c2da-c4bb-45ff-b85b-e965de54f910`
  - Remote dev database: `192.168.1.108:5433` (`pfmp_user` / `pfmp_dev`)
  - Test accounts & bypass steps: `docs/auth/getting-started.md`

Stay disciplined: follow these instructions for rapid onboarding, keep the documentation tree coherent, and surface any gaps in `docs/meta/documentation-strategy.md` so the audit trail remains accurate.

## 8. MCP PostgreSQL integration (AI database access)

The PFMP project includes a custom Model Context Protocol (MCP) server that exposes PostgreSQL database operations to AI assistants. This enables natural-language database queries without manual SQL.

**When to use MCP tools**:
- **Database schema inspection**: When asked about table structures, columns, constraints, or foreign key relationships
- **Data exploration**: When asked to query specific records, count rows, or examine database contents
- **User data operations**: When asked to clone user data, analyze user-specific records, or inspect test data
- **Database debugging**: When troubleshooting data issues, checking record counts, or validating migrations

**Available MCP tools** (prefix requests with "Using MCP Postgres"):
1. `list_tables` – List all database tables with row counts and UserId detection
2. `get_table_schema` – Get detailed schema for a specific table (columns, types, constraints, FKs)
3. `execute_query` – Execute SQL queries with parameter binding (read or write mode)
4. `clone_user_data` – Clone all user data from one user to another (handles FKs automatically)
5. `get_foreign_keys` – Get FK relationships for a table or all tables

**Examples**:
- "Using MCP Postgres, list all tables"
- "Using MCP Postgres, show me the schema for the Accounts table"
- "Using MCP Postgres, how many users are in the database?"
- "Using MCP Postgres, clone all data from user 1 to user 15"

**Setup & troubleshooting**: See `docs/dev/mcp-integration.md` for bridge configuration, server management, and debugging steps.

**Direct testing** (without AI assistant):
```powershell
cd C:\pfmp\mcp-bridge
node .\test-client.mjs
```

## 9. Frontend layout and testing guidance

- UI layout: Prefer Material UI components only (no custom CSS width hacks). Use:
   - `Stack` for vertical rhythm and spacing
   - `TableContainer` + `Table` for tabular data
   - MUI Grid v2 (`@mui/material` Grid with the `size` prop) for responsive rows
      - Example: `<Grid container spacing={2}><Grid size={{ xs: 12, md: 6 }}>…</Grid><Grid size={{ xs: 12, md: 6 }}>…</Grid></Grid>`
      - Avoid `minWidth`, `tableLayout: fixed`, or inline width overrides when a component prop can achieve the desired behavior
   - Keep long labels from wrapping via `<Typography noWrap>` where readability demands
   - For inputs inside tables, omit redundant labels in cells and provide accessible names via `aria-label` or `aria-labelledby`

- Vitest execution model: Tests currently run single-threaded on purpose to reduce flakiness in JSDOM and MSW-driven integration tests.
   - Configuration: see `pfmp-frontend/vitest.config.ts` where `pool: 'threads'` with `{ minThreads: 1, maxThreads: 1 }` limits concurrency.
   - Why single-thread? Parallel workers can contend for shared globals (JSDOM, timers, MSW handlers, in-memory caches) and increase nondeterminism across integration tests that spin up app providers and routers.
   - When to try parallel: Pure unit tests that do not touch DOM, network handlers, or global state are good candidates. You can temporarily increase `maxThreads` locally to speed up runs on multi-core machines.
   - Risks of multi-threaded runs:
      - Race conditions across tests that mutate global state (e.g., process.env, global mocks, singleton services)
      - Port binding or request handler conflicts when multiple app instances mount concurrently in JSDOM
      - Flaky ordering if tests assume serialized navigation or time progression
   - Safe patterns if enabling more threads:
      - Keep each test file isolated; avoid cross-file shared singletons or mutable module-level state
      - Use per-test setup/teardown to reset MSW handlers and clear timers/mocks
      - Prefer `userEvent` and async assertions (findBy*) which already await UI stabilization
      - Start with `maxThreads: 2` locally and increase gradually while watching for flake

## 10. Testing requirements

- **Frontend changes**: When adding or modifying React components, create or update corresponding Vitest tests in `pfmp-frontend/src/tests/`.
   - New components: Create a matching `ComponentName.test.tsx` file
   - Modified components: Update existing tests or add coverage for new functionality
   - Test location mirrors source structure: `src/components/` → `src/tests/components/`, `src/views/` → `src/tests/views/`, etc.
   - Patterns: Use `@testing-library/react`, `userEvent`, mock services with `vi.mock()`, wrap with `MemoryRouter` for routing context
   - Run tests: `npm test -- --run path/to/test.tsx` or `npm test` for all

- **Backend changes**: When adding or modifying controllers/services, create or update corresponding xUnit tests in `PFMP-API.Tests/`.
   - Controllers: Create `ControllerNameTests.cs` with `WebApplicationFactory` integration tests
   - Services: Create `Services/ServiceNameTests.cs` with unit tests
   - Use `Fixtures/` for shared test data and factory patterns
   - Run tests: `dotnet test PFMP-API.Tests/PFMP-API.Tests.csproj`

- **Before committing**: Run the full test suite to catch regressions:
   ```powershell
   cd C:\pfmp; dotnet test PFMP-API.Tests; npm test --prefix pfmp-frontend -- --run
   ```

- **Postman updates**: When adding or modifying API endpoints, update the Postman collection and environment files:
   - Collection: `PFMP-API/postman/PFMP-API.postman_collection.json` - Add new requests with examples
   - Environment: `PFMP-API/postman/PFMP-Local.postman_environment.json` - Add any new variables
   - Increment the collection version in the `info` object when making changes
   - Group endpoints by folder (e.g., "Plaid", "Accounts", "Admin")
   - Include request/response examples for documentation

