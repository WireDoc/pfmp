# Wave 17: Dashboard Expansion & Profile Management

_Created: 2026-04-01_  
_Status: Complete_

## Overview

Build out the 8 placeholder dashboard pages into fully functional views. The primary driver is enabling users to **view and edit all onboarding data from the dashboard** — without going back through the onboarding wizard — so the AI financial context can be validated and refined before expanding AI features further.

This wave also introduces **new dashboard capabilities** that complete the personal financial management experience: a financial health score, cash flow visualization, a quick-action command bar, and document/note attachments.

**Prerequisite**: Wave 16 (OpenRouter AI Overhaul) — AI context builder must be complete so edits here directly affect AI analysis quality.

---

## Why Now?

1. **AI validation bottleneck** — Wave 16 built a comprehensive AI context from 14 data sections. Editing that data currently requires raw DB queries or re-running onboarding. ProfileView unlocks self-service editing.
2. **8 placeholder pages** — Half the sidebar leads to "coming soon" stubs. Users who explore beyond the main dashboard hit dead ends.
3. **No profile editing post-onboarding** — Once onboarding completes, the only way to update household info, risk tolerance, income, tax profile, insurance, or obligations is via API calls. This is the most requested missing feature.
4. **Task and Insights views are full-page expansions** of existing dashboard panels that already work — low effort, high polish.

---

## Scope

### Part A: Profile Management (Priority 1)

The ProfileView at `/dashboard/profile` becomes a tabbed editor for all onboarding data sections.

| Tab | Data Edited | Source Table(s) |
|-----|------------|-----------------|
| **Household** | Name, marital status, dependents, DOB, agency, pay grade, employment type, retirement system, SCD, VA disability | `Users` |
| **Risk & Goals** | Risk tolerance (1-10), retirement target $, monthly passive income target, retirement date, emergency fund target, liquidity buffer months | `Users` + `Goals` |
| **Income** | All income streams (salary, VA disability, pensions, dividends, rental, etc.) with type, frequency, amount, reliability, tax flags | `IncomeSources` |
| **Tax Profile** | Filing status, state, marginal/effective rates, withholding %, CPA flag, expected refund/payment | `FinancialProfileTaxInfo` |
| **Expenses** | Monthly expense budgets by category with amount and notes | `FinancialProfileExpenseBudgets` |
| **Insurance** | All policies — type, carrier, coverage, premium, deductible, adequacy, dates | `FinancialProfileInsurancePolicies` |
| **Long-Term Obligations** | Major future expenses — name, type, target date, estimated cost, funding status, critical flag | `FinancialProfileLongTermObligations` |
| **Benefits** | Government benefits, employer programs (read-only display of existing data) | `Users` (benefit fields) |

**UX Design:**
- Material UI Tabs across the top (scrollable on mobile)
- Each tab renders an inline edit form using the same field layout as onboarding section forms
- Save button per section (not page-level) — partial saves allowed
- Success/error snackbar feedback
- "Last updated" timestamp per section
- Breadcrumb: Dashboard › Profile › [Tab Name]

### Part B: Accounts Hub (Priority 2)

Replace the AccountsView placeholder with a unified accounts page.

| Feature | Description |
|---------|-------------|
| **Grouped account list** | Cash accounts, investment accounts, TSP, properties, liabilities — each in a collapsible section |
| **Summary cards** | Total assets, total liabilities, net worth at the top |
| **Quick actions** | Add account, import CSV, connect via Plaid — per section |
| **Account cards** | Name, institution, balance, sync status badge, last updated, click to navigate to detail |
| **Search/filter** | Filter by account type, institution, or name |

### Part C: Insights Full Page (Priority 3)

Expand InsightsView from placeholder to a full AI insights hub.

| Feature | Description |
|---------|-------------|
| **AI analysis cards** | One card per analysis type (Cash, Portfolio, TSP, Risk, Full) with latest result |
| **Run analysis button** | Trigger on-demand AI analysis for any type |
| **History timeline** | Past analyses with date, agreement score, expand to view full text |
| **Advice feed** | All Advice records (Proposed, Accepted, Dismissed) with accept/dismiss actions |
| **Confidence indicators** | Agreement score badge + model names used |

