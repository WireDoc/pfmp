# Contributing Guide

This document merges legacy operational practices with the new wave-based rebuild workflow.

## 1. Wave Workflow
1. Kickoff Doc: Create/update `docs/waves/WAVE-X-*.md` with scope + acceptance.
2. Deliver in vertical slices (routing shell, context, endpoint) rather than monolith changes.
3. Gate incomplete UI/logic with feature flags (`pfmp-frontend/src/flags/featureFlags.ts`).
4. Close a wave only after code, tests, docs, and flag table updated (remove stale duplicates).
5. Seed the next wave (design doc or placeholder flag) before declaring completion.

## 2. Commit Conventions
Follow Conventional Commits (scopes flexible):
- `feat(onboarding): add persistence hydration`
- `fix(auth): correct msal authority override`
- `docs(waves): add Wave 3 design`
- `chore(repo): add pre-commit hook`
- `refactor(flags): stabilize snapshot logic`

Shorthand prefixes still valid: feat, fix, docs, chore, refactor, test, perf.

## 3. Mandatory Pre-Migration Backup (Backend)
Before schema/seed modifications:
```powershell
pwsh scripts/db/backup-postgres.ps1
```
Reference backup artifact in PR/commit (e.g., `Backup: pfmp_20251002_142000_manual.dump`).

## 4. Pre-Commit Hook
Enable once:
```bash
git config core.hooksPath .githooks
```
The hook runs:
1. Backend build (`dotnet build PFMP-API/PFMP-API.csproj`)
2. Frontend lint (`npm run lint` inside `pfmp-frontend`)
3. Type check (`npx tsc -p tsconfig.app.json --noEmit`)
4. Conditional vitest run if staged TS/TSX files change

Failing any step blocks the commit.

## 5. Feature Flags
Add new flags sparingly; default to `false` unless required bootstrap. Document in the frontend README table. Retire flags after hard enablement.
Key current flags:
- `onboarding_enabled`
- `onboarding_persistence_enabled`
- `use_simulated_auth`
- `exp_intelligence_dashboards`
- `exp_dual_ai_pipeline`

## 6. Testing Expectations
| Change Type | Minimum Tests |
|-------------|---------------|
| Reducer / Context | State transitions + edge (reset/hydrate) |
| Persistence / Fetch | Success + 404/new start path |
| Routing / Protection | Redirect & not-found paths |
| Feature Flag Behavior | Toggle-driven branching |
| Validation Layer (future) | Valid + invalid sample payload |

Keep tests light; avoid over-mocking internals.

## 7. Coverage & Build Discipline
- Ensure `npm test` (frontend) and `dotnet build` (backend) succeed locally.
- No large coverage target enforced yet; avoid removing meaningful tests.
- Wave closure should not regress previously validated acceptance criteria.

## 8. Documentation Requirements
Update where scope touches:
- Architecture / waves: `docs/waves/`
- User-facing rebuild plan: root `README.md`
- Frontend architecture / flags: `pfmp-frontend/README.md`
- Changelog entry: `CHANGELOG.md` (Unreleased → version on release)
- Lifecycle / domain logic: relevant doc in `docs/`

## 9. Existing Legacy Sections (Retained)
From prior guidelines:
- Provenance & lifecycle: maintain audit fields when adding transitions.
- Security: never commit secrets; redact sensitive strings.
- Scripts: place reusable automation in `scripts/` with clear naming.

## 10. Opening a PR (Future Externalization)
Checklist:
- [ ] Backup done (if schema/seed touched)
- [ ] Pre-commit hook passes
- [ ] Tests added/updated
- [ ] Docs (wave / changelog / readme) updated
- [ ] No stray build artifacts (`dist/`, coverage reports)

## 11. Versioning
Alpha cycle: manual bump in `VERSION` + `CHANGELOG.md`. Tag releases (`git tag vX.Y.Z-alpha && git push --tags`).

## 12. Performance & A11y (Future Wave 6)
Will introduce:
- Bundle size diff check pre-commit/CI
- Accessibility audit script
- Visual regression harness (storybook + screenshot diff)

## 13. Open Questions
Track unresolved architectural or product questions under **Open Questions** in the active wave design doc.

---
Thanks for contributing and keeping the wave cadence disciplined.
