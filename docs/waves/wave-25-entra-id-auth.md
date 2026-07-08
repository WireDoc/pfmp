# Wave 25 — Microsoft Entra ID Auth + First Real Login + Onboarding Audit

**Status:** 🟡 In progress — Phases A–D complete (2026-06-27 → 2026-06-30); Phase E next
**Owner:** Solo project; user is sole customer
**Campaign:** First wave of Phase 5 (Production Readiness) — see `docs/history/roadmap.md` § "Phase 5: Production Readiness Campaign" for the full 4-wave plan (25: auth, 26: RBAC + admin, 27: Plaid prod, 28: hardening + deploy)
**Predecessors:** Wave 22-24 (app feature-complete for single-user daily use)

> Note: this doc was created retroactively on 2026-07-02 — Phases A–D were
> planned and executed in-conversation before the doc existed. Commit refs
> are the source of truth for what shipped.

---

## Why this wave exists

The app has been in "dev bypass" auth since inception: a simulated-user system
(`use_simulated_auth` feature flag, `SIMULATED_USERS`, `DevUserSwitcher`) with
no enforced authentication on any API endpoint. Production readiness starts
with real identity: the owner logs in with their Microsoft account
(`wiredoc@outlook.com`), gets a fresh PFMP user provisioned, and every API
endpoint requires a validated token.

## Locked decisions (2026-06-25)

| # | Decision | Choice |
| - | -------- | ------ |
| 1 | Multi-user model | **B — open with allowlist** (architecture supports it; practically single-user — owner said "one user and will likely stay that way") |
| 2 | Dev-user access post-launch | **A — admin-only "Switch to dev users" toggle** (ships in Wave 26) |
| 3 | Existing user 20 | **B — start fresh on first real login**; selectively copy data via MCP scripts as a one-shot (user 20 stays as dev seed) |
| 4 | Post-login landing | **A — redirect into Onboarding wizard** |
| 5 | Onboarding audit timing | **C — concurrent with Phase E/F**: fix field/column mismatches as the owner walks the flow |
| 6 | Plaid prod application | File only when app meets Plaid's criteria (Wave 27; needs public URL from Wave 28) |
| 7 | Deploy target | **C — self-host on Ubuntu + Cloudflare Tunnel** (Wave 28) |
| 8 | Legacy-code refactor | **A — opportunistic during Waves 25-28**, no dedicated wave |

## Azure configuration

- App Registration: SPA platform, redirect URIs `http://localhost:3000`;
  Client ID `efe3c2da-c4bb-45ff-b85b-e965de54f910` (also the DEFAULT_CLIENT_ID
  in `pfmp-frontend/src/config/authConfig.ts`)
- "Expose an API" configured 2026-06-27: Application ID URI `api://{clientId}`
  + `user_impersonation` scope (admins-and-users consent)
- Tenant + admin allowlist values live in gitignored local config:
  `PFMP-API/appsettings.Development.local.json` (`AzureAD` block) and
  `pfmp-frontend/.env.development.local` (`VITE_AZURE_AD_*`)
- Owner's real account is a B2B guest in the dev tenant (`#EXT#` UPN), so the
  admin allowlist matches on `preferred_username`/`email` claim
  (`AzureAD:AdminEmails`), NOT on object id

---

## Phases

### Phase A — Config wiring ✅ (commit `d24d738`, 2026-06-27)

- `AzureAD` block gains `Audience` + `AdminEmails` (placeholders committed;
  real values gitignored)
- Frontend `.env.development` documents `VITE_AZURE_AD_*` vars; real values in
  `.env.development.local`
- No behavior change — simulated auth stayed default

### Phase B — Dual-scheme JWT backend ✅ (same commit)

- `Services/Auth/AzureAdOptions.cs` — typed config, `IsConfigured`, authority helper
- `Services/Auth/UserProvisioningService.cs` — resolves the current `User` from
  a `ClaimsPrincipal`: dev tokens (`UserId` claim) → direct lookup; Entra tokens
  (`oid` claim) → lookup by `AzureObjectId`, else first-login provisioning gated
  by the `AdminEmails` allowlist. **No email-based linking to existing rows**
  (decision 3: start fresh)