### Part D: Actions Hub — Unified Alert / Advice / Task Management (Priority 4)

Rename `/dashboard/tasks` → `/dashboard/actions` and expand TasksView into a one-stop hub for the full **Alert → Advice → Task** pipeline. Currently alerts and advice are only visible as compact summaries (top 5) on the main dashboard, with no way to see dismissed items, history, or manage the full lifecycle from one place.

#### Completed (Wave 17E — commit 44ad9a1)
The Alert → Advice → Task workflow enforcement is done:
- Dashboard.tsx rewritten: `handleGenerateAdvice`, `handleAcceptAdvice`, `handleDismissAdvice` replace direct task creation
- AlertsPanel shows "Get AI Advice" button or linked advice status chip per alert
- AdvicePanel shows Accept/Dismiss buttons for Proposed advice; status chips for Accepted/Dismissed
- Old bypass path (Alert → Task direct) removed; deprecated endpoint returns 410
- Integration + unit tests updated (375 passing)

#### Remaining: ActionsView (replaces TasksView)

**Three-tab layout:**

| Tab | Content | Filters |
|-----|---------|---------|
| **Alerts** | All user alerts (not capped at 5). Each shows linked advice status. "Get AI Advice" for actionable alerts without advice. | Active / Read / Dismissed / Expired; severity; category |
| **Advice** | All advice items with Accept/Dismiss for Proposed. Shows linked alert context and linked task ID. | Proposed / Accepted / Dismissed; theme; confidence range |
| **Tasks** | Current TasksView content + working progress slider (ported from Dashboard). Status tabs. Create Task dialog. | Pending / InProgress / Completed / Dismissed; priority; type; due date |

**Key changes:**
- Rename `TasksView.tsx` → `ActionsView.tsx`, update route from `tasks` to `actions`
- Extract `TaskProgressSlider` from Dashboard's TasksPanel into a shared component
- Add "View all →" links from each dashboard summary panel to the corresponding Actions tab
- Remove advice accept/dismiss from InsightsView (avoid duplicate UI for same action)
- Alert tab calls `GET /api/alerts?userId={id}` with `isActive`, `isRead`, `isDismissed` filters
- Advice tab calls `GET /api/Advice/user/{id}?status={filter}&includeDismissed=true`
- Sidebar nav label changes from "Tasks" to "Actions"

**UX notes:**
- Summary chips at top: "3 active alerts · 2 proposed advice · 5 pending tasks"
- Tab badges show count of actionable items (e.g., alert count, proposed advice count)
- Breadcrumb: Dashboard › Actions › [Tab Name]
- Deep-link support: `/dashboard/actions?tab=advice` opens directly to Advice tab

### Part E: Settings Enhancement (Priority 5)

The SettingsView already has a Connected Accounts section. Add the remaining sections.

| Section | Features |
|---------|----------|
| **Connected Accounts** | Already links to `/dashboard/settings/connections` ✅ |
| **Notification Preferences** | Toggle email alerts, push notifications, rebalancing alerts; set rebalancing threshold % |
| **Display Preferences** | Currency format, date format, dashboard default tab |
| **Account Security** | Password change (for non-SSO), active sessions, last login info |
| **Data Management** | Export all data (CSV), delete account (with confirmation) |

### Part F: Help Page (Priority 6)

Enhance HelpView beyond the current static content.

| Feature | Description |
|---------|-------------|
| **Getting Started guide** | Step-by-step with progress indicators tied to actual completion |
| **FAQ accordion** | Common questions about onboarding, AI analysis, Plaid, TSP |
| **Keyboard shortcuts** | Quick reference card |
| **Version info** | Current app version from VERSION file |
| **Support contact** | Email + link to documentation |

### Part G: Dashboard Overview Panel (Priority 7)

