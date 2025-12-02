# PFMP Documentation Map

This index lists every active document under `docs/` following the subject-first taxonomy. Paths are relative to the repository root (`C:\pfmp`). Archive folders capture retired or historical material and are noted accordingly.

## 📁 api
- `docs/api/reference.md` – REST endpoints and payloads
- `docs/api/dashboard-contract.md` – Dashboard data contract and wiring
- `docs/api/postman.md` – How to import and use the Postman collection and environment
- `docs/api/archive/` *(empty placeholder for future deprecated specs)*

## 🔐 auth
- `docs/auth/overview.md` – Authentication architecture summary
- `docs/auth/getting-started.md` – Local + Azure setup quick start
- `docs/auth/implementation-complete.md` – Production hardening checklist
- `docs/auth/manual-azure-setup.md` – Manual Azure portal walkthrough
- `docs/auth/azure-auth-explained.md` – Deep dive on Azure token flows
- `docs/auth/azure-manual-config.md` – Configuration reference values
- `docs/auth/personal-account-setup.md` – Personal Microsoft account invitation flow
- `docs/auth/fix-redirect-uri.md` – Troubleshooting redirect URI mismatches
- `docs/auth/archive/` *(empty placeholder for retired auth guides)*

## 🗄️ data
- `docs/data/database-tools-setup.md` – Local tooling and connection tips
- `docs/data/import-formats/cash-accounts.md` – CSV import format specification for cash accounts (checking, savings, money market)
- `docs/data/runbooks/database-backup.md` – Backup runbook (PostgreSQL + Synology workflow)
- `docs/data/archive/` *(reserved)*

## 🛠️ dev
- `docs/dev/build.md` – Full-stack build instructions and automation notes
- `docs/dev/library-version-guidelines.md` – Supported library versions and upgrade policy
- `docs/dev/storybook-setup.md` – Storybook scaffold and usage notes
- `docs/dev/mcp-integration.md` – MCP PostgreSQL server setup, tools, and usage guide
- `docs/dev/mcp-server-project-spec.md` – Original MCP server specification and architecture
- `docs/dev/archive/` *(reserved)*

## 📘 guides
- `docs/guides/QUICK-START.md` – Environment preparation and first run
- `docs/guides/DEV-STANDARDS.md` – Coding conventions and lint rules
- `docs/guides/FRONTEND-BACKEND-GUIDE.md` – Architecture overview by layer
- `docs/guides/DATA-&-DB.md` – Database workflows, migrations, and psql usage
- `docs/guides/TROUBLESHOOTING-&-REFERENCE.md` – Common fixes and command glossary
- `docs/guides/archive/` *(reserved)*

## 🕰️ history
- `docs/history/changelog.md` – Release history and notable changes
- `docs/history/roadmap.md` – Upcoming waves and milestones
- `docs/history/archive/` *(reserved)*

## 🧭 meta
- `docs/meta/documentation-strategy.md` – Documentation goals and backlog
- `docs/meta/audit/docs-audit-2025-10-08.md` – Latest audit log of documentation moves
- `docs/meta/pfmp-overview.txt` – Legacy project overview text (captured for reference)
- `docs/meta/archive/` *(reserved)*

## 📝 notes
- `docs/notes/AI-TESTING-GUIDE.md`
- `docs/notes/AI-TESTING-RESULTS.md`
- `docs/notes/archive/` *(reserved)*

### notes archive
- `docs/archive/notes/PHASE3_COMPLETION_NOTES.md`
- `docs/archive/notes/PHASE4_COMPLETION_NOTES.md`
- `docs/archive/notes/PHASE5_AUTHENTICATION_COMPLETION_NOTES.md`
- `docs/archive/notes/PHASE5_COMPLETION_NOTES.md`
- `docs/archive/notes/PHASE5_SUMMARY.md`
- `docs/archive/notes/pfmp-log-2025.md`
- `docs/archive/README.md`

## ⚙️ ops
- `docs/ops/runbooks/` *(empty placeholder for operational runbooks; data-specific items live under `docs/data/runbooks/`)*
- `docs/ops/runbooks/archive/` *(reserved)*

