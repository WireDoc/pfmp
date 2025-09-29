# Development Standards

## Dependency Policy
- Keep React, MUI, TypeScript, Vite, ESLint, msal current (latest stable)
- After upgrade: install → build → smoke test

## MUI Grid v2 Rule (MANDATORY)
Use `size={{ xs: 12, md: 6 }}` instead of legacy `item xs={12}`. Custom ESLint rule blocks old syntax.

```tsx
<Grid container spacing={2}>
  <Grid size={{ xs: 12, md: 4 }}>...</Grid>
  <Grid size={{ xs: 12, md: 8 }}>...</Grid>
</Grid>
```

## Commit Style (Conventional)
`feat:`, `fix:`, `refactor:`, `docs:`, `chore:`, `test:`, `perf:`
Scope example: `feat(advice): accept/reject endpoints`

## Git Add Safety
```powershell
git status -s
git add .
git diff --cached --name-only
git commit -m "feat: message"
```
Avoid secrets, build artifacts, large dumps.

## TypeScript Posture
- Strict except some unused settings (to re-enable later)
- No disabling lint rules for convenience—refactor instead

## When Backend Restart Is Required
- Controllers / DTO changes
- EF models / Program.cs edits
- Auth configuration changes

## Planned Hardening
- Re-enable unused locals/params
- Route/code splitting
- Test suite expansion (frontend + API)
- Additional ESLint rules (imports/order, accessibility)

## Performance Snapshot
- Bundle ~590 kB (gz ~182 kB) acceptable pre-splitting

## Security
- Never commit real secrets
- Treat dev tokens as placeholders
