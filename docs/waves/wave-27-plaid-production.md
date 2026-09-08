# Wave 27 — Plaid Sandbox → Production

**Status:** 📋 Planned — **runs AFTER Wave 28** (order swapped 2026-07-16);
preflight decisions locked, work starts once Wave 28 Phase C yields a live URL
**Owner:** Solo project; user is sole customer
**Campaign:** Phase 5 (Production Readiness). Predecessors: Waves 25, 26, 28

---

## Why this wave exists

Plaid integration works end-to-end in **sandbox** — Link, token exchange,
balance/transaction/liability/investment sync, all driven by `PlaidSyncJob`.
Production access is not automatic: Plaid reviews the integration against their
Integration Standards and requires publicly reachable compliance pages before
issuing production credentials. This wave builds to that bar, files the
application, and flips the environment on approval.

## Locked decisions (2026-07-16)

| # | Decision | Choice |
| - | -------- | ------ |
| 1 | Wave order | **B — Wave 28 first.** The application requires a public URL + hosted privacy policy, so filing happens against the live deployment rather than a screencast-only submission |
| 2 | Privacy policy + ToS surfaces | **A — unauthenticated SPA routes** (`/privacy`, `/terms`). One deploy artifact, served at the public domain, no second thing to style or host. Claude drafts (incl. the explicit "Plaid as data processor" language Plaid checks for); owner reviews before it ships |
| 3 | Error-handling hardening | **A — audit + fix inline** (Phase-F style): audit the Link/exchange/sync paths against the codes Plaid reviews, report findings, apply the fixes in the same pass |
| 4 | Webhooks | **A — deferred.** `PlaidSyncJob` polling is sufficient and Plaid does not require webhooks for approval. Revisit post-production if sync freshness proves inadequate |

**Owner-hands item:** the sandbox screencast (Link → token exchange → balance
sync). Claude scripts the exact click-path; owner records.

---

## What Plaid's process looks like

| Step | Description | Typical timing |
| ---- | ----------- | -------------- |
| 1. Self-attestation | Production Access Request in the Plaid dashboard — use case, user count, volume, data retention | Immediate |
| 2. Compliance materials | Publicly accessible privacy policy naming Plaid as a data processor, terms of service, public app URL or screencast | Days–weeks (we control this) |
| 3. Plaid review | Against Integration Standards — error handling, OAuth flow, webhook handling if used, data minimization | 1–4 weeks |
| 4. Production credentials | New client_id + secret on approval | Immediate after approval |
| 5. Pricing tier | "Limited Production" (free, item-capped) vs full Production. Personal single-user qualifies for Limited | Chosen during application |

## Phases

### Phase A — Compliance pages 📋

- `/privacy` and `/terms` as unauthenticated SPA routes (decision 2A)
- Privacy policy explicitly covers: Plaid as data processor, what financial
  data is collected, where it is stored (self-hosted Postgres on the owner's
  LAN), retention, and how a user disconnects an institution
- Owner reviews wording before it ships publicly

### Phase B — Error-handling audit + fixes 📋

Audit every Plaid path against the failure codes Plaid reviews, and fix
inline (decision 3A):

- `ITEM_LOGIN_REQUIRED` — needs a visible "reconnect" affordance (Link update
  mode), not a silent sync failure
- `ITEM_LOCKED`, `INSTITUTION_DOWN` — user-legible status, no infinite retry
- `NO_ACCOUNTS` — graceful empty result rather than an exception path
- `RATE_LIMIT_EXCEEDED` — backoff that doesn't hammer on the next job tick

Also: confirm Integration Standards conformance
(<https://plaid.com/docs/link/integration-best-practices/>) and verify the
Data Protection API token encryption meets Plaid's security expectations.

### Phase C — File the application 📋 (needs Wave 28 Phase C's live URL)

- Self-attestation form; Limited Production tier
- Submit the public URL + compliance pages; attach the screencast
- Then: wait on review, respond to any Plaid feedback

### Phase D — Production cutover 📋 (on approval)

- `Plaid:Environment` → `production`; new client_id + secret into the
  Wave 28 env-var mechanism (never committed)
- **Re-link the owner's real bank accounts** — sandbox items do not transfer
- Watch logs for the first weeks: real banks produce outage/error modes the
  sandbox never simulates
- Monitor item count against the Limited tier cap

## Acceptance criteria

- [ ] `/privacy` + `/terms` live at the public domain, owner-approved wording
- [ ] Plaid error codes handled gracefully, with a working re-link flow
- [ ] Screencast recorded
- [ ] Production Access Request filed
- [ ] Production credentials in place; real accounts linked and syncing
- [ ] Wave doc closeout
