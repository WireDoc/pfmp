````markdown
# Onboarding Persistence Testing

Purpose: Validate Wave 3 onboarding progress persistence (GET/PUT/PATCH/RESET) and dev user switching.

## Prerequisites
- Backend running in Development (Swagger at `http://localhost:5052/swagger`).
- Feature flags enabled by default (`onboarding_enabled`, `onboarding_persistence_enabled`).
- Dev users seeded (baseline + fresh/mid/done scenarios).

## Key Endpoints
| Method | Path | Notes |
|--------|------|-------|
| GET | /api/onboarding/progress | 404 = no snapshot |
| PUT | /api/onboarding/progress | Full snapshot upsert |
| PATCH | /api/onboarding/progress/step/{stepId} | Partial update (data/completed) |
| POST | /api/onboarding/progress/reset | Deletes snapshot |
| GET | /api/dev/users | List seeded test users |
| POST | /api/dev/users/default/{userId} | Set default dev user |

## Minimal PowerShell Sequence
```powershell
# List dev users & identify default
Invoke-RestMethod http://localhost:5052/api/dev/users | Format-List

# Fresh read (expect 404)
$r = Invoke-WebRequest http://localhost:5052/api/onboarding/progress -ErrorAction SilentlyContinue
$r.StatusCode  # should be 404 first time

# Patch first step
Invoke-RestMethod -Method PATCH http://localhost:5052/api/onboarding/progress/step/welcome \
  -Body '{"data":{"acknowledged":true},"completed":true}' -ContentType 'application/json'

# Verify snapshot
Invoke-RestMethod http://localhost:5052/api/onboarding/progress | Format-List currentStepId,completedStepIds,updatedUtc

# Reset progress
Invoke-RestMethod -Method POST http://localhost:5052/api/onboarding/progress/reset

# Switch default dev user (example userId=3)
Invoke-RestMethod -Method POST http://localhost:5052/api/dev/users/default/3

# Read under new default
Invoke-WebRequest http://localhost:5052/api/onboarding/progress
```

## Validation Checklist
- [ ] 404 on initial GET (fresh user)
- [ ] PATCH creates snapshot (subsequent GET 200)
- [ ] completedStepIds contains patched step when completed=true
- [ ] UpdatedUtc advances after another PATCH
- [ ] RESET returns 204 and subsequent GET returns 404
- [ ] Switching dev default changes subsequent onboarding context

## JSON Shape (Response)
```json
{
  "userId": 5,
  "currentStepId": "welcome",
  "completedStepIds": ["welcome"],
  "stepPayloads": {"welcome": {"acknowledged": true}},
  "updatedUtc": "2025-10-04T12:34:56.789Z"
}
```

## Notes
- Use `?userId=` or `?email=` query for explicit targeting when debugging.
- DevUserSwitcher UI in the frontend sets backend default + adds `userId` param automatically for onboarding persistence requests.
````
