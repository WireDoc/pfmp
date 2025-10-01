# Advice Testing (Legacy Flow Deprecated)

This file documents the superseded lifecycle (Proposed → Accept/Reject → ConvertToTask). It has been replaced by the simplified flow:

```
Alert → Generate Advice (Proposed) → Accept (creates Task) OR Dismiss
```

There is no longer a separate conversion step or a reject status in active use. Historical rows may still contain `Rejected` or `ConvertedToTask`; the UI renders unknown/legacy statuses neutrally.

## Replacement Guide
See the new combined guide: `alerts-advice-testing.md` in this same directory for up‑to‑date endpoints, flows, and verification queries.

## Legacy Endpoints Status
| Endpoint | Current Behavior |
|----------|------------------|
| POST /api/Advice/{id}/reject | 410 Gone (use /dismiss) |
| POST /api/Advice/{id}/convert-to-task | 410 Gone (accept auto-creates task) |

## Why Simplified?
Removing intermediate statuses reduces UI complexity, minimizes race conditions in task creation, and clarifies provenance: tasks originate only from Accepted advice.

## Historical Data Handling
- Existing records with `Rejected` or `ConvertedToTask` remain for audit.
- No migrations attempt to rewrite legacy statuses.
- Reporting layers should treat them as terminal/legacy.

## Action Needed
- Update any external scripts still calling reject/convert to use the new flow.
- Remove automation expecting multi-step conversion.

---
Last updated: Lifecycle simplification wave. Further changes should edit `alerts-advice-testing.md`.
