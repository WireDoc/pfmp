# Dashboard MSW Handler Notes

## Context
Our Vitest suites now use Mock Service Worker (MSW) fixtures for the dashboard API (summary, alerts, advice, tasks). These handlers live in `src/tests/mocks/handlers.ts` and are re-used by unit and integration tests.

## Root Cause Recap
- Requests to `/api/alerts`, `/api/Advice/user/:id`, and `/api/Tasks` were failing with `500` even after registering `mockDashboard*` helpers.
- MSW logs reported `TypeError: Missing parameter name at 9` from `path-to-regexp`.
- The issue came from our handler matcher definitions: string patterns such as `"http://localhost/src/:path*"` (and later overly complex regexes) were interpreted by `path-to-regexp` as route templates. The colon in `http://` or `?:` groups caused the parser to throw, forcing MSW to respond with a 500.

## Fix Summary
- Replaced absolute string matchers with regex-based matchers that avoid `:` placeholders.
- Simplified the alerts/advice/tasks expressions to plain regexes tolerated by `path-to-regexp`.
- Updated `dashboardService.test.ts` and `dashboardService.msw.integration.test.ts` to rely entirely on MSW helpers rather than manual `fetch` stubs.

## Guardrails for New Handlers
- Prefer regex matchers. If you need to support multiple hosts or ports, use patterns like `^https?:\\/\\/(?:localhost|127\\.0\\.0\\.1|\\[::1])(?::\\d+)?/api/...$` instead of literal URL strings.
- Avoid non-capturing groups that start with `?:`; MSW converts regexes to strings in some code paths and feeds them to `path-to-regexp`, which treats `:` as a route parameter marker.
- After adding or modifying handlers, run:
  - `npm run test -- src/tests/mocks/handlers.test.ts`
  - `npm run test -- src/tests/dashboardService.test.ts`
  - `npm run test -- src/tests/dashboardService.msw.integration.test.ts`
- Watch for `TypeError: Missing parameter name` warnings—this always means the matcher pattern needs to be adjusted.

## When to Fall Back to Manual Stubs
- If a test needs to mutate `fetch` (e.g., to assert POST payloads) you can still `vi.spyOn(global, 'fetch')`, but keep MSW as the default for GET fixtures.
- For component tests that already stub `global.fetch`, make sure you reset the spy and MSW handlers in `afterEach` to avoid leakage.
