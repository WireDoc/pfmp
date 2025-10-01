# PFMP - Personal Financial Management Platform

> ⚠️ **REBUILD NOTICE (Wave 0 – Documentation Alignment)**  
> Frontend orchestration layers (routing shell, onboarding wizard, protected layout, intelligence dashboards, alert UI) are currently being **reconstructed** after discovering higher-order components were missing. Backend APIs, data models, and several advanced leaf components (e.g., `SmartInvestmentRecommendations`, `RealBankAccountDashboard`) remain intact. This README now reflects the *current minimal runtime* plus the structured rebuild plan.

An AI-powered financial advisor platform designed for government employees and military members, providing personalized investment recommendations, portfolio management, and retirement planning with specialized TSP and government benefit integration.

## 🧪 Testing Documentation
Core manual testing flows live under `docs/testing/`:
- `docs/testing/alerts-advice-testing.md` – CURRENT simplified lifecycle (Alert → Advice:Proposed → Accept (creates Task) OR Dismiss)
- `docs/testing/advice-testing.md` – Legacy (Deprecated) lifecycle reference (Retained for historical context only)
- `docs/testing/tasks-testing.md` – Task CRUD, status workflow, provenance verification
- `docs/testing/README.md` – Index & conventions

Current Advice Lifecycle (Simplified):
```
Alert --[generate-advice]--> Advice (Proposed) --[accept]--> Advice (Accepted, task auto-created)
                                             \--[dismiss]--> Advice (Dismissed)
```
Legacy endpoints `/reject` & `/convert-to-task` now return 410 Gone.

Validator / Provenance:
- Acceptance creates a Task if none exists and backfills `SourceAdviceId` + `SourceType="Advice"`.
- `acceptedAt`, `dismissedAt`, `previousStatus`, `sourceAlertId`, `generationMethod`, and optional `sourceAlertSnapshot` enrich auditability.

Quick Start (User 1):
```powershell
# Generate generic portfolio advice
Invoke-RestMethod -Method POST http://localhost:5052/api/Advice/generate/1 | Select-Object adviceId,status

# Generate advice from alert 1
Invoke-RestMethod -Method POST http://localhost:5052/api/Alerts/1/generate-advice | Select-Object adviceId,sourceAlertId,status

# Accept advice (replace 123 with real id) – creates linked task automatically
Invoke-RestMethod -Method POST http://localhost:5052/api/Advice/123/accept | Select-Object adviceId,status,linkedTaskId

# Dismiss another proposed advice
Invoke-RestMethod -Method POST http://localhost:5052/api/Advice/124/dismiss | Select-Object adviceId,status

# List all advice (user 1)
Invoke-RestMethod http://localhost:5052/api/Advice/user/1 | Format-Table adviceId,status,linkedTaskId,sourceAlertId
```
See the dedicated guide (`alerts-advice-testing.md`) for deeper verification queries (SQL + troubleshooting).

### Recent Additions (Oct 2025)
- Simplified advice lifecycle (Removed Reject / Convert; added Dismiss terminal path)
- Provenance fields + idempotent acceptance backfill
- Health endpoint: `GET /health`
- Swagger UI (dev + optional prod via `Swagger:Always=true`): `/swagger`
- Custom endpoint listing: `GET /api/docs/endpoints`
- Build tooling: `build-all.bat`, `scripts/ci-build.ps1` (flags `-SkipFrontend`, `-SkipBackend`)
- Test integration + coverage collection (Cobertura)
- Frontend smoke script: `npm run smoke`
- Solution file `PFMP.sln`
- `BUILD.md` central build + script reference

## 🚀 Feature Snapshot (Current vs Rebuild)

