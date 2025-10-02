# Contributing Guidelines

## Commit Conventions
Use Conventional Commits:
- feat: new user-facing feature
- fix: bug fix
- docs: documentation only
- chore: tooling / maintenance
- refactor: non-feature structural changes
- test: add or adjust tests
- perf: performance improvements

Examples:
```
feat(advice): add dismissal endpoint
docs(backup): add pre-migration backup requirement
chore(docker): reorganize compose for external DB
```

## Mandatory Pre-Migration Backup
Before any PR that changes database schema or seed logic:
1. Run manual backup:
```
pwsh scripts/db/backup-postgres.ps1
```
2. Verify backup file created in `db-backups/`.
3. Reference backup run in PR description (e.g., `Backup: pfmp_20251002_142000_manual.dump`).

## Coverage & Testing
- Run `build-all.bat` (or `scripts/ci-build.ps1`) locally before opening a PR.
- Aim not to reduce overall line coverage for core service classes.
- Generate optional HTML report:
```
reportgenerator -reports:PFMP-API.Tests/TestResults/**/coverage.cobertura.xml -targetdir:coverage-report
```
(Remove or ignore `coverage-report/` when done.)

## Docker Usage (API Only)
```
docker compose -f docker/docker-compose.yml up --build -d
```
Ensure `.env` contains a valid external connection string.

## Provenance & Lifecycle Discipline
- New Advice lifecycle transitions must update provenance fields (previousStatus, acceptedAt/dismissedAt).
- Tasks created from acceptance must always populate `sourceAdviceId` & `sourceType`.

## Documentation Requirements
Every feature touching lifecycle, schema, or endpoints must update where relevant:
- `README.md`
- `BUILD.md`
- `docs/API-DOCUMENTATION.md`
- `docs/DATABASE-BACKUP.md` (if backup implications)

## Scripts
Add new scripts under `scripts/` with clear naming; prefer PowerShell for cross-team consistency on Windows-heavy environments.

## Security & Secrets
- Never commit real secrets. Redact passwords in docs (replace with `REDACTED`).
- Connection strings in examples should not contain production credentials.

## Opening a PR
Checklist:
- [ ] Backup performed (if schema/seed impacted)
- [ ] Tests pass locally
- [ ] Coverage not regressed materially
- [ ] Docs updated
- [ ] No stray `TestResults/` or coverage artifacts

Thanks for contributing!
