# Task Testing Guide

Focus: Verifying tasks created directly and tasks automatically created when advice is accepted.

## Core Endpoints (Existing)
| Action | Method | Endpoint (example) |
|--------|--------|--------------------|
| List tasks by user | GET | /api/tasks?userId=1 |
| Get task by id | GET | /api/tasks/{taskId} |
| Create task | POST | /api/tasks |
| Update task | PUT | /api/tasks/{taskId} |
| Update status | PATCH | /api/tasks/{taskId}/status |
| Complete task | PATCH | /api/tasks/{taskId}/complete |
| Dismiss task | PATCH | /api/tasks/{taskId}/dismiss |
| Delete task | DELETE | /api/tasks/{taskId} |

(Exact routes may vary slightly if controller naming differs—adjust if needed.)

## Creating a Task (Direct)
```powershell
$task = @{
  userId = 1
  type = 1              # Rebalancing
  title = "Manual Test Task"
  description = "Created during manual validation"
  priority = 2          # Medium
}
Invoke-RestMethod -Method POST -Uri http://localhost:5052/api/tasks -Body ($task | ConvertTo-Json) -ContentType 'application/json'
```

## Listing & Filtering
```powershell
Invoke-RestMethod "http://localhost:5052/api/tasks?userId=1" | Format-Table taskId,type,status,priority,title
```

## Status Change (Example)
```powershell
Invoke-RestMethod -Method PATCH -Uri http://localhost:5052/api/tasks/200/status -Body 3 -ContentType 'application/json'  # to InProgress
```

## Completing a Task
```powershell
$complete = @{ completionNotes = "Validated core flow" }
Invoke-RestMethod -Method PATCH -Uri http://localhost:5052/api/tasks/200/complete -Body ($complete | ConvertTo-Json) -ContentType 'application/json'
```

## Linked Tasks From Accepted Advice
When advice is accepted, a task is automatically created (idempotent: if already accepted, re-accept returns existing linkage).

```powershell
# Generate advice from user context
$adv = Invoke-RestMethod -Method POST http://localhost:5052/api/Advice/generate/1
$adv | Select-Object adviceId,status,generationMethod,sourceAlertId

# Accept advice (auto creates task)
$accepted = Invoke-RestMethod -Method POST http://localhost:5052/api/Advice/$($adv.adviceId)/accept
$accepted | Select-Object adviceId,status,linkedTaskId,acceptedAt,sourceAlertId,previousStatus

# Retrieve linked task
Invoke-RestMethod http://localhost:5052/api/tasks/$($accepted.linkedTaskId) | Select-Object taskId,title,status,priority,sourceAdviceId,sourceType
```

## Validation Checklist
- Task created via acceptance has meaningful actionable title (may include original advice title).
- `linkedTaskId` in advice matches a task whose `sourceAdviceId` equals the advice id.
- Advice status transitions: Proposed → Accepted or Dismissed (terminal).
- Task status transitions: Pending → Accepted → InProgress → Completed or Dismissed.
- Re-accepting already accepted advice returns same linkage (idempotent).
- Deleting a task does NOT modify historical advice linkage.

## Troubleshooting
| Issue | Likely Cause | Fix |
|-------|--------------|-----|
| 404 on tasks endpoints | Route divergence | Inspect controller route attribute |
| 400 on create | Missing required field | Ensure type/title/description present |
| Status PATCH ignored | Wrong numeric enum sent | Confirm integer value of enum |
| No task after acceptance | Acceptance logic failed | Check API logs; ensure advice still Proposed before acceptance |
| Duplicate tasks on acceptance | Non-idempotent bug | Verify Accept endpoint ensures single task & reuse on repeat |

## Useful PowerShell Helpers
```powershell
# Generate multiple pieces of advice then accept all Proposed ones
$all = 1..3 | ForEach-Object { Invoke-RestMethod -Method POST http://localhost:5052/api/Advice/generate/1 }
$proposed = Invoke-RestMethod http://localhost:5052/api/Advice/user/1 | Where-Object { $_.status -eq 'Proposed' }
$proposed | ForEach-Object { Invoke-RestMethod -Method POST http://localhost:5052/api/Advice/$($_.adviceId)/accept } | Select-Object adviceId,linkedTaskId,status
```