- `Program.cs`: default "Bearer" scheme is now a **policy scheme** that sniffs
  the token issuer and forwards to `DevJwt` (symmetric key) or `EntraJwt`
  (Entra authority, audience `api://{clientId}`). Removed the dead
  `AddOpenIdConnect` block (wrong pattern for SPA + API)
- `AuthController`: `/auth/me` rewritten onto the provisioning service;
  new `POST /auth/dev-login?userId=N` mints real dev JWTs
  (Development environment only — 404 otherwise)

### Phase C — Frontend token plumbing ✅ (commit `9c69cb2`)

- `services/authToken.ts` — module-level token store
- AuthProvider mints a dev JWT via `/auth/dev-login` on dev-user selection/switch
- axios + chat-SSE fetch attach the Bearer header

### Phase D — [Authorize] audit ✅ (commit `a78f796` + fixes `c6ca5bf`, `327856a`)

Class-level `[Authorize]` on **38 controllers**. Kept public: health endpoints,
AuthController's login/register/dev-login, DevUsersController (Wave 26 gates it),
DocsController, WeatherForecastController.

**Regression lessons (the expensive part):** the frontend turned out to have
**five distinct HTTP transport paths**, each needing its own auth injection.
Final architecture in `services/authToken.ts`:

1. `window.fetch` monkey-patch (installed first via `main.tsx` import) —
   matches request URL *pathname* `/api/*`; exempts the token-minting auth
   endpoints from the ready-wait (deadlock otherwise)
2. Global default-axios interceptor (axios uses XHR — invisible to the fetch patch)
3. `apiClient` (services/api.ts) — shared `attachAuthInterceptor()`
4. `http` (api/httpClient.ts) — same helper
5. `investmentTransactionsApi` private instance — same helper

Plus: `whenAuthReady()` subscribe-before-check race fix, axios v1
`AxiosHeaders.set()` requirement, AuthProvider completing the initial mint
BEFORE `loading=false` (stops OnboardingContext hydrating unauthenticated and
bouncing the user to /onboarding), and a renewal timer that re-mints 5 minutes
before the 60-minute dev-token expiry (fixes "401s the next morning until
hard refresh").

`AuthenticatedApiService` (authApiService.ts) has zero consumers — dead code,
flagged for opportunistic cleanup.

### Interlude — Wave 25b: property valuation providers (commit `6ac5e98`, 2026-07-02)

Mid-wave side-quest (user request): selectable valuation providers per property
(`rentcast` | `fhfa-hpi` | `manual`), FHFA state-index walk-forward provider,
compare-estimates endpoint + UI, RentCast compCount 5→15. Documented in the
commit; schema migration `Wave25b_ValuationProviderSelection`.

### Phase E — Real MSAL login 📋 NEXT

- Flip `use_simulated_auth` default to **false** (dev override still possible
  via Dev Flags panel / env)
- Login page: "Sign in with Microsoft" via `loginRedirect`
- After redirect: acquire an access token for `api://{clientId}/user_impersonation`,
  store it in the `authToken` module (same pipe the dev tokens use), call
  `/auth/me` → first call provisions the fresh admin user row
- `AuthProvider.getAccessToken` drops the `mock-dev-token-` stub; MSAL
  `acquireTokenSilent` becomes the renewal path (replaces the dev-token timer
  when in real mode)
- Landing: onboarding wizard (new user has no data) — kicks off Phase F
- Verify the EntraJwt scheme end-to-end (first real token exercises the
  policy-scheme forwarding + issuer/audience validation)

### Phase F — Onboarding audit 📋 (concurrent with E)

Owner walks all 15 sections with the fresh account; every field→column mapping
verified; orphans (UI field with no backend save) and gaps (model field with no
UI) fixed inline. One-shot MCP data copy from user 20 for anything worth keeping.

---

## Acceptance criteria

- [x] Dual-scheme auth pipeline (DevJwt + EntraJwt behind policy scheme)
- [x] Dev-login mint + full frontend transport coverage (5 paths)
- [x] `[Authorize]` on all user-data controllers; public surface minimized
- [x] Provisioning service with admin allowlist, no email-linking
- [ ] `use_simulated_auth` defaults to false; real MSAL login works end-to-end
- [ ] First real login provisions a fresh admin user and lands in onboarding
- [ ] Onboarding walk-through complete; mismatches fixed (Phase F)
- [ ] Selective data copy from user 20 via MCP (one-shot)
- [ ] Wave doc closeout summary
