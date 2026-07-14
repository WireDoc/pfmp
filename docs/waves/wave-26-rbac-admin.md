# Wave 26 — RBAC + Admin User Management + Dev-Mode Toggle

**Status:** 🟡 In progress — preflight locked 2026-07-14; security core first
**Owner:** Solo project; user is sole customer (user 21 = the real admin account)
**Campaign:** Second wave of Phase 5 (Production Readiness) — see
`docs/history/roadmap.md`. Predecessor: Wave 25 (Entra ID auth, closed with the
onboarding audit + user-20 data migration).

---

## Why this wave exists

Wave 25 put real authentication in front of every endpoint, but authorization
stops at "has a valid token": roughly **190 places trust a caller-supplied
userId** (71 `[FromQuery] userId` across 15 controllers, 110 `{userId}` route
templates across 17 controllers, ~10 create-DTOs with a `UserId` body field),
and the existing `api/admin/users` controller (list/create/delete users) is
callable by any authenticated user. There is no admin concept at all —
`IsAdmin` appears nowhere in the codebase before this wave.

## Locked decisions (2026-07-14)

| # | Decision | Choice |
| - | -------- | ------ |
| 1 | Identity resolution | **A — scoped `ICurrentUserContext`** resolving the caller's User row once per request via the existing `UserProvisioningService`; consumed by the ownership filter and the admin policy |
| 2 | token↔userId cross-check | **C — global convention-based action filter now**, opportunistic per-endpoint claims refactor later. Filter inspects bound action arguments (route/query `userId`, body models with a `UserId` property); mismatch → 403; admins exempt |
| 3 | Admin role mechanics | **A — `IsAdmin` bool column** (`Wave26_UserAdminFlag` migration), set at provisioning from the `AdminEmails` allowlist + backfill for user 21; enforced by an `AdminOnly` authorization policy reading the DB (no role claims to sync across two token schemes) |
| 4 | Dev-user switch | **A — pure-frontend impersonation** riding the admin exemption: admin keeps their real Entra token, toggle writes the dev user's id into `devUserState`, existing consumers pass it unchanged. **Writes allowed** while impersonating |
| 5 | Admin users page scope | **B — minimal v1**: user list + activate/deactivate only (promote/demote + chat-cost columns deferred) |
| 6 | Phase F cleanup queue | **A — all four in-wave** after the security core: (i) delete `BypassAuthentication` paths → (iv) real-name capture → (iii) reconcile the two net-worth calculators → (ii) VA unification + retire `IncomeSources`/`VADisabilityTracker` |

Work order (commit + owner verification checkpoint after each chunk):
**security core → dev toggle → admin page → cleanup → closeout.**

## Known limits accepted with decision 2C

- The filter validates **explicit userId inputs** only. Endpoints keyed by an
  entity id (e.g. `cashaccounts/{guid}`) don't carry a userId, so row-level
  ownership there still depends on the handler; that's the opportunistic
  refactor's territory.
- A few endpoints default `userId ?? 1` when the param is omitted (dashboard).
  The frontend always sends it, but those fallbacks should die in the claims
  refactor.

## Phases

### Phase A — Security core 🟡

- `IsAdmin` on `User` + `Wave26_UserAdminFlag` migration; backfill user 21;
  provisioning sets `IsAdmin = true` for allowlisted first logins
- `ICurrentUserContext` (scoped, request-cached) in `Services/Auth`
- `AdminOnly` policy + requirement handler
- `UserOwnershipFilter` registered globally in `AddControllers`
- `api/admin/users` gated with `AdminOnly` (was: any authenticated user);
  `DevUsersController` already 404s outside Development — unchanged

### Phase B — Dev-user switch (admin-only) 📋

- Toggle in the dashboard nav, hidden unless the current user `IsAdmin`
- Writes the picked dev user id into `devUserState` (persisted); DEV badge
  shows while impersonating; real Entra session untouched

### Phase C — Admin users page (minimal) 📋

- `/dashboard/admin/users`: list users (id, name, email, active, admin,
  created, last login), activate/deactivate. Backend = existing
  `UserAdminController` + an activate/deactivate endpoint

### Phase D — Phase F cleanup queue 📋

1. Delete legacy `Development:BypassAuthentication` code paths
2. Real-name capture (FirstName/LastName editable; kills "Carl User")
3. One shared net-worth calculator (snapshot currently excludes TSP, dashboard
   includes it — ~$161k apart)
4. VA disability unification on `IncomeStreams`; retire legacy `IncomeSources`
   table + `VADisabilityTracker` component
5. Quiet recurring jobs for deactivated users (owner request 2026-07-14: "I
   want to quiet the app for these as I stop testing, but be able to bring
   them back online"). All reversible query-time filters on `Users.IsActive`:
   FMP price refresh + symbol-metrics universe (symbols now derive from
   active owners' holdings only), Plaid sync, crypto exchange sync, property
   valuation refresh (RentCast/FHFA quota), spending rollups. Already
   filtered before this wave: net-worth snapshots, news ingestion/digests.
   Global market data (TSP fund prices, benchmarks) intentionally unfiltered.

## Acceptance criteria

- [ ] Non-admin requests carrying another user's id are rejected (403) on
      query, route, and body paths
- [ ] Admin (user 21) can act on any userId — powers the dev switch
- [ ] `api/admin/users` unreachable for non-admins
- [ ] Dev-user toggle: impersonate user 20, browse + write, flip back, real
      session intact
- [ ] Admin users page lists users; activate/deactivate round-trips
- [ ] Cleanup queue items 1–4 landed
- [ ] Wave doc closeout
