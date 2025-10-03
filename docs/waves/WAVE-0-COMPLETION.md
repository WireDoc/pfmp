# Wave 0 Completion – Documentation Alignment

**Date:** 2025-10-02
**Version Advanced To:** v0.7.0-alpha
**Scope:** Establish authoritative baseline describing current vs missing frontend orchestration, lifecycle refactors, provenance, backup discipline, OpenAPI client scaffold, and experimental Docker status.

## Achievements
- README banner + rebuild table finalized
- Rebuild wave plan documented (`REBUILD-WAVE-PLAN.md`)
- Migration & lifecycle changes (Advice simplified; legacy endpoints 410) reflected across docs
- Backup policy + script integrated and referenced (BUILD.md, DATABASE-BACKUP.md)
- OpenAPI → TypeScript generation scaffold (script + placeholder + first generation)
- Experimental Docker annotation with rationale (mapped drive layer commit instability)
- Coverage + health + endpoint reflection in place
- Provenance correctness fields validated (acceptedAt, dismissedAt, previousStatus, sourceAlertId, generationMethod, sourceAlertSnapshot, linkedTaskId)

## Exit Criteria Verification
| Criterion | Status | Evidence |
|-----------|--------|----------|
| README updated with rebuild context | ✅ | `README.md` banner + waves table |
| Wave plan doc exists | ✅ | `docs/waves/REBUILD-WAVE-PLAN.md` |
| Log entry referencing pivot | ✅ | Added entry in `pfmp-log.md` (see 2025-10-02 section) |
| Migration note annotated | ✅ | `docs/waves/MIGRATION_STATUS.md` (legacy endpoints set 410) |
| OpenAPI client scaffolded & generated | ✅ | `pfmp-frontend/src/api/generated/openapi-types.ts` committed |

## Metrics Baseline (Pre-Wave 1)
- Frontend bundle (pre-routing rebuild): minimal shell (routing absent)
- Generated types size: ~4.5k LOC (initial)
- Docker viability: deferred (host run only) – risk logged
- No feature flag system yet (will be Wave 1+)

## Risks Carried Forward
| Risk | Mitigation Next Wave |
|------|----------------------|
| Missing routing/layout blocks downstream onboarding & dashboards | Prioritize Wave 1 routing skeleton immediately |
| Manual API calls risk drift without typed adapter | Introduce typed http client early (pre-Wave 1 or during) |
| Feature flag absence could entangle experimental AI features | Implement lightweight flag provider in Wave 1 |
| Lack of visual regression harness may hide UI drift | Draft plan doc now; implement harness post Wave 2 |

## Decisions Logged
- Defer Docker hardening until after core UI orchestration returns
- Adopt semantic prerelease version bump per wave (v0.7.0-alpha for Wave 0 closure)
- Use OpenAPI codegen prior to large UI reconstruction to avoid type churn later
- Keep dual-AI implementation mocked until Wave 5

## Next Wave (Wave 1) Entry Conditions
- Backend stable; no blocking migrations planned
- API spec available for typed navigation/guards
- Clear scope boundaries defined (no onboarding logic yet)

## Immediate Actions (Wave 1 Kickoff)
1. Add routing skeleton + layout
2. ProtectedRoute & dummy auth state (bypass aware)
3. Suspense & error boundaries
4. Feature flag scaffold
5. Typed API client adapter (inference helpers)

---
Wave 0 formally CLOSED. Proceeding to Wave 1.
