# PFMP - Personal Financial Management Platform

An AI-powered financial advisor platform designed for government employees and military members, providing personalized investment recommendations, portfolio management, and retirement planning with specialized TSP and government benefit integration.

## 🚀 Features

### AI-Powered Intelligence
- **Azure OpenAI Integration**: GPT-4 powered recommendations and analysis
- **Age-Based Recommendations**: Tailored advice for different career stages (21-year-old vs 43-year-old scenarios)
- **Demographics-Aware**: Considers employment type, service computation date, and retirement timeline
- **Smart Task Generation**: Converts actionable alerts into trackable financial tasks
- **Portfolio Analysis**: AI-driven insights based on individual user profiles

### Government Employee Focused
- **Complete TSP Management**: All 16 funds (G, F, C, S, I + 11 Lifecycle funds)
- **Service Computation Date**: OPM retirement eligibility calculations
- **VA Disability Integration**: Guaranteed income tracking for disabled veterans
- **Federal/Military Support**: Specialized features for FERS, CSRS, and military retirement systems
- **Pay Grade Integration**: GS, O, E, and other federal pay systems

### Intelligent Alert System
- **Granular Alert Lifecycle**: Created → Read → Dismissed (reversible) → Expired
- **Task Integration**: Convert actionable alerts directly into trackable tasks
- **Category System**: Portfolio, Goal, Transaction, Performance, Security, Tax, Rebalancing
- **Severity Levels**: Low, Medium, High, Critical with appropriate task prioritization

## 🏗️ Architecture

### Technology Stack
- **Frontend**: React 18 + TypeScript, Vite, Material-UI
- **Backend**: .NET 9 Web API, Entity Framework Core, SignalR
- **Database**: PostgreSQL 15 with Redis caching
- **AI Services**: Azure OpenAI Service (GPT-5) + Anthropic Claude API
- **Infrastructure**: Azure App Service, Static Web Apps, Key Vault
- **Development**: Windows + Synology NAS for local development

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

### Phase 4: AI Integration & Alerts (✅ 98% Complete)
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

---

**Last Updated**: September 24, 2025  
**Current Version**: v0.4.0-alpha  
**Development Phase**: Phase 4 - AI Integration & Enhanced Profiles (✅ 95% Complete)