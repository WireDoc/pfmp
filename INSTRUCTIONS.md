# PFMP Development Instructions

### ✅ CORRECT PowerShell syntax:

Starting Services
- Use command: cd W:\pfmp; .\start-dev-servers.bat

- Use semicolon (`;`) to separate commands in PowerShell, NOT `&&`**

## Server Configuration

## Starting PFMP Development

- **API Backend**: http://localhost:5052 (.NET Core)

- **Frontend**: http://localhost:3000 (React + Vite)- Any service startup in terminal tools

3. **Port conflicts**: Ensure ports 5052 and 3000 are available├── docs\                    # Documentation```powershell# In another terminal - Start Frontend  
## PFMP Development Instructions

### Core Principles
- use PowerShell (not CMD)
- chain commands with `;` (PowerShell does not use `&&`)
- run backend and frontend in separate external windows
- keep dependencies at latest stable versions
- group related changes into larger commits during current cleanup phase

### Endpoints / Services
- api backend: http://localhost:5052
- frontend dev: http://localhost:3000 (alt: 5173)
- postgres (dev remote): 192.168.1.108:5433 (alt local: localhost:5432)
- azure ad:
	- client id: efe3c2da-c4bb-45ff-b85b-e965de54f910
	- tenant id: 90c3ba91-a0c4-4816-9f8f-beeefbfc33d2

### Start (Preferred)
```
cd W:\pfmp; ./start-dev-servers.bat
```
Creates two external windows (backend + frontend) preserving service isolation.

### Manual Start (Fallback)
Backend:
```
cd W:\pfmp\PFMP-API; dotnet run --launch-profile http
```
Frontend:
```
cd W:\pfmp\pfmp-frontend; npm run dev
```

### Health Checks
```
cd W:\pfmp; Invoke-WebRequest -Uri "http://localhost:5052/weatherforecast"
cd W:\pfmp; Invoke-WebRequest -Uri "http://localhost:5052/api/auth/config"
cd W:\pfmp; Invoke-WebRequest -Uri "http://localhost:3000"
```

### Auth (Dev Mode)
- dev bypass active in `import.meta.env.DEV`
- simulated users auto-loaded
- production: run full build & real Azure login flow

### Build
```
cd W:\pfmp\pfmp-frontend; npm run build
```
Runs TypeScript project build then Vite bundle.

### When Backend Restart Is Required
- controller / DTO signature changes
- EF model updates
- Program.cs or auth configuration changes

### Port / Process Recovery
```
Get-Process | Where-Object { $_.ProcessName -match "(dotnet|node)" }
Stop-Process -Name "dotnet" -Force -ErrorAction SilentlyContinue
Stop-Process -Name "node" -Force -ErrorAction SilentlyContinue
```

### Typical Workflow
1. `cd W:\pfmp; git pull`
2. start services (batch)
3. edit frontend (hot reload)
4. test API endpoints
5. restart backend only if server-side changes
6. `npm run build` before large refactors
7. commit grouped logical changes

### Dependency Policy
- upgrade React, MUI, TypeScript, Vite, ESLint, msal regularly
- after upgrade: install → build → smoke test

### Planned Hardening (Later)
- re-enable `noUnusedLocals`, then `noUnusedParameters`
- add route/code splitting for large dashboard chunks
- introduce test suite (Jest/Vitest)
- expand ESLint rule coverage (imports/order/accessibility)

### Troubleshooting Quick Reference
- 404 API: backend not running / port conflict
- CORS: verify proxy in `vite.config.ts`
- Auth issues: check redirect URIs + dev mode flag
- Build hang: run `npx tsc -b` to isolate TypeScript
- Stale dashboard: use "Refresh Data" button

### File Map
- backend: `W:\pfmp\PFMP-API`
- frontend: `W:\pfmp\pfmp-frontend`
- docs: `W:\pfmp\docs`
- log: `W:\pfmp\docs\notes\pfmp-log.md`
- migration: `W:\pfmp\MIGRATION_STATUS.md`

### Security Notes
- never commit secrets; dev tokens are mock placeholders

### Bundle Status
- current single JS bundle ~590 kB (gzipped ~182 kB) → acceptable pre-splitting

### Phase Goal
- stable builds + incremental refactors, prep for stricter lint re-enable

---
backup of corrupted original: `INSTRUCTIONS_OLD.md`
last updated: dedup cleanup
- `DATABASE-TOOLS-SETUP.md` - Database configuration

- `notes/` - Development notes and completion logs## Authentication Setup



