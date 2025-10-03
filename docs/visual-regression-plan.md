# Visual Regression Plan

Goal: Introduce lightweight visual regression coverage after foundational routing (Wave 1) and before complex dashboard + onboarding UI density (Waves 2–4) to detect unintentional UI drift.

## Candidate Tools
| Tool | Pros | Cons | Fit |
|------|------|------|-----|
| Playwright + @playwright/test + trace viewer | Full E2E + screenshot baseline, CI friendly | Slightly more setup | Strong |
| Chromatic (Storybook SaaS) | Zero infra, PR diff UI | External service, private repo cost | Possible (later) |
| Loki (Storybook) | Local + CI, simple | Requires Storybook first | Deferred until Storybook installed |

Initial choice: **Playwright** (headless + per-route snapshots) — independent of Storybook timeline.

## Phased Approach
1. Wave 1.5 (post routing merge): Add Playwright dev-dependency & `tests/visual` with 2–3 baseline snapshots (layout, protected redirect, not found page).
2. Wave 2: Add onboarding step snapshots (incomplete vs complete).
3. Wave 4: Add intelligence dashboard placeholders and alerts list states.
4. Wave 6: Finalize accessibility + performance snapshots (metrics capture optional).

## Snapshot Strategy
- One canonical viewport (1280x800) baseline.
- Optional additional mobile viewport (375x812) once layout stabilizes.
- Stable data seeding: Use test user IDs / mock query params to produce deterministic UI.

## Naming Conventions
`<Area>__<State>.png` (e.g., `Layout__Default.png`, `Protected__Redirect.png`).

## Test Example (Planned)
```ts
// tests/visual/layout.spec.ts (planned)
import { test, expect } from '@playwright/test';

test('layout default', async ({ page }) => {
  await page.goto('http://localhost:3000/');
  await expect(page).toHaveScreenshot('Layout__Default.png');
});
```

## Determinism Guidelines
- Avoid time-based dynamic text (stub Date.now via playwright context if needed later).
- Keep random data out of initial states; rely on fixed test user seeds.

## CI Integration (Future)
- Add GitHub Action: run Playwright tests → upload diff artifact on failure.
- Optional gating: fail PR if pixel diff > threshold (1–2%).

## Not In Scope Yet
- AI response snapshotting (too volatile until mock adapters settle – Wave 5)
- Cross-browser matrix (start with Chromium only)

## Exit Criteria for Initial Adoption
- 3 baseline screenshots stable across two consecutive runs.
- Documented re-baseline process in README section (will add when tool installed).

---
Tracking reference for AI systems: `docs/visual-regression-plan.md`.
