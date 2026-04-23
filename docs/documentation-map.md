# PFMP Documentation Map

_Last updated: 2026-04-01_

This index lists every active document under `docs/` following the subject-first taxonomy. Paths are relative to the repository root (`C:\pfmp`). Archive folders capture retired or historical material.

---

## 📁 api
- `docs/api/reference.md` – REST endpoints and payloads
- `docs/api/dashboard-contract.md` – Dashboard data contract and wiring
- `docs/api/postman.md` – How to import and use the Postman collection and environment

## 🔐 auth
- `docs/auth/overview.md` – Authentication architecture summary
- `docs/auth/getting-started.md` – Local + Azure setup quick start
- `docs/auth/implementation-complete.md` – Production hardening checklist
- `docs/auth/manual-azure-setup.md` – Manual Azure portal walkthrough
- `docs/auth/azure-auth-explained.md` – Deep dive on Azure token flows
- `docs/auth/azure-manual-config.md` – Configuration reference values
- `docs/auth/personal-account-setup.md` – Personal Microsoft account invitation flow
- `docs/auth/fix-redirect-uri.md` – Troubleshooting redirect URI mismatches

## 🗄️ data
- `docs/data/database-tools-setup.md` – Local tooling and connection tips
- `docs/data/import-formats/cash-accounts.md` – CSV import format specification
- `docs/data/runbooks/database-backup.md` – Backup runbook (PostgreSQL + Synology)

## 🛠️ dev
- `docs/dev/build.md` – Full-stack build instructions
- `docs/dev/library-version-guidelines.md` – Supported library versions and upgrade policy
- `docs/dev/storybook-setup.md` – Storybook scaffold and usage notes
- `docs/dev/mcp-integration.md` – MCP PostgreSQL server setup and tools
- `docs/dev/mcp-server-project-spec.md` – Original MCP server specification
- `docs/dev/accessibility-guide.md` – Accessibility standards
- `docs/dev/ai-analysis-implementation-status.md` – AI analysis status
- `docs/dev/ai-architecture-qa-response.md` – AI architecture Q&A
- `docs/dev/ai-model-recommendation.md` – AI model selection rationale
- `docs/dev/ai-model-switching.md` – How to switch AI models
- `docs/dev/roadmap-updates-nov-1-2025.md` – November 2025 roadmap updates
- `docs/dev/signalr-rollout-plan.md` – SignalR real-time updates plan

## 📘 guides
- `docs/guides/QUICK-START.md` – Environment preparation and first run
- `docs/guides/DEV-STANDARDS.md` – Coding conventions and lint rules
- `docs/guides/FRONTEND-BACKEND-GUIDE.md` – Architecture overview by layer
- `docs/guides/DATA-&-DB.md` – Database workflows, migrations, and psql usage
- `docs/guides/TROUBLESHOOTING-&-REFERENCE.md` – Common fixes and command glossary

## 🕰️ history
- `docs/history/roadmap.md` – **Product roadmap** with wave status (keep current!)
- `docs/history/changelog.md` – Release history and notable changes

## 🧭 meta
- `docs/meta/documentation-strategy.md` – **Documentation maintenance guide** (read this!)
- `docs/meta/audit/docs-audit-2025-10-08.md` – Audit log of documentation moves
- `docs/meta/pfmp-overview.txt` – Legacy project overview text

## 📝 notes
- `docs/notes/AI-TESTING-GUIDE.md` – AI testing procedures
- `docs/notes/AI-TESTING-RESULTS.md` – AI testing results

## 🧪 testing
- `docs/testing/README.md` – Testing index with backend/frontend guides
- `docs/testing/plaid-custom-users.md` – Custom Plaid sandbox user configurations (investments + liabilities)
- `docs/testing/wave-12-5-testing-guide.md` – Wave 12.5 unified Plaid frontend testing checklist
- `docs/testing/alerts-advice-testing.md` – Alert/advice flow testing
- `docs/testing/advice-testing.md` – Advice generation testing
- `docs/testing/dashboard-msw-handlers.md` – MSW mock handlers
- `docs/testing/dashboard-wave4-manual-checks.md` – Wave 4 manual test checklist
- `docs/testing/onboarding-persistence.md` – Onboarding QA checklist
- `docs/testing/onboarding-testing.md` – Onboarding test procedures
- `docs/testing/tasks-testing.md` – Task management testing
- `docs/testing/visual-regression-plan.md` – Visual regression strategy
- `docs/testing/archive/wave-9.3-option-a-endpoint-tests.md` – Wave 9.3 endpoint tests

## 🧾 scripts
- `docs/scripts/dev-scripts.md` – Catalog of automation scripts

## 🌊 waves