### Currently Active (Verified 2025-09-27)
- .NET 9 backend: Users, Accounts, Goals, Income Sources, Alerts, Tasks, AI endpoints
- TSP allocation: Full 16-fund system with preset strategies
- Alerts backend lifecycle (Read / Dismissed / Active) + alert → task linkage
- Task management backend + status transitions
- Auth: Custom `AuthProvider` + development bypass (MSAL wrapper removed; direct `@azure/msal-browser` retained)
- Leaf frontend components still present: `SmartInvestmentRecommendations`, `RealBankAccountDashboard`, `ProtectedDashboardSections`

### Missing During Rebuild (To Be Recreated)
- Protected routing guard & routed layout shell
- Onboarding wizard (`WelcomeOnboardingFlow`) + `UserSetupContext`
- Setup progress tracker & resumable onboarding state UI
- Market dashboards (`LiveMarketDashboard`, `MarketIntelligencePanel`)
- `FinancialIntelligenceCenter` aggregation hub UI
- Frontend `SmartAlertsSystem` (visual + interaction layer)
- Auth UI suite: AuthHeader, SignInPrompt, UserProfileCard, AuthDebugPanel
- Dual-AI consensus pipeline surface (advisor + validator)
- Developer diagnostics / debug panel

### Strategic Additions Planned
- Dual-AI advisor abstraction (Primary: GPT-X future | Validator: Claude Sonnet) with consensus & policy rule evaluation
- Formal Wave-based modular reconstruction for auditability & controlled scope
- Feature flags for cost-bearing AI calls & experimental intelligence modules

### Rebuild Guiding Principles
1. Preserve validated backend + leaf logic; rebuild orchestration only
2. Narrow-scoped waves with explicit acceptance criteria
3. Introduce dual-AI abstraction before scaling AI usage costs
4. Defer heavy performance work (beyond existing chunks) to final wave
5. Maintain dev auth bypass until onboarding wizard stabilizes

## 🏗️ Architecture

### Technology Stack (Practical Current State)
- **Frontend Runtime**: React 19 + TypeScript + Vite (minimal shell while rebuilding)
- **UI Library**: MUI v7 (Grid v2 migration complete)
- **Backend**: .NET 9 Web API (stable multi-domain controllers)
- **Database**: PostgreSQL 15 (Synology NAS) – full schema intact
- **AI Architecture**: Prepared for Azure OpenAI + Anthropic; dual-AI validator pattern scheduled Wave 5
- **Infra Path**: Hybrid local dev → Azure (unchanged strategic direction)
- **Build Perf**: Manual Rollup `manualChunks` + selective lazy boundaries

### Frontend Layout Standard: MUI Grid v2 ✅
We enforce a single, consistent layout system using the **stable MUI Grid v2 API**.

Rationale:
- Removes legacy Grid / `Grid2` ambiguity
- Stronger typing via `size` prop object form
- Cleaner responsive intent (`size={{ xs: 12, md: 6 }}` vs scattered `item xs={12} md={6}`)
- Prevents regression to deprecated `item` + breakpoint prop usage

Allowed Pattern (Grid v2):
```tsx
import { Grid } from '@mui/material'

<Grid container spacing={3}>
  <Grid size={{ xs: 12, md: 6 }}>
    <AccountSummary />
  </Grid>
  <Grid size={{ xs: 12, md: 6 }}>
    <PerformancePanel />
  </Grid>
</Grid>
```

Forbidden (will fail ESLint):
```tsx
<Grid container>
  <Grid item xs={12} md={6}> ... </Grid>
</Grid>

<Grid2 container> ... </Grid2>
```

Migration Notes:
- All existing components have been normalized (2025-09-28)
- Any new code must use `size` (number or object). Acceptable: `size={12}` or `size={{ xs: 12, sm: 6 }}`
- Do NOT mix legacy `item` API with `size` in the same file

Enforcement:
- Custom ESLint rule (`eslint-plugin-local-grid-rules` inline config) blocks `<Grid item ...>` and direct breakpoint props (`xs=`, `md=`, etc.) on `Grid`
- Build pipeline updated so `npm run build` fails on violation

