# Alerts & Advice Testing Guide (Simplified Lifecycle)

Focus: Alert → (Generate Advice) → Proposed Advice → Accept (creates Task) OR Dismiss (terminal). No reject, no convert step.

## Current Lifecycle
```
Alert (actionable) --[POST /api/Alerts/{id}/generate-advice]--> Advice(Status=Proposed)
Advice (Proposed) --[POST /api/Advice/{id}/accept]--> Advice(Status=Accepted, linkedTaskId set)
Advice (Proposed) --[POST /api/Advice/{id}/dismiss]--> Advice(Status=Dismissed)
```

Accepted advice remains Accepted even after the linked task progresses or completes. Dismissed advice is terminal (unless an explicit undismiss endpoint is later added).

## Endpoints Summary
| Action | Method | Endpoint |
|--------|--------|----------|
| Generate advice from user (legacy/global) | POST | /api/Advice/generate/{userId} |
| Generate advice from alert | POST | /api/Alerts/{alertId}/generate-advice |
| List advice for user | GET | /api/Advice/user/{userId}?status=Proposed | (status optional) |
| Accept advice | POST | /api/Advice/{adviceId}/accept |
| Dismiss advice | POST | /api/Advice/{adviceId}/dismiss |
| (Legacy) reject (gone) | POST | /api/Advice/{adviceId}/reject → 410 |
| (Legacy) convert-to-task (gone) | POST | /api/Advice/{adviceId}/convert-to-task → 410 |

## Key Data Fields
| Field | Description |
|-------|-------------|
| status | Proposed | Accepted | Dismissed |
| linkedTaskId | Present after acceptance (task created) |
| sourceAlertId | Alert that generated the advice (nullable) |
| acceptedAt / dismissedAt | Timestamps for transition events |
| previousStatus | Last non-terminal status before update |
| generationMethod | Optional tag (e.g., "AlertRule", "Manual") |

## PowerShell Quick Start
Assumes API running at http://localhost:5052 and user 1 has at least one actionable alert (ID 10 used below—replace with real ID).

```powershell
# 1. Generate advice from alert 10
Invoke-RestMethod -Method POST http://localhost:5052/api/Alerts/10/generate-advice | Select-Object adviceId,status,sourceAlertId

# 2. List proposed advice only
Invoke-RestMethod http://localhost:5052/api/Advice/user/1?status=Proposed | Format-Table adviceId,status,sourceAlertId,linkedTaskId

# 3. Accept one (replace 301 with real adviceId)
Invoke-RestMethod -Method POST http://localhost:5052/api/Advice/301/accept | Select-Object adviceId,status,linkedTaskId

# 4. Dismiss another proposed advice
Invoke-RestMethod -Method POST http://localhost:5052/api/Advice/302/dismiss | Select-Object adviceId,status

# 5. List all advice (no filter) and show lifecycle snapshot
Invoke-RestMethod http://localhost:5052/api/Advice/user/1 | Format-Table adviceId,status,linkedTaskId,sourceAlertId
```

## curl Equivalents
```bash
# Generate from alert
curl -X POST http://localhost:5052/api/Alerts/10/generate-advice
# List proposed
curl http://localhost:5052/api/Advice/user/1?status=Proposed
# Accept
curl -X POST http://localhost:5052/api/Advice/301/accept
# Dismiss
curl -X POST http://localhost:5052/api/Advice/302/dismiss
# All advice
curl http://localhost:5052/api/Advice/user/1
```

## Filtering & Dismissed Handling
- Frontend hides dismissed advice by default unless "Show dismissed" toggle is enabled.
- API may later support `includeDismissed=true`; current UI performs client-side filter.
- Multiple statuses can be requested by repeating the query string parameter: `?status=Proposed&status=Accepted` (if implemented server-side).

## Validation Checklist
| Scenario | Expectation |
|----------|-------------|
| Generate advice from alert | Returns Proposed with sourceAlertId set |
| Accept Proposed advice | Status becomes Accepted; linkedTaskId populated |
| Accept same advice again | Idempotent (200 with no duplicate task) |
| Dismiss Proposed advice | Status becomes Dismissed; no task created |
| Dismiss Accepted advice | 409 Conflict (not allowed) |
| Call legacy reject / convert | 410 Gone with guidance message |

## Error Scenarios
| Action | Invalid Case | Expected |
|--------|--------------|----------|
| Accept | adviceId not found | 404 |
| Accept | already Dismissed | 409 |
| Dismiss | already Accepted | 409 |
| Generate-from-alert | alert not found or not actionable | 404 / 409 depending on rules |

## psql Verification Snippets
Using the documented `--%` invocation pattern.
```sql
-- Count advice by status
SELECT status, COUNT(*) FROM "Advice" GROUP BY status ORDER BY 1;

-- Recently accepted advice with task linkage
SELECT a."AdviceId", a."Status", a."LinkedTaskId", a."SourceAlertId", a."AcceptedAt"
FROM "Advice" a
WHERE a."AcceptedAt" IS NOT NULL
ORDER BY a."AcceptedAt" DESC
LIMIT 10;

-- Dismissed advice audit
SELECT "AdviceId", "Status", "DismissedAt", "PreviousStatus" FROM "Advice" WHERE "Status"='Dismissed' ORDER BY "DismissedAt" DESC LIMIT 10;
```

## Troubleshooting
| Issue | Likely Cause | Resolution |
|-------|--------------|-----------|
| linkedTaskId null after accept | Background task creation failed | Check API logs; retry accept (idempotent) |
| 410 on reject/convert | Expected (deprecated) | Remove old client calls |
| Dismissed still visible in UI | Show dismissed toggle enabled | Disable toggle |
| Missing sourceAlertId | Advice generated via legacy user-level generate endpoint | Use alert-based generation |

## Migration Notes
Legacy statuses (Rejected, ConvertedToTask) are retained only historically if present in old rows; new flows never produce them. UI treats unknown values with a neutral badge.

## Next Enhancements (Future Consideration)
- Undismiss endpoint to restore Proposed.
- Bulk accept/dismiss operations.
- Server-side multi-status filtering and includeDismissed flag.

---
Created: Wave 1 lifecycle simplification. Keep this file updated when lifecycle transitions evolve.
