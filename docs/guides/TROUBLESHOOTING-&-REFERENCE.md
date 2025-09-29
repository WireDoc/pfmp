# Troubleshooting & Reference

## Common Issues
| Symptom | Cause | Fix |
|---------|-------|-----|
| API 404 | Backend not running | Start backend window |
| CORS error | Proxy / origin mismatch | Check Vite config + backend CORS | 
| Auth stuck | Dev bypass vs prod mismatch | Confirm build mode | 
| Build hang | TypeScript vs bundler confusion | Run `npx tsc -b` separately |
| Port in use | Stray dotnet/node process | Kill processes below |

## Process / Port Recovery
```powershell
Get-Process | Where-Object { $_.ProcessName -match "(dotnet|node)" }
Stop-Process -Name "dotnet" -Force -ErrorAction SilentlyContinue
Stop-Process -Name "node" -Force -ErrorAction SilentlyContinue
```

## Logs
- API: external PowerShell backend window
- Frontend: dev server window / browser console

## Advice Status Glossary
| Status | Meaning |
|--------|---------|
| Proposed | Newly generated, awaiting user decision |
| Accepted | User accepted (immutable except task conversion in future) |
| Rejected | User declined (cannot be accepted later) |

## Quick Commands
```powershell
cd W:\pfmp; git status; git log --oneline -5
Invoke-WebRequest -Uri "http://localhost:5052/weatherforecast"
Invoke-WebRequest -Uri "http://localhost:5052/api/Advice/user/1"
```

## Security Reminders
- No secrets in commits
- Treat connection strings with care

## Performance Snapshot
- Current main bundle ~590 kB (gz ~182 kB) – pre code-splitting target

## Future Enhancements (Pointers)
- Dual-AI consensus: see `docs/waves/REBUILD-WAVE-PLAN.md`
- Additional dashboards reinstatement timeline also in waves plan
