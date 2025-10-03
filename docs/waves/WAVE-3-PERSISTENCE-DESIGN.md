# Wave 3 Design – Onboarding Persistence & State Hydration

Status: Draft
Date: 2025-10-03

## Goal
Persist onboarding progress (completed step IDs + partial step data) so users can resume across sessions/devices and enable progressive validation feedback.

## Data Model (Client Perspective)
```ts
interface OnboardingProgressDTO {
  userId: string;
  completedStepIds: string[];         // subset of known step IDs
  currentStepId: string;              // must be one of step definitions
  stepPayloads?: Record<string, any>; // optional raw storage per step (schema-evolvable)
  updatedUtc: string;                 // ISO timestamp
}
```

## API Endpoints (Proposed)
| Method | Path | Body / Params | Description |
|--------|------|---------------|-------------|
| GET | /api/onboarding/progress | (auth user) | Fetch latest progress |
| PUT | /api/onboarding/progress | OnboardingProgressDTO (minus userId) | Upsert full progress snapshot |
| PATCH | /api/onboarding/progress/step/{stepId} | { data, completed?: bool } | Partial update for a single step |

Incremental PATCH allows lower latency UI flows; full PUT used on major transitions or reconciliation.

## Backend Considerations
- Table: onboarding_progress
  - user_id (PK/FK users)
  - current_step_id
  - completed_step_ids (jsonb array)
  - step_payloads (jsonb)
  - updated_utc (timestamp with tz)
- Versioning: schema version field optional for future migrations.
- Concurrency: optimistic with updated_utc; reject if stale older than stored.
- Security: row-level filter by authenticated user id.

## Client Flow
1. Auth loads -> request GET progress (if 404 treat as fresh start).
2. Hydrate OnboardingContext from DTO (map any unknown steps defensively ignored).
3. On step advance or completion toggle -> debounce PATCH (e.g., 400ms) for changed step.
4. On Finish -> PUT snapshot to ensure consistency.

## Validation Layer Integration (Future)
- Each step validator returns normalized payload.
- Persist only normalized shape to step_payloads.
- On hydrate, validators can transform legacy shapes forward.

## Edge Cases
- Deleted step definition: ignore entries and drop during next PUT.
- Added new step in middle: server does not auto-insert; client shows incomplete.
- Race while user has two tabs: last writer wins unless timestamp delta threshold; optionally expose conflict event.

## Feature Flags
- `onboarding_enabled` governs UI exposure (when ready to flip from false).
- Potential new flag: `onboarding_persistence_enabled` (default false until backend implemented) to guard network calls.

## Telemetry (Optional Later)
- Log step completion durations.
- Track validation failure frequency per field.

## Open Questions
- Do we need partial encryption for sensitive fields? (Likely not early.)
- Should we record wizard abandonment reason? (Needs UX event taxonomy.)

## Acceptance (Wave 3)
- Progress persists across refresh.
- Validation pipeline stores normalized data.
- Flag gating network activity available.
- Tests: reducer hydration, PATCH/PUT integration mock.
