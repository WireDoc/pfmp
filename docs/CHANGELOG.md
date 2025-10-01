# Changelog

All notable changes tracked here (reverse chronological).

## 2025-10-01
### Added
- Simplified Advice lifecycle (Proposed → Accepted | Dismissed) replacing Reject / Convert model.
- Automatic task creation on acceptance with provenance fields (SourceAdviceId, SourceType, SourceAlertId, GenerationMethod, AcceptedAt, DismissedAt, PreviousStatus, SourceAlertSnapshot).
- Health endpoint `/health`.
- Swagger/OpenAPI (Swashbuckle) with UI at `/swagger` and toggle via `Swagger:Always=true`.
- Custom endpoint inventory `GET /api/docs/endpoints`.
- Solution file `PFMP.sln` including API + Tests.
- Coverage collection (Cobertura) via `dotnet test --collect:"XPlat Code Coverage"`.
- Frontend smoke script `npm run smoke` (portfolio advice generate/accept + task linkage check).
- Build documentation `BUILD.md`.
- Batch & PowerShell build scripts: `build-all.bat`, `scripts/ci-build.ps1` (flags: -SkipFrontend, -SkipBackend).
- Updated tests (dismiss flow, provenance assertion, health test, integration of WebApplicationFactory).

### Changed
- Removed legacy reject/convert endpoints (now 410 Gone responses) and updated docs to reference new lifecycle.
- Advice acceptance logic now idempotent with provenance backfill for existing linked tasks.
- README testing section replaced with simplified lifecycle overview.
- `pfmp.txt` augmented with Oct 2025 lifecycle & tooling summary.

### Fixed
- Missing provenance fields on tasks created prior to acceptance fix addressed via acceptance backfill logic.
- Build script path resolution (`ci-build.ps1`) and hidden character corruption.

### Documentation
- Added `alerts-advice-testing.md` as authoritative advice lifecycle guide.
- Marked `advice-testing.md` legacy.
- Added solution, swagger, coverage, smoke sections to `BUILD.md` and README.

---
## Earlier (Pre-2025-10)
Refer to prior session logs and planning documents for pre-refactor architecture and wave planning.