---### Method 1: Using PowerShell Script (Recommended)2. **Current Directory Script**: Use `.\script.bat` not just `script.bat`



## Quick Start ChecklistThe project uses Microsoft Azure AD for authentication:



1. ✅ Ensure you're in PowerShell (not Command Prompt)```powershell3. **Path Separators**: Use `\` for Windows paths

2. ✅ Navigate to project root: `cd W:\pfmp`

3. ✅ **Services run in SEPARATE external PowerShell windows**: `.\scripts\start-dev-servers.ps1`- **Client ID**: `efe3c2da-c4bb-45ff-b85b-e965de54f910`

4. ✅ Wait for both external windows to show "running"

5. ✅ Test in browser: http://localhost:3000- **Tenant ID**: `90c3ba91-a0c4-4816-9f8f-beeefbfc33d2`cd W:\pfmp4. **Multiple Commands**: 

6. ✅ Use fresh terminals for any additional commands

- **Supported Accounts**: Personal and work Microsoft accounts

**Remember**: Services run in their own windows, commands run in fresh terminals!
.\scripts\start-dev-servers.ps1   ```powershell

### Azure Configuration

Run the Azure configuration script for setup instructions:```   # Correct

```powershell

cd W:\pfmp   cd path; command

.\scripts\Azure-Config-Instructions.ps1

```### Method 2: Manual Startup (Advanced)   



## Development Testing Commands```powershell   # Wrong



**Always use fresh terminal contexts for testing:**# Start API in one external terminal   cd path && command



```powershellcd W:\pfmp\PFMP-API   ```

# Test API health

cd W:\pfmp; Invoke-WebRequest -Uri "http://localhost:5052/weatherforecast"dotnet run --urls=http://localhost:5052



# Test authentication config## Testing Authentication After Startup

cd W:\pfmp; Invoke-WebRequest -Uri "http://localhost:5052/api/auth/config"

# Start Frontend in another external terminal

# Test frontend availability

cd W:\pfmp; Invoke-WebRequest -Uri "http://localhost:3000"cd W:\pfmp\pfmp-frontendOnce servers are running:

```

npm run dev

## Common PowerShell Patterns

## PFMP Development Instructions (Clean Rewrite)

- always use PowerShell on Windows (not CMD)
- use semicolon `;` to chain commands (PowerShell does NOT use `&&`)
- keep backend and frontend running in their OWN external windows (terminal isolation)
- prefer latest stable versions of Node, npm, TypeScript, MUI, React, etc. (policy: keep dependencies current)
- branch strategy: active work continues on current feature branch, merge to `main` once stable

### Core Services
- api backend: http://localhost:5052
- frontend dev server: http://localhost:3000 (or 5173 if Vite default is used elsewhere)
- database (PostgreSQL dev): 192.168.1.108:5433 (remote Synology) or localhost:5432 if running local
- azure ad auth (entra id)
	- client id: efe3c2da-c4bb-45ff-b85b-e965de54f910
	- tenant id: 90c3ba91-a0c4-4816-9f8f-beeefbfc33d2
	- supported accounts: personal + work

### Startup (Preferred: Batch Script)
- navigate to project root: `cd W:\pfmp`
- run combined launcher: `./start-dev-servers.bat`
- batch invokes PowerShell script to start:
	- backend (.NET) → port 5052
	- frontend (Vite) → port 3000
- each opens in a separate external window to avoid accidental interruption

### Manual Startup (If Needed)
- backend:
	- `cd W:\pfmp\PFMP-API`
	- `dotnet run --launch-profile http`
- frontend:
	- `cd W:\pfmp\pfmp-frontend`
	- `npm run dev`

### Health / Quick Tests
- api weather test: `cd W:\pfmp; Invoke-WebRequest -Uri "http://localhost:5052/weatherforecast"`
- auth config: `cd W:\pfmp; Invoke-WebRequest -Uri "http://localhost:5052/api/auth/config"`
- frontend check: `cd W:\pfmp; Invoke-WebRequest -Uri "http://localhost:3000"`
- combined git ops: `cd W:\pfmp; git status; git log --oneline -5`

### Development Auth Mode
- the frontend AuthContext supports a dev/bypass mode when `import.meta.env.DEV` is true
- simulated accounts are auto-loaded; no Microsoft sign-in required during rapid iteration
- switch to real login by building in production mode (disable dev bypass) or adjusting the flag

### TypeScript & Build Strategy
- strict mode enabled except unused locals/parameters (temporarily relaxed for iterative design)
- incremental cleanups will re-enable unused checks before production hardening
- use `npm run build` for production bundle (runs `tsc -b && vite build`)
- large bundle warning (>500 kB) currently acceptable; future step: add code-splitting

### Frontend Layout Standard (MANDATORY)
We use **MUI Grid v2** only. All layout items must use the `size` prop.

Allowed:
```tsx
<Grid container spacing={2}>
	<Grid size={{ xs: 12, md: 4 }}>...</Grid>
	<Grid size={{ xs: 12, md: 8 }}>...</Grid>