Replace the OverviewPanel "coming soon" sections with real content.

| Widget | Description |
|--------|-------------|
| **Financial Health Score** | 0-100 composite score based on: emergency fund adequacy, debt-to-income ratio, savings rate, insurance coverage, retirement readiness. Displayed as a circular gauge with color (red/yellow/green). |
| **Monthly Cash Flow** | Income vs. expenses bar chart (from IncomeSources + ExpenseBudgets). Net surplus/deficit prominently displayed. |
| **Upcoming Obligations** | Next 3 long-term obligations by target date with funding progress bars |
| **Quick Actions Bar** | Top-of-dashboard action strip: "Run AI Analysis", "Add Account", "Log Expense", "Update TSP" — 4 one-click shortcuts |

### Part H: New Features (Suggested Additions)

These are features not in any placeholder but would significantly improve the dashboard experience:

#### H1: Financial Health Score Widget
A computed 0-100 score visible on the main dashboard, weighting:
- Emergency fund coverage (months of expenses saved) — 20%
- Debt-to-income ratio — 20%
- Retirement savings rate vs. target — 20%
- Insurance coverage adequacy — 15%
- Investment diversification — 15%
- Goal progress (on-track vs behind) — 10%

Backend: New `GET /api/dashboard/{userId}/health-score` endpoint computing from existing data.
Frontend: Circular progress gauge on OverviewPanel + detailed breakdown on ProfileView.

#### H2: Monthly Cash Flow Visualization
- Stacked bar chart: Income sources (green) vs. expense categories (red)
- Net cash flow line overlaid
- 6-month trailing view from actual data
- Projected forward 3 months using averages

Backend: New `GET /api/dashboard/{userId}/cash-flow-summary` endpoint.
Frontend: Chart component using Recharts (already in dependency tree) or D3.

#### H3: Command Palette / Quick Actions
A keyboard-shortcut-triggered command bar (Ctrl+K) that allows:
- Navigate to any page
- Run AI analysis
- Add account/expense/income
- Search accounts by name
- Jump to specific settings

Frontend only — uses existing routes and API endpoints.

#### H4: Document & Note Attachments
Allow users to attach notes or documents to any entity:
- "Note to self" on accounts, goals, properties
- Upload receipts or statements (stored as blobs)
- AI can reference notes in context ("User noted: planning to refinance in Q3")

Backend: New `UserNote` model with polymorphic foreign key.
Frontend: Note icon + popover on each entity card.

#### H5: Goal Tracking Dashboard
Dedicated goal visualization:
- Progress bars per goal (current vs. target)
- Monthly contribution tracking
- Projected completion date based on current savings rate
- "What-if" slider: "If I save $X more per month, I'll reach my goal by Y"

Uses existing `Goals` table data. New `GET /api/goals/{userId}/projections` endpoint.

---

## Acceptance Criteria

### Must-Have (Ship-blocking)
1. ProfileView displays all onboarding data in organized tabs
2. Each ProfileView tab supports inline editing with save/cancel
3. Profile edits persist to database and are reflected in AI context on next analysis
4. AccountsView shows all account types grouped with balances and navigation
5. InsightsView displays AI analysis results with run-on-demand capability
6. ActionsView (formerly TasksView) shows alerts, advice, and tasks with full lifecycle management
7. Alert → Advice → Task workflow enforced in dashboard (no direct alert-to-task bypass) ✅
8. All new views have corresponding Vitest test files
9. All new/modified API endpoints have xUnit test coverage
10. No regressions in existing 126 backend tests

### Should-Have (High value, ship if time allows)
11. Financial Health Score widget on dashboard overview
12. Monthly cash flow summary chart
13. Quick Actions bar on dashboard
14. HelpView FAQ accordion with real content
15. SettingsView Notification Preferences section is functional

### Nice-to-Have (Future-proof, can defer)
16. Command palette (Ctrl+K)
17. Document/note attachments
18. Goal projection "what-if" calculator
19. Data export (CSV) from SettingsView
20. Keyboard shortcut reference card

