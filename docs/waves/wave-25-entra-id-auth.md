# Wave 25 — Microsoft Entra ID Auth + First Real Login + Onboarding Audit

**Status:** 🟡 Nearly complete — Phases A–F done (first real login 2026-07-09 provisioned user 21; Phase F onboarding audit closed 2026-07-13 with a clean DB-vs-template diff; user 20's real data migrated to user 21 on 2026-07-14, dashboard parity verified). Remaining: owner verification of the migrated data + closeout summary
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

### Phase E — Real MSAL login 🟡 implemented 2026-07-08, awaiting first-login verification

**What shipped (frontend only — the Phase B backend needed zero changes):**

- `use_simulated_auth` default flipped to **false** (`featureFlags.ts`). Test
  mode (Vitest) keeps it true so the existing suite exercises the dev path.
  Three ways back to simulated auth, all persisted:
  1. `VITE_USE_SIMULATED_AUTH=true` in `.env.development.local`
  2. Dev Flags panel toggle — flag overrides now persist to localStorage
     (`pfmp_flag_overrides`), so the toggle survives refresh
  3. "Use simulated dev auth instead" button on the login page (dev builds only)
- `views/LoginPage.tsx` (replaces `LoginPlaceholder`): "Sign in with Microsoft"
  → `loginRedirect` for the `api://{clientId}/user_impersonation` scope (one
  consent, one token — no Graph scope mixed in; a token request targets ONE
  resource). Shows `/auth/me` rejection reasons (403 not-allowed/inactive).
- `AuthProvider` real path: `handleRedirectPromise` → `acquireTokenSilent` →
  token into the shared `authToken` module (same pipe as dev tokens, so all
  five transport paths Just Work) → `/auth/me` (first call provisions the
  allowlisted admin) → **the returned `userId` is pushed into the
  `devUserState` store**, which doubles as the current-user store — the ~40
  views that resolve their userId from it work unchanged in real mode.
  Silent-renewal timer re-acquires ~5 min before expiry. `getAccessToken`
  mock stub removed (simulated → dev JWT; real → `acquireTokenSilent`).
- **`isDev` semantic change**: now means "simulated auth active", not "Vite
  dev build". ProtectedRoute/guards/dev tooling all inherit the right
  behavior; the DEV badge shows only in simulated mode; `DevFlagsPanel`
  stays available in dev builds (it's the escape hatch).
- `ProtectedRoute` waits for auth `loading` before redirecting — otherwise the
  redirect to /login strips the MSAL auth code from the URL fragment mid-login.
- MSAL cache moved `sessionStorage` → `localStorage` (sign-in survives browser
  restarts); header gains a "Sign out" button in real mode (`logoutRedirect`).
- Bug fixes found on the way: three services (`schedulerService`,
  `cashTransactionsApi`, `FinancialDataService`) called `authFetch` without
  importing it (latent Phase D `ReferenceError` on those pages); stale
  HeaderBar test count (News link was never added to it).

**Verification checklist (owner, first real login — verified 2026-07-09):**
- [x] `/login` renders; "Sign in with Microsoft" round-trips via
      `wiredoc@outlook.com`
- [x] EntraJwt scheme validates the token (policy-scheme forwards on issuer)
- [x] `/auth/me` provisioned **user 21** (AzureObjectId
      `d0f53d93-a4c5-471b-8c75-b0f3f76cf40a`, exactly one row — the
      StrictMode dedupe + unique index held)
- [x] Landed in onboarding wizard (Phase F starts)
- [x] Dev-mode escape hatch — "Use simulated dev auth instead" confirmed
      present on the login page (owner, 2026-07-14)

Cosmetic note: the Entra token carried `given_name` but no surname claim, so
user 21 provisioned as "Carl User" (fallback). Onboarding/profile fills the
real name; `IsSetupComplete` flips once FirstName+LastName+DOB+EmploymentType
are set.

**Known gap (accepted, Wave 26 scope):** API endpoints still trust the
`userId` query parameter — the token↔userId cross-check lands with RBAC in
Wave 26. Single-machine dev risk only.

### Phase F — Onboarding audit ✅ (2026-07-10 → 2026-07-13)

Owner walked all 16 sections as user 21 using a fictitious-but-consistent
fixture persona ("Alex Morgan", `docs/testing/onboarding-walkthrough-template.md`),
reporting findings in batches; each batch was root-caused and fixed inline
(locked decision 5:C). Fix batches, in commit order:

1. **Investments persistence** (commit `2169b2e`): save→load→save degraded all
   account categories to Brokerage (read emitted enum `ToString()` values the
   form didn't know; write didn't match `roth-ira`/529/crypto/precious-metals).
   Fixed with bidirectional canonical maps + `InvestmentSectionAccountTypes`
   scope; 3 new Account columns (CostBasis, ContributionRatePercent,
   LastContributionDate — migration `Wave25f_InvestmentAccountFields`); enum
   gains Education529=15 / PreciousMetals=16 (appended, values stable).
2. **Dashboard + Profile-tab batch** (same commit, 13 findings): risk 1–5 UI ↔
   1–10 canonical scale (×2 mapping); greeting prefers PreferredName; expenses
   `EffectiveFrom` = month start (mid-month entries were invisible in
   outflows); onboarding cash section rewritten onto `CashAccounts`
   (nickname-matched upsert); ProfileView Selects normalized onto canonical
   vocabularies via `LEGACY_VALUE_ALIASES` (blank-dropdown root cause); missing
   Profile fields added (obligation FundsAllocated/FundingStatus/Notes, benefit
   EmployerContribution%/Notes); federal-benefits infinite fetch loop on fresh
   accounts; no fabricated 30-day net-worth sparkline on day one; VA-disability
   type accepted with hyphen variants (interim — full unification is Wave 26).
3. **Cash-account creation dialogs** (commit `41dd920`): APR / Rate Last
   Checked / Emergency Fund exposed in both dialogs (they're first-class
   `CashAccounts` columns the dialogs never collected); `RateLastChecked`
   plumbed through the backend CRUD; All Accounts page gained an Add Account
   button; all creation paths share canonical `CASH_ACCOUNT_TYPE_VALUES`.
4. **Persistence audit + closeout fixes** (2026-07-13): every DB row diffed
   against the template — 15/16 sections matched exactly (16th = intentional
   equity opt-out, reason text verified). Fixes out of the audit: dashboard
   net-worth investment filter now covers crypto/529/precious-metals (Coinbase
   was silently dropped once correctly typed); manual crypto rows display as
   `investment` (the `crypto` display type is reserved for synthesized
   exchange-connection entries); health score reads `IncomeStreams` instead of
   the empty legacy `IncomeSources` (DTI + savings rate — 40% of the score —
   were zeroed); diversification counts holdings-less manual accounts; deleted
   3 stale pre-fix cash rows from unified `Accounts`; retyped Coinbase to
   `CryptocurrencyExchange` via MCP.

Audit-verified totals for user 21 (all match the template's sanity numbers):
cash $53,800 · investments (non-TSP) $166,850 · TSP ~$161,148 (units × cached
prices) · property equity $147,000 · liabilities (non-mortgage) $33,950 ·
net worth $494,848.

**Data migration (2026-07-14):** owner chose a full copy of user 20's real
data. Executed via MCP: user 21's fixture rows backed up to in-DB schema
`backup_u21_fixture_20260714` (74 rows; nightly dump `pfmp_dev_20260714_020001`
as second restore point), fixture rows wiped, `clone_user_data` copied the 17
parent tables, and the tool's misses were gap-filled manually — child tables
(Holdings 8, Transactions 42, CashTransactions 8, PropertyValueHistory 11,
CryptoHoldings/TaxLots/Transactions 2/1/1, AIConversations 3 + AIMessages 13)
inserted with ID remapping, the salary allotment's cash-account GUID re-pointed,
and the Users row's financial/profile columns copied (identity/auth columns —
AzureObjectId, email, BypassAuthentication=false — preserved; PreferredName set
to the owner's real given name). Verified: user 21's dashboard summary is
byte-identical to user 20's (net worth $874,296.38, same per-type balances,
7 accounts). Caveat: both users now hold the same crypto exchange credentials,
so scheduled syncs hit Kraken/BinanceUS twice — deactivate user 20's
`ExchangeConnections` if that becomes noisy (Wave 26 dev-toggle work decides
user 20's fate anyway).

---

## Acceptance criteria

- [x] Dual-scheme auth pipeline (DevJwt + EntraJwt behind policy scheme)
- [x] Dev-login mint + full frontend transport coverage (5 paths)
- [x] `[Authorize]` on all user-data controllers; public surface minimized
- [x] Provisioning service with admin allowlist, no email-linking
- [x] `use_simulated_auth` defaults to false; real MSAL login verified end-to-end
      (2026-07-09)
- [x] First real login provisioned a fresh admin user (user 21) and landed in
      onboarding
- [x] Onboarding walk-through complete; mismatches fixed (Phase F, closed
      2026-07-13 — persistence audit diffed every DB row against the fixture
      template, 15/16 exact + intentional opt-out)
- [x] Data copy from user 20 via MCP (one-shot, 2026-07-14 — owner chose full
      copy; fixture data backed up then replaced; dashboard parity verified.
      Awaiting owner verification in the app)
- [ ] Wave doc closeout summary
