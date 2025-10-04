## Development Scripts & Feature Flags

### Launching Services

Use `start-dev-servers.bat` (Windows) or `scripts/start-dev-servers.ps1` to launch API and frontend.

Examples:

```
start-dev-servers.bat            # launches both
start-dev-servers.bat backend    # backend only
start-dev-servers.bat frontend   # frontend only
start-dev-servers.bat KEEP_OPEN  # keeps launcher console open (skip auto-close)
```

PowerShell direct:

```
pwsh ./scripts/start-dev-servers.ps1            # both
pwsh ./scripts/start-dev-servers.ps1 backend    # backend only
pwsh ./scripts/start-dev-servers.ps1 frontend   # frontend only
```

### Stopping Services

Use `stop-dev-servers.bat` (wrapper) or `scripts/stop-dev-servers.ps1`.

Behavior:
- Gracefully closes titled windows: `PFMP API`, `PFMP Frontend`.
- Kills lingering `vite`/`node` and `dotnet` processes tied to repo folders.
- Final heuristic closes any leftover frontend shell.

Force kill:

```
stop-dev-servers.bat FORCE
```

### Feature Flags

Flags live in `pfmp-frontend/src/flags/featureFlags.ts`.

Important current flags:
- `enableDashboardWave4`: Gates the new Wave 4 dashboard layout (`/dashboard`). When off, legacy placeholder remains.
- `onboarding_persistence_enabled`: Enables saving onboarding progress to backend.
- `use_simulated_auth`: Keeps a simulated auth provider active for local development.

Runtime toggle (dev flags panel): If running in dev mode and authenticated as a dev user, you can use the Dev Flags Panel (bottom overlay) when `isDev` context is true.

Programmatic toggle in console:

```js
import { updateFlags } from './flags/featureFlags';
updateFlags({ enableDashboardWave4: true });
```

### Onboarding Gating (Wave 4)

When `enableDashboardWave4` is true:
- Visiting `/dashboard` while onboarding is incomplete redirects to `/onboarding`.
- Completing all steps (all steps in `completed` set) unlocks dashboard.

### Tests

Run all frontend tests:

```
npm test
```

Key tests added:
- `dashboardFlagGating.test.tsx`: Verifies Wave 4 dashboard flag on/off behavior.
- `onboardingRedirect.test.tsx`: Verifies redirect to onboarding when incomplete.

### Troubleshooting

If stop script leaves a window open:
1. Note exact title and open an issue / adjust pattern in `stop-dev-servers.ps1`.
2. Ensure the window wasn’t manually retitled or launched outside provided scripts.

If vite still runs after stop:
- Check for orphaned `node` processes using Task Manager; rare if script heuristics miss.

### Future Enhancements
- Integrate structured logging into start script.
- Optional port override parameters.
- Remote flag provider / per-user overrides.