---

## Out of Scope

- Onboarding wizard changes (wizard stays as-is for first-time users)
- New data collection beyond existing model fields (no new DB tables except UserNote if H4 ships)
- Mobile app or PWA changes beyond responsive layout
- Real-time collaboration or multi-user editing
- AI chatbot (Wave 18+)
- Crypto integration (Wave 13)
- Spending analysis from transactions (Wave 14)

---

## Implementation Order

```
Phase 1 — Profile Management (Part A)
  └─ ProfileView tabs, edit forms, save endpoints
  └─ Reuse onboarding section form components where possible

Phase 2 — Accounts & Actions Hub (Parts B + D)
  └─ AccountsView grouped list with navigation
  └─ ActionsView: rename TasksView, add Alerts + Advice tabs
  └─ Extract TaskProgressSlider shared component
  └─ Add "View all" links from dashboard panels → Actions tabs
  └─ Remove duplicate advice management from InsightsView

Phase 3 — Insights & Overview (Parts C + G)
  └─ InsightsView with AI analysis cards and history
  └─ OverviewPanel health score + cash flow widgets

Phase 4 — Settings & Help (Parts E + F)
  └─ Settings notification/display preferences
  └─ HelpView FAQ and version info

Phase 5 — New Features (Part H, as time allows)
  └─ Health Score endpoint + gauge
  └─ Cash flow summary
  └─ Quick actions bar
  └─ Command palette
```

---

## Technical Notes

### Frontend Patterns
- All views use Material UI components exclusively (no custom CSS width hacks)
- Tabs: `<Tabs>` + `<TabPanel>` with URL-synced tab state via search params
- Forms: Controlled inputs with React state, field-level validation
- API calls: Use existing service layer (`accountsApi`, `cashAccountsApi`, etc.)
- New API services: `profileApi`, `insightsApi` as needed
- Test files mirror source: `src/tests/views/ProfileView.test.tsx`

### Backend Patterns
- Profile update endpoints: `PUT /api/users/{userId}/profile/{section}` — one per tab
- Reuse existing controllers where endpoints already exist (IncomeSources, Goals, etc.)
- New endpoints only where current API doesn't cover the edit case
- All endpoints require auth (dev bypass for testing)

### Reuse Opportunities
- Onboarding section forms (`HouseholdSectionForm`, `IncomeSectionForm`, etc.) can be extracted into shared components used by both onboarding and profile editing
- Dashboard panels (AlertsPanel, TasksPanel, InsightsPanel) already render the data — full-page views add filtering, sorting, and history

---

## Metrics

| Metric | Target | Actual |
|--------|--------|--------|
| Placeholder pages remaining | 0 (currently 8) | **0** ✅ |
| Profile sections editable | 8 of 8 | **8 of 8** ✅ |
| Backend test count | 140+ (currently 126) | **140** ✅ |
| Frontend test coverage | New test file per new/modified view | **71 test files, 485 tests** ✅ |
| API endpoints added | ~5-8 new | **6 new** ✅ |
| Build errors introduced | 0 | **0** ✅ |

---

_Owner: WireDoc_  
_Version: 1.1_

---

## Changelog

| Date | Version | Changes |
|------|---------|---------|
| 2026-04-01 | 1.0 | Initial wave plan |
| 2026-04-08 | 1.1 | Part D rewritten: TasksView → ActionsView (unified Alert/Advice/Task hub). Documented completed Alert → Advice → Task workflow enforcement (commit 44ad9a1). Updated acceptance criteria #6-7, implementation Phase 2, and Should-Have #15. |
| 2026-04-10 | 1.2 | Wave 17 COMPLETE. PRs #2-5 merged. All Must-Have (#1-10), Should-Have (#11-15), and Nice-to-Have (#16 command palette, #18 goal projections, #19 data export, #20 shortcuts) delivered. 625 total tests (485 FE + 140 BE), 0 failures. Deferred: #17 document attachments (needs new DB table). |
