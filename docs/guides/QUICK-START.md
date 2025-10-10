# Quick Start

## Prerequisites
- Windows PowerShell (preferred) / pwsh
- Node LTS + npm
- .NET 9 SDK

## Start Both Services (Preferred)
```powershell
cd P:; .\start-dev-servers.bat
```
Opens two external windows (API on 5052, frontend on 3000).

## Manual Start
```powershell
cd P:\PFMP-API; dotnet run --launch-profile http
cd P:\pfmp-frontend; npm run dev
```

## Health Checks
```powershell
cd P:; Invoke-WebRequest -Uri "http://localhost:5052/weatherforecast"
cd P:; Invoke-WebRequest -Uri "http://localhost:5052/api/auth/config"
cd P:; Invoke-WebRequest -Uri "http://localhost:3000"
```

## Typical Workflow
1. Pull latest: `cd P:; git pull`
2. Start services (batch)
3. Edit frontend (hot reload)
4. Hit API endpoints (Invoke-WebRequest)
5. Restart backend only for server changes
6. Build before big refactors: `cd P:\pfmp-frontend; npm run build`
7. Commit grouped logical changes

## Dev Auth Mode
- AuthContext provides bypass in dev (`import.meta.env.DEV`).
- Simulated users auto loaded.
- Production: build and use real Azure login.

## Fast Commands Cheat
```powershell
cd P:; git status; git log --oneline -5
Get-Process | Where-Object { $_.ProcessName -match "(dotnet|node)" }
```