Exception Process:
- NONE. If a limitation arises (e.g., third-party snippet), refactor or wrap with compliant component

Future Enhancements:
- Add codemod script if external contributions introduce legacy patterns
- Consider storybook examples enforcing standard in visual docs

Last Validated: 2025-09-28 (no legacy patterns present)

### Development Environment
- **API**: .NET 9 Web API running on http://0.0.0.0:5052
- **Database**: PostgreSQL 15 on Synology NAS (192.168.1.108:5433)
- **Frontend**: React development server (to be configured)

## 🚦 Development Status

### Phase 1: MVP Foundation (✅ Complete)
- ✅ PostgreSQL 15 deployed on Synology NAS
- ✅ .NET 9 Web API project configured and tested
- ✅ Entity Framework Core with Npgsql provider
- ✅ Network accessibility configured (API on 0.0.0.0:5052)
- ✅ Git repository setup and GitHub integration
- ✅ React 19.1.1 + TypeScript frontend framework setup

### Phase 2: Core Portfolio Management (✅ 100% Complete)
- ✅ **Entity Framework Models**: Complete financial data models (11+ tables)
- ✅ **Database Schema**: Applied migrations, full PostgreSQL schema deployed
- ✅ **API Controllers**: CRUD operations for Users, Accounts, Goals, Income Sources
- ✅ **TSP Integration**: Complete 16-fund TSP allocation system
- ✅ **Manual Data Entry**: Government employee focused forms and interfaces
- ✅ **Frontend Components**: TSP allocation form with Material-UI, validation, preset strategies
- ✅ **End-to-End Testing**: Complete data flow verified from frontend to database
- ✅ **API-Frontend Integration**: Proxy configuration working, all endpoints accessible

### Phase 3: Task Management System (✅ 100% Complete)
- ✅ **Task System**: Complete CRUD operations for financial tasks
- ✅ **Task Types**: 8 specialized types (Rebalancing, Stock Purchase, Tax Loss Harvesting, etc.)
- ✅ **Task Status Workflow**: Pending → Accepted → In Progress → Completed/Dismissed
- ✅ **Priority System**: Low, Medium, High, Critical with AI-driven prioritization
- ✅ **Task Analytics**: Comprehensive completion tracking and performance metrics
- ✅ **AI Integration Ready**: Foundation for AI-powered task recommendations

### Phase 4: AI Integration & Alerts (✅ 100% Complete)
- ✅ **Azure OpenAI Service**: Full integration with GPT-4 for financial analysis
- ✅ **AI Task Intelligence**: 5 AI endpoints for task recommendations and prioritization
  - Task recommendations based on user profile
  - Priority suggestions for existing tasks
  - Task categorization and risk assessment
  - Portfolio analysis with actionable insights
  - Market alerts with AI-driven insights
- ✅ **Intelligent Alert System**: Complete lifecycle management
  - Granular state management (Read vs Dismissed vs Expired)
  - Direct task generation from actionable alerts
  - 7 alert categories with 4 severity levels
  - Comprehensive analytics and audit trails
- ✅ **Enhanced User Profiles**: Demographics-aware recommendations
  - Age-based investment strategies (22 vs 43 vs 28-year scenarios tested)
  - Service computation date for retirement planning
- ✅ **Comprehensive AI Testing**: Production-ready validation
  - Complete testing framework with 356-line methodology guide
  - 100% endpoint functionality validation with performance benchmarks
  - Intelligent fallback logic providing sophisticated recommendations without OpenAI
  - Sample account data: $45K, $260K, $110K portfolios across user demographics
  - Government employment type considerations
  - Setup wizard foundation for new user onboarding

