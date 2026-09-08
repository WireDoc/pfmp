# Wave 28 — Production Hardening + Self-Hosted Deploy (Cloudflare Tunnel)

**Status:** 🟡 Preflight locked 2026-07-16 — Phase A (secrets + security) starts first
**Owner:** Solo project; user is sole customer (user 21 = the real admin account)
**Campaign:** Final wave of Phase 5 (Production Readiness). **Order swapped
2026-07-16** — this wave now runs BEFORE Wave 27 so the Plaid production
application can be filed against a live public URL.
**Predecessors:** Wave 25 (Entra ID auth), Wave 26 (RBAC + admin + cleanup)

---

## Why this wave exists

The app is feature-complete and properly authenticated, but it only exists on
`localhost`. Everything that makes it *publicly runnable* is still missing: a
JWT signing key that isn't a hardcoded string in a committed file, secrets in
env vars instead of config, HTTPS, rate limiting, container images, structured
logs, and a way in from the outside world.

## Locked decisions (2026-07-16)

| # | Decision | Choice |
| - | -------- | ------ |
| 1 | Public topology | **A — single hostname.** nginx serves the Vite build and proxies `/api/*` to the API container. One tunnel route, **no CORS in production** (same-origin), one MSAL redirect URI, no API base URL baked into the bundle |
| 2 | Frontend network cleanup | **A — surgical fixes** (~half day): singleton multicast poller, promise-cache the crypto/connections fetches, cap focus-refresh. TanStack Query stays available as a later opportunistic refactor |
| 3 | Observability | **A — Serilog JSON + Seq container.** Queryable structured logs, one lightweight service, free single-user, doubles as error tracking via log levels |
| 4 | Phase order | **A → B → C → D → E** (below), each a commit + owner-verification checkpoint |

## Open questions

| # | Question | Status |
| - | -------- | ------ |
| 1 | **Public hostname / domain** | 🔴 **OPEN — awaiting owner.** Owner will create a Cloudflare account + register/transfer a domain; the name is not chosen yet. Phases A, B, D, E do not depend on it. Phase C is blocked until it exists, as is the Wave 27 Plaid filing |
| 2 | Docker host | ✅ Resolved 2026-07-16 — the same Ubuntu server that hosts the MCP bridge; already runs many Docker containers |

---

## Phases

### Phase A — Secrets + security hardening 📋 (no domain needed)

- Replace the hardcoded `JWT:SecretKey` default
  (`"PFMP-Dev-Secret-Key-Change-In-Production-2025"`) with an env-loaded
  secret; fail fast at startup in Production if unset
- Move connection string, OpenRouter key, Plaid client/secret, FMP key to env
  vars (`.env.production` mounted, never committed); committed appsettings
  files become safe-by-construction
- Rate limiting on cost-bearing endpoints (chat especially — per-message spend
  is real), via ASP.NET's built-in rate limiter
- Re-confirm the `[Authorize]` audit: nothing public but `/health`,
  `/health/ready`, and the login/registration surface
- Data Protection API key directory → mounted Docker volume (otherwise every
  container restart invalidates stored Plaid token encryption)

### Phase B — Container images + local stack 📋 (no domain needed)

- `Dockerfile` for the API (multi-stage: .NET 9 publish → runtime image)
- `Dockerfile` for the frontend (Vite build → nginx, with the `/api/*` proxy
  from decision 1A)
- `docker-compose.yml`: API + frontend + Seq + `cloudflared`
- Smoke-test the whole stack on the Ubuntu box, network-isolated, against the
  real NAS Postgres

### Phase C — Cloudflare Tunnel + public reachability 🔴 BLOCKED on the domain

- Tunnel config, hostname → nginx service; Cloudflare manages the cert
- **Add the production redirect URI to the Entra app registration** — MSAL
  refuses any redirect not registered, so login breaks on the public domain
  until this is done (owner action in the Azure portal; exact values provided
  when the domain exists)
- Backend trusts the proxy (`ForwardedHeaders`) so scheme/host are correct
- Smoke-test from outside the LAN (phone on LTE)

### Phase D — Observability 📋 (no domain needed)

- Serilog structured JSON logging with rotation + retention
- Seq container wired up; verify the noisy paths (Hangfire jobs, Plaid sync,
  chat SSE) log usefully rather than voluminously
- Health-check polish — exercised by both Docker and Cloudflare

### Phase E — Frontend dedup + polling cleanup 📋 (no domain needed)

Pre-existing, documented 2026-06-27: `/api/dashboard/summary` hit 20+ times in
2 minutes (per-subscriber 45s pollers), `listExchangeConnections` 13× in 96
seconds, `listCryptoHoldings` 8×, plus `refreshOnFocus` stacking on top.
Surgical fixes per decision 2A. Also verify the crypto manual-sync 1-hour
cooldown (`CryptoController.ManualSyncCooldown`) is right for real Kraken /
Binance.US tier limits.

### Cutover sequence

1. Local stack smoke-test on the Ubuntu server (Phase B)
2. Tunnel to a test subdomain; verify HTTPS + cert (Phase C)
3. Outside smoke-test from LTE
4. **Wave 27 begins** — file the Plaid production application against the live URL
5. Switch to the production hostname when Plaid approves
6. Watch logs for a week; fix what breaks
7. Mark Phase 5 complete

---

## Acceptance criteria

- [ ] No secret values in committed files; Production startup fails loudly if a
      required secret is missing
- [ ] Chat and other cost-bearing endpoints are rate-limited
- [ ] API + frontend run as containers against the NAS Postgres
- [ ] App reachable over HTTPS from outside the LAN; real MSAL login works on
      the public domain
- [ ] Structured logs queryable in Seq; errors surface without SSH-grepping
- [ ] Dashboard load no longer issues duplicate polling storms
- [ ] Backup restore procedure documented and actually test-restored
- [ ] Wave doc closeout
