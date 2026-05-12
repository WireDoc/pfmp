# PFMP — Claude Code instructions

Project conventions, daily workflow, doc guardrails, and the full wave / roadmap
context live in [`.github/copilot-instructions.md`](.github/copilot-instructions.md).
**Read that first** — it is the single source of truth for both Copilot and Claude
Code. The points below are Claude-Code-specific add-ons.

## Server lifecycle

Always use the project batch files for the dev API + Vite:

- `start-dev-servers.bat`
- `stop-dev-servers.bat`
- `restart-dev-servers.bat`

The batches spawn visible terminal windows the user actively monitors. Do **not**
reach for `taskkill /F` or PowerShell `Stop-Process` — backgrounded servers die
silently and the user loses observability.

Before any rebuild that requires the API to be stopped (controller / DTO / EF
model / migration / `Program.cs` change), run `restart-dev-servers.bat`.

## Database access

The dev database is reachable through MCP postgres tools
(`mcp__pfmp-postgres__list_tables`, `execute_query`, `get_table_schema`, etc.) —
wired in [`.mcp.json`](.mcp.json) via the bridge at
`c:\pfmp\mcp-bridge` to the Ubuntu MCP server.

Use those tools for **all** dev-DB reads and writes. Never pipe the connection
string or password to Bash / psql — keep credentials out of shell history.

See [`docs/dev/mcp-integration.md`](docs/dev/mcp-integration.md) for the full
architecture.

## Frontend

`npm` only. Do not invoke `pnpm` or `yarn` — they are not supported in this repo.

## Planning posture

For non-trivial work (new endpoints, data-model changes, multi-file refactors,
new wave / planning docs), present design options + open questions with a
default-if-no-override **before** authoring code or docs. The user makes
architecture calls and likes to be in the driver's seat. One-line bug fixes,
typos, and rename-renames can proceed without a pre-flight.