### Phase 5: Market Data Integration & Real-Time Portfolio Valuation (✅ 100% Complete)
- ✅ **Market Data Service**: Real-time financial data integration with Financial Modeling Prep API
  - Stock prices, market indices (S&P 500, NASDAQ, DOW, Russell 2000, VIX)
  - TSP fund prices with government employee-specific proxy mapping
  - Economic indicators (Treasury yields, Fed rates, commodities, crypto)
  - Market status detection (OPEN, CLOSED, PRE_MARKET, AFTER_HOURS)
  - Intelligent fallback system providing realistic test data
- ✅ **Market-Aware AI Recommendations**: Enhanced AI service with real-time market integration
  - Portfolio analysis incorporating live market conditions and volatility
  - Market-based alert generation (high volatility, economic indicators, TSP movements)
  - Demographics integration with market context (age-based risk during market stress)
  - Government employee focus (TSP recommendations, federal employment considerations)
- ✅ **Real-Time Portfolio Valuation**: Comprehensive portfolio tracking and performance system
  - Live portfolio value calculation with current market prices ($45K test portfolio validated)
  - Account-level detailed valuations with holdings breakdown
  - Performance metrics with ROI calculations and allocation percentages
  - Complete net worth summary with asset categorization and income context
  - Tax-advantaged account categorization (taxable, tax-deferred, tax-free)
- ✅ **Professional API Suite**: 18+ production-ready endpoints across 3 controllers
  - Market Data API: 7 endpoints for real-time financial information
  - Enhanced AI API: 5 endpoints for market-aware recommendations
  - Portfolio API: 6 endpoints for comprehensive portfolio management
- ✅ **Production Authentication System**: Enterprise-grade Azure EntraID integration
  - Complete OIDC authentication with Microsoft Azure AD
  - JWT Bearer token authentication and validation
  - Personal Microsoft account integration (wiredoc@outlook.com)
  - Automated Azure AD App Registration setup via PowerShell
  - Developer bypass mode with comprehensive documentation
  - Database schema with authentication fields and user management
  - JSON serialization optimization with circular reference handling

### Complete TSP Fund Coverage
**16 Total Funds Implemented:**
- **Individual Funds**: G Fund, F Fund, C Fund, S Fund, I Fund
- **Lifecycle Funds**: L Income, L2030, L2035, L2040, L2045, L2050, L2055, L2060, L2065, L2070, L2075
- **Features**: Preset allocation strategies, real-time percentage validation, professional interface

### Current Government Employee Features
- ✅ Complete TSP allocation management (all 16 funds)
- ✅ VA disability income tracking and guaranteed income integration
- ✅ Emergency fund target setting and progress monitoring
- ✅ Cash account APR/APY optimization tracking
- ✅ Federal employee focused manual data entry systems

## 🛠️ Development Setup

### Prerequisites
- .NET 9 SDK
- Node.js 18+
- PostgreSQL 15
- Git

### PowerShell Development Guidelines
**Important**: When working with PowerShell, follow these guidelines to avoid terminal conflicts:

#### .NET Commands
- Always use fully qualified paths with `dotnet` commands in PowerShell
- Example: `dotnet run --project W:\pfmp\PFMP-API\PFMP-API.csproj --launch-profile http`

#### Running API Server in Isolated Terminal
To avoid terminal conflicts, start the API server in a separate PowerShell window:
```powershell
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd W:\pfmp\PFMP-API; dotnet run --launch-profile http" -WindowStyle Normal
```

**Important**: Before starting a new server instance:
- Manually close any existing PowerShell windows running the API server, OR
- Stop the process: `Get-Process -Name "PFMP-API" | Stop-Process -Force`

#### Running React Frontend in Isolated Terminal
```powershell
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd W:\pfmp\pfmp-frontend; npm run dev" -WindowStyle Normal
```

#### Service Management Best Practices
- Use isolated terminal windows to prevent targeting conflicts
- Always terminate existing services before starting new instances
- Monitor both frontend (port 3000) and API (port 5052) during development
- Use the batch file for reliable service startup
- **CRITICAL**: Restart backend service after any controller/model/DTO changes