## 🧪 testing
- `docs/testing/README.md` – Testing index with backend API testing, frontend manual/automated testing, and Vitest quick reference
- `docs/testing/alerts-advice-testing.md`
- `docs/testing/advice-testing.md`
- `docs/testing/dashboard-msw-handlers.md`
- `docs/testing/dashboard-wave4-manual-checks.md`
- `docs/testing/onboarding-persistence.md`
- `docs/testing/onboarding-testing.md`
- `docs/testing/tasks-testing.md`
- `docs/testing/visual-regression-plan.md`
- `docs/testing/archive/` – Archived test results:
  - `wave-9.3-option-a-endpoint-tests.md` – Manual endpoint testing results (Nov 2025)

## 🧾 scripts
- `docs/scripts/dev-scripts.md` – Catalog of automation scripts and usage
- `docs/scripts/archive/` *(reserved)*

## 🌊 waves
- `docs/waves/REBUILD-WAVE-PLAN.md`
- `docs/waves/MIGRATION_STATUS.md`
- `docs/waves/SESSION_COMPLETE.md`
- `docs/waves/WAVE-0-COMPLETION.md`
- `docs/waves/WAVE-2-KICKOFF.md`
- `docs/waves/WAVE-3-PERSISTENCE-DESIGN.md`
- `docs/waves/WAVE-4-DASHBOARD-PLAN.md`
- `docs/waves/WAVE-5-DASHBOARD-MVP.md`
- `docs/waves/WAVE-5-ONBOARDING-FORMS-IMPLEMENTATION.md`
- `docs/waves/WAVE-5-REAL-ESTATE-ENRICHMENT.md`
- `docs/waves/WAVE-6-CASH-ACCOUNTS-ENRICHMENT.md`
- `docs/waves/WAVE-6-NAVIGATION-AND-POLISH.md` – Navigation shell structure and dashboard polish plan (NEW - Oct 2025)
- `docs/waves/wave-8.1-implementation-summary.md` – Wave 8.1 Account Detail Modal implementation (Nov 2025)
- `docs/waves/wave-8.1-recovery-plan.md` – Wave 8.1 Recovery: Dashboard data display fix and Phase 2 plan (Nov 2025)
- `docs/waves/wave-9.2-complete.md` – Wave 9.2 Market Data Integration: FMP API integration with real-time quotes, historical charts, and price refresh (Nov 2025)
- `docs/waves/wave-9.3-option-a-all-parts-complete.md` – Wave 9.3 Option A Complete: Enhanced Investment Metrics with transaction management and SKELETON/DETAILED state system (Nov 2025)
- `docs/waves/wave-9.3-calculated-balance-fix.md` – Wave 9.3 Fix: Calculated balance for DETAILED accounts, recalculate endpoint (Nov 2025)
- `docs/waves/wave-9.3-option-b-complete.md` – Wave 9.3 Option B Complete: Loan & Credit Card Views with debt payoff strategies (Dec 2025)
- `docs/waves/PHASE-2-DATA-AGGREGATION.md` – Phase 2 complete plan: Manual data entry, CSV import, holdings management
- `docs/waves/ai-advisor-wave-plan.md`
- `docs/waves/archive/` – Consolidated Wave 9.3 planning documents:
  - `wave-9.3-option-a-plan.md` – Original implementation plan
  - `wave-9.3-option-a-complete.md` – Part 1 completion (analytics tabs)
  - `wave-9.3-option-a-part2-investment-transactions.md` – Part 2 planning
  - `wave-9.3-option-a-part2-complete.md` – Part 2 completion (transactions)
  - `wave-9.3-option-a-part2-phase3-transaction-form.md` – Transaction form details
  - `wave-9.3-option-a-part2-phase3-ux-fixes.md` – UX refinements
  - `wave-9.3-option-a-part3-skeleton-accounts.md` – Part 3 planning
  - `wave-9.3-option-a-part3-phase1-complete.md` – Part 3 backend completion
  - `wave-9.3-option-b-plan.md` – Option B original implementation plan

## 📈 runbooks (legacy)
- `docs/runbooks/ENABLE-DASHBOARD-REAL-DATA.md` – Legacy runbook awaiting migration to `ops/runbooks/archive/`

## 🗃️ root archives
- `docs/archive/README.md` – Archive index

---

### How to update this map
1. Add/edit documents inside the appropriate subject folder (create an `archive/` subfolder when deprecating content).
2. Append the new entry to the relevant section above with a short description.
3. Note the change in `docs/meta/documentation-strategy.md` and the audit log if it affects structure.