</Grid>
```
Forbidden (build will fail):
```tsx
<Grid item xs={12} md={4}>...</Grid>
<Grid2 container>...</Grid2>
```
Rule Enforcement:
- Custom ESLint rule blocks `<Grid item>` and direct breakpoint props (`xs=`, `sm=`, etc.) on `Grid`.
- Violations surface during `npm run lint` and cause `npm run build` to fail.
No exceptions. Refactor any legacy snippet before committing.

### Dependency Policy
- upgrade to latest stable frequently (React, MUI, TypeScript, Vite, ESLint, msal packages)
- after upgrades: run `npm install`, then `npm run build` and fix regressions
- document any pinned version (none required now)

### Process / Ports / Conflicts
- if a port is stuck:
	- list processes: `Get-Process | Where-Object { $_.ProcessName -match "(dotnet|node)" }`
	- terminate (careful): `Stop-Process -Name "dotnet" -Force -ErrorAction SilentlyContinue`
	- terminate (frontend): `Stop-Process -Name "node" -Force -ErrorAction SilentlyContinue`
- restart services only from fresh terminals (never inside running service windows)

### Common PowerShell Patterns
- change dir + run: `cd W:\pfmp; git pull; npm -v`
- multiple ops: `cd W:\pfmp; git status; git log --oneline -5`
- web request sample: `Invoke-WebRequest -Uri "http://localhost:5052/api/endpoint"`

### Typical Workflow
1. update repo: `cd W:\pfmp; git pull`
2. start services: `./start-dev-servers.bat`
3. frontend iteration (hot reload)
4. run targeted API tests (PowerShell Invoke-WebRequest)
5. adjust models/controllers → restart backend window
6. build validation before major refactors: `cd W:\pfmp\pfmp-frontend; npm run build`
7. commit when multiple related fixes complete (grouped commit style)

### Git Commit Workflow (Using `git add .` Safely)
You can use `git add .` in this repo (mono-tree with API + frontend + docs) **if you follow a short safety checklist** to avoid committing secrets, build artifacts, or accidental large files.

#### Fast Path (Solo Dev / Normal Change)
```powershell
cd W:\pfmp
git status -s            # 1. Review what changed
npm run lint --prefix pfmp-frontend ; dotnet build PFMP-API/PFMP-API.csproj  # 2. Sanity build
git add .                # 3. Stage everything (only after review)
git diff --cached --name-only  # 4. Confirm staged list
git commit -m "feat(advice): add generation endpoint"  # 5. Conventional message
git push origin <branch>
```

#### When NOT to blindly rely on `git add .`
| Situation | Risk | Action |
|-----------|------|--------|
| New build / dist output appears | Repo bloat | Ensure covered by `.gitignore`; unstage if added |
| Added secret config (keys, connection strings) | Credential leak | Remove file, add to `.gitignore`, rotate secret if exposed |
| Local DB dump / large CSV | Large history & slow clone | Store externally (cloud bucket) |
| Scratch / debug logs | Noise | Delete or move to temp before commit |

#### Safer Variant (If Unsure)
```powershell
git add -u        # only modified & deleted tracked files
git add path/to/new-file.ts  # explicitly add intentional new files
```

#### Optional Guard Function (PowerShell)
Add to your PowerShell profile to force a human confirmation step:
```powershell
function git-safe-add {
	git status -s
	Read-Host 'Review changes above; press Enter to stage or Ctrl+C to abort' > $null
	git add .
	git diff --cached --name-only
}
```

#### Pre-Commit Mental Checklist
- [ ] No secrets (keys, tokens, connection strings) staged
- [ ] No generated artifacts (bin/ obj/ dist/ .vite/)
- [ ] Lint & build passing (frontend + API)
- [ ] Commit message: conventional & scoped (e.g. `refactor(auth): split context object`)

#### Conventional Commit Hints
`feat:` new user-facing feature
`fix:` bug patch
`refactor:` structural change w/out behavior change
`docs:` documentation only
`chore:` tooling / maintenance
`perf:` performance improvement
`test:` add/modify tests
`ci:` pipeline config changes

#### Summary
`git add .` is **approved** here because the project: (1) has a curated `.gitignore`, (2) uses no local secret files for production keys, (3) maintains small artifact surfaces. Follow the checklist to avoid accidental inclusions.

### When to Restart Backend
- added/changed: controllers, DTOs, Entity Framework models, Program.cs wiring, authentication config
- not needed for: pure frontend changes, static docs edits, CSS/theme tweaks

### Planned Future Hardening (Not Yet Applied)
- re-enable `noUnusedLocals` and `noUnusedParameters`
- add ESLint rule set expansion (import/order, accessibility, unused imports)
- implement route-based code splitting for dashboard modules
- integrate unit tests (Jest + React Testing Library) and service tests

### Troubleshooting Quick Table
- api 404: confirm backend window running and port 5052 free
- cors error: check proxy config in `vite.config.ts`
- auth stuck: ensure dev mode or real Azure redirect configuration matches portal
- build hang: run `npx tsc -b` separately to isolate TypeScript vs bundler issue
- stale data: refresh dashboard menu → "Refresh Data" action

### Azure AD Reference
- post logout redirect: matches value in `msalConfig.auth.postLogoutRedirectUri`
- ensure redirect URIs include: `http://localhost:3000` and `http://localhost:5173` (if used)
- scopes stored in `pfmp-frontend/src/config/authConfig` (adjust there, not inline)

