# Wave 26 — RBAC + Admin User Management + Dev-Mode Toggle

**Status:** 🟡 Phases A–D implemented (A `89dbec8`, B `9c2cf6b`, C `e7ee2f0`, D `84f4686` + `fa0f3b2` + `3d1dd2e` + VA unification) — owner verification of Phase D, then closeout
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

### Phase A — Security core ✅ (`89dbec8`, verified live)

- `IsAdmin` on `User` + `Wave26_UserAdminFlag` migration; backfill user 21;
  provisioning sets `IsAdmin = true` for allowlisted first logins
- `ICurrentUserContext` (scoped, request-cached) in `Services/Auth`
- `AdminOnly` policy + requirement handler
- `UserOwnershipFilter` registered globally in `AddControllers`
- `api/admin/users` gated with `AdminOnly` (was: any authenticated user);
  `DevUsersController` already 404s outside Development — unchanged

### Phase B — Dev-user switch (admin-only) ✅ (`9c2cf6b`, owner-verified)

- Toggle in the dashboard nav, hidden unless the current user `IsAdmin`
- Writes the picked dev user id into `devUserState` (persisted); DEV badge
  shows while impersonating; real Entra session untouched

### Phase C — Admin users page (minimal) ✅ (`e7ee2f0`, verified live incl. immediate lockout)

- `/dashboard/admin/users`: list users (id, name, email, active, admin,
  created, last login), activate/deactivate. Backend = existing
  `UserAdminController` + an activate/deactivate endpoint

### Phase D — Phase F cleanup queue ✅ (2026-07-14 → 2026-07-15)

1. ✅ `Development:BypassAuthentication` config flag + all code paths deleted
   (`84f4686`) — four bypass branches + `CreateDevelopmentAuthResult`, the
   AuthController field, the AuthConfig response property. The
   `Users.BypassAuthentication` COLUMN stays (dev-account marker, unrelated).
2. ✅ Real-name capture (`fa0f3b2`) — FirstName/LastName on the household
   section (onboarding + Profile tab, saved via existing paths; never cleared
   by opt-out). Kills "Carl User" once the owner types their name.
3. ✅ One shared net-worth calculator (`3d1dd2e`) —
   `Services/NetWorth/NetWorthCalculationService` consumed by the dashboard
   summary, the daily `NetWorthSnapshotJob` (fixes its linked-mortgage
   double-count + stale type list), and the financial-profile snapshot (now
   includes TSP + crypto; verified identical to the dashboard: $874,578.48).
4. ✅ VA disability unification — `IncomeStreams` is the ONE VA store; the
   income upsert syncs `Users.VADisabilityMonthlyAmount` (verified live);
   VA % + projections toggle stay as User metadata; Profile tab's VA amount
   is a read-only synced view (and stripped from the userCore save payloads
   so a stale copy can't clobber the sync). Retired: `IncomeSources` table
   (migration `Wave26_DropLegacyIncomeSources`; 0 rows), model, controller,
   frontend `incomeSourceService`, `VADisabilityTracker` component. Bonus
   dead-scaffold cleanup: `PfmpDevContext` + `Models/Temp/*` (37 files, only
   referenced by each other; also kills the connection-string build warning).
   Settings CSV export now reads IncomeStreams. `UsersController` summary
   income moved to IncomeStreams.
5. ✅ Quiet recurring jobs for deactivated users (`84f4686`; owner request
   2026-07-14: "quiet the app for these as I stop testing, but be able to
   bring them back online"). All reversible query-time filters on
   `Users.IsActive`: FMP price refresh + symbol-metrics universe (symbols now
   derive from active owners' holdings only), Plaid sync, crypto exchange
   sync, property valuation refresh (RentCast/FHFA quota), spending rollups.
   Already filtered before this wave: net-worth snapshots, news ingestion.
   Global market data (TSP fund prices, benchmarks) intentionally unfiltered.

## Acceptance criteria

- [x] Non-admin requests carrying another user's id are rejected (403) on
      query and body paths (route values bind identically) — verified live
- [x] Admin (user 21) can act on any userId — powers the dev switch
- [x] `api/admin/users` unreachable for non-admins (403 verified)
- [x] Dev-user toggle: impersonation verified by owner 2026-07-14
- [x] Admin users page lists users; activate/deactivate round-trips with
      immediate lockout; self-deactivation refused
- [x] Cleanup queue items 1–5 landed (see Phase D)
- [ ] Owner verification of Phase D + wave doc closeout summary