### ⚠️ Service Restart Requirements
The following changes require a **complete backend service restart** to take effect:
- Controller method signature changes
- New DTO classes or model classes
- Entity Framework model changes (adding `[JsonIgnore]`, navigation properties)
- Program.cs configuration changes
- New API endpoints or route changes

**Always restart services using your batch file when making these types of changes!**

### Development Workflow
1. **Before rebuilding**: Always stop running services to avoid file locks
2. **Process termination**: Either close terminal windows manually or use PowerShell to stop processes
3. **Build verification**: Run `dotnet build` to confirm no file locks before starting services
4. **Migration workflow**: Stop services → Build → Apply migrations → Restart services

This command:
- Opens a new PowerShell window (`Start-Process powershell`)
- Keeps the window open after execution (`-NoExit`)
- Changes to the API directory and runs the server
- Uses normal window style for easy monitoring

### Backend Setup (.NET API)
```bash
cd PFMP-API
dotnet restore
dotnet build
dotnet run --launch-profile http
```
API will be available at: http://localhost:5052

### Database Setup
PostgreSQL database is running on Synology NAS:
- Host: 192.168.1.108:5433
- Database: pfmp_dev
- User: pfmp_user

### Frontend Setup (✅ Complete)
```bash
cd pfmp-frontend
npm install
npm run dev
```
React development server runs on: http://localhost:3000  
API proxy configured for `/api` requests → http://localhost:5052

### End-to-End Testing
The complete stack has been tested and verified:
- ✅ Frontend (React) ↔ API (ASP.NET Core) ↔ Database (PostgreSQL)
- ✅ User CRUD operations working through all layers
- ✅ Proxy configuration routing requests correctly
- ✅ Database migrations applied successfully

## 📝 Project Documentation

- `pfmp.txt` - Comprehensive project plan and technical specifications
- `pfmp-log.md` - Detailed development session logs and progress tracking
- `PFMP-API/` - .NET 9 Web API backend application
- `docs/AI-ADVISOR-WAVE-PLAN.md` - Dual-AI advisor architecture & phased wave roadmap (Waves 1–7)

## 🤝 Contributing

This is a personal project currently in active development. The codebase is being built incrementally following a structured 4-phase development plan.

## 📄 License

Private project - All rights reserved

## 🧪 Development Test Users

The system includes 4 pre-configured test users for development and testing purposes. These users have `BypassAuthentication = true` and `IsTestAccount = true` for development workflow.

### Test User Profiles

#### 1. Sarah Johnson (UserId: 1) - Young Federal Employee
- **Age**: 22 years old (born 2003)
- **Employment**: Federal (GS-07, Department of Defense)
- **Service**: 1 year (Service Computation Date: 2024)
- **Retirement System**: FERS
- **Annual Income**: $42,000
- **Risk Tolerance**: 8/10 (High - appropriate for young age)
- **Retirement Goal**: $1.5M by age 62 (2065)
- **Profile Status**: 100% Complete
- **Use Case**: Testing aggressive investment strategies, long-term growth recommendations

#### 2. Michael Smith (UserId: 2) - Mid-Career Federal Employee
- **Age**: 43 years old (born 1982) 
- **Employment**: Federal (GS-13, Department of Veterans Affairs)
- **Service**: 15 years (Service Computation Date: 2010)
- **Retirement System**: FERS
- **Annual Income**: $92,000
- **VA Disability**: 30% ($524.31/month guaranteed income)
- **Risk Tolerance**: 6/10 (Moderate - appropriate for mid-career)
- **Retirement Goal**: $2.2M by age 60 (2042)
- **Profile Status**: 100% Complete
- **Use Case**: Testing balanced strategies, VA disability integration, catch-up contributions