### File Locations (Key)
- backend root: `W:\pfmp\PFMP-API`
- frontend root: `W:\pfmp\pfmp-frontend`
- docs: `W:\pfmp\docs`
- notes log: `W:\pfmp\docs\notes\pfmp-log.md`
- migration status: `W:\pfmp\MIGRATION_STATUS.md`
- instructions (this): `W:\pfmp\INSTRUCTIONS.md`

### Commit Guidance
- group multiple small related fixes (e.g. type-only import sweep + tsconfig tweak)
- reference scope in message: `build(frontend): stabilize ts build and auth imports`
- avoid committing partial auth refactors without build passing

### Security Notes
- never commit real secrets (use environment variables / Azure Key Vault for production)
- mock tokens used only in dev bypass mode

### Performance (Current State)
- single bundle ~590 kB (gzipped ~182 kB) → acceptable short term
- future: manualChunks or dynamic import for rarely visited dashboards

### End Goal of This Phase
- stable builds (no blocking TS errors)
- clean incremental refactors
- ready to re-enable strict unused checks before production

---
last updated: (auto) rewrite session for cleanup and clarity
backup of previous corrupted file: `INSTRUCTIONS_OLD.md`

### Common Issues:

1. **`&&` syntax error**: Replace with `;`│   ├── Azure-Config-Instructions.ps1 # Azure AD setup guide$body = @{

2. **Service interruption**: Never run commands in service terminal windows

3. **Port conflicts**: Ensure ports 5052 and 3000 are available│   └── Setup-AzureAD.ps1    # Azure AD app registration    email = "test@example.com"

4. **CORS errors**: Verify frontend URL matches CORS configuration

5. **Authentication errors**: Check Azure AD app registration settings├── docs\                    # Documentation    password = "password123"



### Process Management:│   ├── notes\               # Development notes and completion logs} | ConvertTo-Json

```powershell

# Check running processes│   ├── API-DOCUMENTATION.md # API endpoint documentation

Get-Process | Where-Object {$_.ProcessName -match "(dotnet|node)"}

│   └── DATABASE-TOOLS-SETUP.md # Database setup guideInvoke-RestMethod -Uri http://localhost:5052/api/auth/login -Method POST -Body $body -ContentType "application/json"

# Kill specific processes if needed (use cautiously)

Stop-Process -Name "dotnet" -Force -ErrorAction SilentlyContinue├── PFMP-API\               # .NET Core backend API```

Stop-Process -Name "node" -Force -ErrorAction SilentlyContinue

```├── pfmp-frontend\          # React + TypeScript frontend



### Log Monitoring:└── INSTRUCTIONS.md         # This file## Troubleshooting

- **API Logs**: Check the external PowerShell window running the API

- **Frontend Logs**: Check the external PowerShell window running the frontend```

- **Browser Console**: F12 Developer Tools for frontend debugging

### Common Issues:

## File Organization

## Server Configuration1. **`&&` syntax error**: Use `;` instead

### Scripts (`/scripts/`):

- `start-dev-servers.ps1` - Main launcher2. **Script not found**: Make sure you're in the correct directory (`W:\pfmp`)

