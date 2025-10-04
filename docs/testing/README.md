# Testing Guides Index

Modular testing references grouped by subject. Each guide provides:
- Purpose & scope
- Key endpoints or UI paths
- Minimal PowerShell examples (primary) + curl equivalents
- Validation checklist

## Available Guides
- [Advice Testing](./advice-testing.md) - Generate, list, accept (auto-creates task), dismiss, provenance fields
- [Task Testing](./tasks-testing.md) - Direct task CRUD, status transitions, linkage from accepted advice
- [Onboarding Testing](./onboarding-testing.md) - Wave 3 persistence (GET/PUT/PATCH/RESET) + dev user switching

## Conventions
- Base API URL: `http://localhost:5052/api`
- PowerShell is canonical; curl shown for portability
- Use test user IDs (1–4) already seeded

## Quick Snippets
Generate advice & accept (auto task creation):
```powershell
Invoke-RestMethod -Method POST http://localhost:5052/api/Advice/generate/1
# list (shows Proposed advice)
Invoke-RestMethod http://localhost:5052/api/Advice/user/1 | Format-Table adviceId,status,linkedTaskId,sourceAlertId
# accept (task auto-created; response includes linkedTaskId afterwards)
Invoke-RestMethod -Method POST http://localhost:5052/api/Advice/123/accept
# verify linkage
Invoke-RestMethod http://localhost:5052/api/Advice/123 | Select-Object adviceId,status,linkedTaskId,acceptedAt
```
