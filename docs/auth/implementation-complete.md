# 🔐 Authentication System – Status Review (2025-10-08)

## Current Assessment

The authentication stack is **partially implemented** and requires a fresh validation pass before it can be treated as production-ready. The legacy “complete” designation from late 2025 is no longer accurate for Phase 1.

| Area | Observations | Action Needed |
|------|--------------|---------------|
| Azure EntraID (OIDC) | Tenant/client IDs and optional OpenID Connect wiring remain in configuration. Token validation currently performs issuer/expiry checks only—no signature validation or key caching. Client secret placeholder still present locally. | Implement full JWT signature validation, rotate and store secrets securely, re-issue invitations, and run an end-to-end sign-in test. |
| Local Auth / JWT | Username/password registration, hashing service, and JWT issuance exist. Developer bypass defaults to `false`, but local flow has not been recently regression-tested. | Re-run API auth tests, validate password reset/lockout paths, and document fallback onboarding experience for Phase 1. |
| Database Schema | Migration `20250926194409_AddAuthenticationFields` introduced the expected columns. No verification of applied state since the Sept 2025 cutover. | Confirm migrations applied on fresh database and update onboarding seed data strategy. |
| Frontend Integration | No MSAL wiring committed; frontend still relies on developer bypass for local work. | Decide whether Phase 1 frontend will target local auth first, then layer Azure SSO. |

## Required Decisions for Phase 1

1. **Primary Sign-in Path** – Choose between “local auth first” (simplifies onboarding rebuild) or “Azure-only” (requires renewed tenant access). Recommendation: deliver local auth for Wave 1, then revisit Azure after onboarding UX stabilises.
2. **Tenant Ownership** – If Azure remains in scope, confirm the Microsoft Developer tenant is still active and transfer ownership credentials into a secrets manager.
3. **Environment Parity** – Define how dev containers and CI obtain JWT secrets and Azure settings. Right now these values only exist in `appsettings.Development.json`.

## Immediate Checklist

- [ ] Verify database migrations and seed flow on a clean PostgreSQL instance.  
- [ ] Smoke-test `/api/auth/login`, `/api/auth/register`, `/api/auth/me`, and `/api/auth/azure-login` using the current API.  
- [ ] Restore or recreate Azure client secret and document storage location.  
- [ ] Harden Azure token validation (signature, audience, nonce replay).  
- [ ] Capture the chosen authentication roadmap in the main Phase 1 plan.

## Reference Configuration (Development)

```json
{
  "AzureAD": {
    "TenantId": "90c3ba91-a0c4-4816-9f8f-beeefbfc33d2",
    "ClientId": "efe3c2da-c4bb-45ff-b85b-e965de54f910",
    "ClientSecret": "[REDACTED - replace via user secrets or env var]",
    "Domain": "5ymwrc.onmicrosoft.com",
    "CallbackPath": "/signin-oidc"
  },
  "Development": {
    "BypassAuthentication": false,
    "SeedTestData": true,
    "DefaultTestUserId": 1
  }
}
```

> ⚠️ **Do not commit real client secrets.** Migrate these values into environment variables or .NET user secrets before the next push.

## Validation Flow (To Re-Test)

1. Call `/api/auth/register` to create a local account.  
2. Log in with `/api/auth/login` and confirm JWT + `SetupComplete` claim.  
3. (Optional) Acquire Azure token via MSAL, exchange with `/api/auth/azure-login`, and ensure the user is created/linked.  
4. Hit a protected endpoint (e.g., `/api/portfolio`) using the bearer token to confirm authorization middleware works.  
5. Exercise lockout logic by submitting invalid passwords and checking `FailedLoginAttempts`.

## Outstanding Gaps & Follow-ups

- Refresh token endpoints currently return “not implemented”; document future rollout plan.
- No automated tests cover Azure login flow—add integration tests or mocking strategy.
- Frontend sign-in UI still pending; coordinate with onboarding rebuild.
- Update runbooks (`AUTHENTICATION.md`, onboarding docs) once verification is complete.

---

### Summary

Authentication foundations exist, but Azure SSO and regression coverage need renewed attention. Treat this document as a **status review** until Phase 1 re-verifies each flow. When the checklist above is closed, replace this note with definitive go-live guidance.