#### 3. Jessica Rodriguez (UserId: 3) - Military Member
- **Age**: 28 years old (born 1997)
- **Employment**: Military (E-6, U.S. Air Force)
- **Service**: 8 years (Service Computation Date: 2017)
- **Retirement System**: Military
- **Annual Income**: $65,000
- **Risk Tolerance**: 7/10 (Moderate-High)
- **Retirement Goal**: $1.8M by 20-year retirement (2037)
- **Profile Status**: 100% Complete
- **Use Case**: Testing military-specific features, TSP with military benefits

#### 4. David Wilson (UserId: 4) - New User (Incomplete Setup)
- **Age**: 26 years old (born 1999)
- **Employment**: Federal (GS-09)
- **Annual Income**: $55,000
- **Profile Status**: 25% Complete (demographics only)
- **Setup Steps Completed**: ["demographics"]
- **Use Case**: Testing setup wizard, new user onboarding flows

### Testing Guidelines

**Authentication Bypass**: All test users have `BypassAuthentication = true` - no login required during development.

**API Testing Examples**:
```bash
# Get young employee recommendations
GET /api/tasks/ai/recommendations?userId=1

# Get mid-career portfolio analysis  
GET /api/tasks/ai/portfolio-analysis?userId=2

# Get military member alerts
GET /api/alerts?userId=3&isActive=true

# Test setup wizard with incomplete user
GET /api/profile/setup/progress?userId=4
```

**Production Transition**: Set `Development:BypassAuthentication: false` in configuration to enable real authentication. Test accounts will be filtered out by `IsTestAccount = true`.

## 👤 ProfileController API

### Profile Management Endpoints
```bash
# Get complete user profile with calculated demographics
GET /api/profile/{userId}

# Update user profile information
PUT /api/profile/{userId}
```

### Setup Wizard Endpoints
```bash
# Get setup progress and next steps
GET /api/profile/setup/progress/{userId}

# Complete a setup step
POST /api/profile/setup/complete-step/{userId}
Body: { "stepName": "employment" }

# Reset setup progress (testing/support)
POST /api/profile/setup/reset/{userId}
```

### Example Profile Response
```json
{
  "userId": 1,
  "firstName": "Sarah",
  "lastName": "Johnson", 
  "age": 22,
  "employmentType": "Federal",
  "payGrade": "GS-07",
  "annualIncome": 42000.00,
  "yearsOfService": "1.0",
  "profileSetupComplete": true,
  "setupProgressPercentage": 100,
  "setupStepsCompleted": ["demographics", "tsp", "goals", "risk-assessment"]
}
```

---

## 🧭 Rebuild Waves Overview

| Wave | Focus | Key Deliverables |
|------|-------|------------------|
| 0 | Documentation Alignment | Updated README, log entry, wave plan doc, migration addendum |
| 1 | Routing & Protection | React Router setup, `ProtectedRoute`, layout frame, nav skeleton, suspense boundaries |
| 2 | User Setup Layer | `UserSetupContext`, multi-step onboarding wizard, progress persistence, resumable steps |
| 3 | Auth & Profile UX | AuthHeader, SignInPrompt, ProfileCard, AuthDebugPanel, Dev diagnostics panel |
| 4 | Intelligence Dashboards | Market dashboards, FinancialIntelligenceCenter, SmartAlertsSystem UI, alert-task UX integration |
| 5 | Dual-AI Pipeline | Advisor + Validator abstraction, consensus scoring, policy rule evaluation hooks |
| 6 | Performance & A11y | Bundle audit, deeper code splitting, accessibility pass, test harness expansion |

Status: Wave 0 in progress – implementation code changes deliberately deferred until documentation and planning artifacts are committed for traceability.

**Last Updated**: September 27, 2025  
**Current Version**: v0.6.1-alpha (Rebuild Wave 0)  
**Rebuild Mode**: Frontend orchestration reconstruction (backend stable)

**🎯 Immediate Focus**: Complete Wave 0 docs → start Wave 1 (routing & shell reintroduction)