### Active Wave Plans
- `docs/waves/wave-17-dashboard-expansion.md` – **Wave 17 Complete** (Apr 2026) - Dashboard Expansion & Profile Management
- `docs/waves/wave-18-federal-benefits.md` – **Wave 18 Complete** (Apr 2026) - Federal Benefits Deep Dive & FERS Retirement Projector
- `docs/waves/wave-19-retirement-planning-advanced.md` – **Wave 19 Planned** - Advanced Retirement Planning (TSP Roth/Trad, Tax Modeling, COLA)
- `docs/waves/wave-20-fehb-les-enhancements.md` – **Wave 20 Complete** - FEHB Auto-Fill & LES Enhancements
- `docs/waves/wave-21-estate-planning.md` – **Wave 21 Complete** - Estate Planning & Beneficiary Tracking
- `docs/waves/wave-11-account-linking-strategy.md` – Wave 11-13: Full account linking strategy reference
- `docs/waves/wave-13-crypto-exchanges.md` – **Wave 13 Planning** (Apr 2026) – Kraken + Binance.US read-only API integration; CoinGecko pricing; new `CryptoHolding`/`CryptoTransaction`/`ExchangeConnection` tables; phased rollout (P1 Kraken → P2 Binance.US → P3 staking/tax lots → P4 AI context)
- Wave 14: Spending Analysis – Documented in `docs/history/roadmap.md`

### Wave Completion Summaries
- `docs/waves/wave-16-openrouter-ai-overhaul.md` – **Wave 16 Complete** (Mar 2026) - OpenRouter AI Overhaul & Financial Context
- `docs/waves/wave-15-complete.md` – **Wave 15 Complete** (Mar 2026) - Property Management & Automated Valuation
- `docs/waves/wave-12-complete.md` – **Wave 12 + 12.5 Complete** (Jan–Mar 2026) - Brokerage, Investment & Unified Plaid Linking
- `docs/waves/wave-11-complete.md` – **Wave 11 Complete** (Dec 2025) - Plaid Bank Account Linking
- `docs/waves/wave-10-complete.md` – **Wave 10 Complete** (Dec 2025) - Background Jobs & Automation
- `docs/waves/wave-9.3-complete-summary.md` – **Wave 9.3 Complete** (Dec 2025) - All 4 options
- `docs/waves/wave-9.3-account-detail-redesign-plan.md` – **Wave 9.3 / 9.3.5 / 9.3.6 / 9.3.7 plan + status** (Apr 2026) - Phases 1–6 complete (money trail, $CASH→CurrentBalance, cash CRUD parity); 9.3.7 polish ✅ except E2E smoke
- `docs/waves/wave-9.3-option-a-all-parts-complete.md` – Option A: Investment Metrics
- `docs/waves/wave-9.3-option-b-complete.md` – Option B: Loan & Credit Card Views
- `docs/waves/wave-9.3-option-c-complete.md` – Option C: Cash Account UX
- `docs/waves/wave-9.3-option-d-complete.md` – Option D: D3 Visualizations
- `docs/waves/wave-9.2-complete.md` – Wave 9.2: Market Data Integration
- `docs/waves/wave-8.1-implementation-summary.md` – Wave 8.1: Account Detail Modal

### Reference Documents
- `docs/waves/wave-15-property-management.md` – Wave 15 original plan (superseded by wave-15-complete.md)
- `docs/waves/WAVE-5-REAL-ESTATE-ENRICHMENT.md` – Original real estate enrichment plan (superseded by Wave 15)
- `docs/waves/wave-12-plan.md` – Wave 12 original plan (superseded by wave-12-complete.md)
- `docs/waves/wave-12-5-unified-plaid.md` – Wave 12.5 original plan (superseded by wave-12-complete.md)
- `docs/waves/REBUILD-WAVE-PLAN.md` – Original wave rebuild plan
- `docs/waves/MIGRATION_STATUS.md` – Migration tracking
- `docs/waves/SESSION_COMPLETE.md` – Session completion tracking
- `docs/waves/WAVE-0-COMPLETION.md` through `WAVE-6-*.md` – Early wave docs
- `docs/waves/PHASE-2-DATA-AGGREGATION.md` – Phase 2 complete plan
- `docs/waves/ai-advisor-wave-plan.md` – AI advisor architecture

### Archived Wave Documents
Located in `docs/waves/archive/`:
- wave-9.2-fix-plan.md, wave-9.2-issues-analysis.md
- wave-9.3-*-plan.md (all option planning docs)
- wave-9.3-*-complete.md (intermediate completion docs)
- wave-9.3-calculated-balance-fix.md, wave-9.3-next-steps.md

---

## 🗃️ archive

### `docs/archive/dev/`
- wave7_4_enhanced_ai_context.md – Wave 7.4 AI context implementation
- wave7_4_frontend_changes.md – Wave 7.4 frontend form updates

### `docs/archive/notes/`
- PHASE3_COMPLETION_NOTES.md, PHASE4_COMPLETION_NOTES.md
- PHASE5_AUTHENTICATION_COMPLETION_NOTES.md
- PHASE5_COMPLETION_NOTES.md, PHASE5_SUMMARY.md
- pfmp-log-2025.md – Early build log (Sept-Oct 2025)
- README.md – Archive index

### `docs/archive/runbooks/`
- ENABLE-DASHBOARD-REAL-DATA.md – Wave 4 dashboard feature flags (outdated)

---

## How to Update This Map

1. **When adding a new document**: Add an entry to the appropriate section above
2. **When archiving a document**: Move entry to the Archive section, update file path
3. **When completing a wave**: 
   - Add completion summary to "Wave Completion Summaries"
   - Move planning docs to "Archived Wave Documents"
4. **Always update the "Last updated" date** at the top

See `docs/meta/documentation-strategy.md` for the complete maintenance workflow.