- `Azure-Config-Instructions.ps1` - Azure AD setup guide

- `Setup-AzureAD.ps1` - Azure app registration- **API Backend**: http://localhost:5052 (.NET Core)3. **Permission denied**: Run PowerShell as administrator if needed

- `Check-RedirectUris.ps1` - Verify redirect URI configuration

- **Frontend**: http://localhost:3000 (React + Vite)4. **Port conflicts**: Make sure ports 5052 and 5173 are available

### Documentation (`/docs/`):

- `API-DOCUMENTATION.md` - Backend API reference- **Database**: localhost:5432 (PostgreSQL)

- `DATABASE-TOOLS-SETUP.md` - Database configuration

- `notes/` - Development notes and completion logs### Port Information:



---## Authentication Setup- **API**: http://localhost:5052



## Quick Start Checklist- **Frontend**: http://localhost:5173 (or http://localhost:3000)



1. ✅ Ensure you're in PowerShell (not Command Prompt)The project uses Microsoft Azure AD for authentication:- **Database**: localhost:5432 (PostgreSQL)

2. ✅ Navigate to project root: `cd W:\pfmp`

3. ✅ **Services run in SEPARATE external PowerShell windows**: `.\scripts\start-dev-servers.ps1`

4. ✅ Wait for both external windows to show "running"

5. ✅ Test in browser: http://localhost:3000- **Client ID**: `efe3c2da-c4bb-45ff-b85b-e965de54f910`## Quick Reference Commands

6. ✅ Use fresh terminals for any additional commands

- **Tenant ID**: `90c3ba91-a0c4-4816-9f8f-beeefbfc33d2`

**Remember**: Services run in their own windows, commands run in fresh terminals!
- **Supported Accounts**: Personal and work Microsoft accounts```powershell

# Navigate to project

### Azure Configurationcd W:\pfmp

Run the Azure configuration script for setup instructions:

```powershell# Start both servers

cd W:\pfmp.\start-dev-servers.bat

.\scripts\Azure-Config-Instructions.ps1

```# Check running processes

Get-Process | Where-Object {$_.ProcessName -like "*dotnet*" -or $_.ProcessName -like "*node*"}

## Development Testing Commands

# Kill processes if needed

**Always use fresh terminal contexts for testing:**Stop-Process -Name "dotnet" -Force

Stop-Process -Name "node" -Force

```powershell```
# Test API health
cd W:\pfmp; Invoke-WebRequest -Uri "http://localhost:5052/weatherforecast"

# Test authentication config
cd W:\pfmp; Invoke-WebRequest -Uri "http://localhost:5052/api/auth/config"

# Test frontend availability
cd W:\pfmp; Invoke-WebRequest -Uri "http://localhost:3000"
```

## Common PowerShell Patterns

```powershell
# Command chaining (correct)
cd path; command1; command2

# Multiple operations
cd W:\pfmp; git status; git log --oneline -5

# Web requests
Invoke-WebRequest -Uri "http://localhost:5052/api/endpoint"
Invoke-RestMethod -Uri "http://localhost:5052/api/endpoint" -Method GET
```

## Troubleshooting

### Common Issues:
1. **`&&` syntax error**: Replace with `;`
2. **Service interruption**: Never run commands in service terminal windows
3. **Port conflicts**: Ensure ports 5052 and 3000 are available
4. **CORS errors**: Verify frontend URL matches CORS configuration
5. **Authentication errors**: Check Azure AD app registration settings

### Process Management:
- powershell
# Check running processes
Get-Process | Where-Object {$_.ProcessName -match "(dotnet|node)"}

# Kill specific processes if needed (use cautiously)
Stop-Process -Name "dotnet" -Force -ErrorAction SilentlyContinue
Stop-Process -Name "node" -Force -ErrorAction SilentlyContinue
```

### Log Monitoring:
- **API Logs**: Check the external PowerShell window running the API
- **Frontend Logs**: Check the external PowerShell window running the frontend
- **Browser Console**: F12 Developer Tools for frontend debugging

## File Organization

### Scripts (`/scripts/`):
- `start-dev-servers.ps1` - Main launcher
- `Azure-Config-Instructions.ps1` - Azure AD setup guide
- `Setup-AzureAD.ps1` - Azure app registration
- `Check-RedirectUris.ps1` - Verify redirect URI configuration

### Documentation (`/docs/`):
- `API-DOCUMENTATION.md` - Backend API reference
- `DATABASE-TOOLS-SETUP.md` - Database configuration
- `notes/` - Development notes and completion logs
