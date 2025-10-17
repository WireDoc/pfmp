# Quick Start

## Prerequisites
- Windows PowerShell (preferred) / pwsh
- Node LTS + npm
- .NET 9 SDK

## Start Both Services (Preferred)
```powershell
cd C:\pfmp
./start-dev-servers.bat
```
Opens two external windows (API on 5052, frontend on 3000).

## Manual Start
```powershell
cd C:\pfmp\PFMP-API; dotnet run --launch-profile http
cd C:\pfmp\pfmp-frontend; npm run dev
```

## Health Checks
```powershell
cd C:\pfmp
Invoke-WebRequest -Uri "http://localhost:5052/health" | Select-Object StatusCode
Invoke-WebRequest -Uri "http://localhost:5052/api/auth/config" | Select-Object Content
Invoke-WebRequest -Uri "http://localhost:3000" | Select-Object StatusCode
```

## Typical Workflow
1. Pull latest: `cd C:\pfmp; git pull`
2. Start services (batch)
3. Edit frontend (hot reload)
4. Hit API endpoints (Invoke-WebRequest)
5. Restart backend only for server changes
6. Build before big refactors: `cd C:\pfmp\pfmp-frontend; npm run build`
7. Commit grouped logical changes

## Dev Auth Mode
- AuthContext provides bypass in dev (`import.meta.env.DEV`).
- Simulated users auto loaded.
- Production: build and use real Azure login.

## Fast Commands Cheat
```powershell
cd C:\pfmp; git status; git log --oneline -5
Get-Process | Where-Object { $_.ProcessName -match "(dotnet|node)" }
```

