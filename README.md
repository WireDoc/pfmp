# PFMP - Personal Financial Management Platform

An AI-powered financial advisor platform that provides daily market analysis, investment recommendations, and comprehensive portfolio management capabilities.

## 🚀 Features

- **AI-Powered Analysis**: Hybrid AI approach using OpenAI GPT-5 and Anthropic Claude 4 Sonnet
- **Portfolio Management**: Track investments, analyze performance, and get personalized recommendations
- **Market Intelligence**: Real-time market data integration with technical analysis
- **Risk Management**: Advanced risk assessment and portfolio optimization
- **Tax Optimization**: Smart tax planning and loss harvesting recommendations
- **Mobile Access**: Responsive web design for mobile and desktop access
- **Memory & Learning**: AI system learns from user preferences and market outcomes

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
- ✅ **Entity Framework Models**: Complete financial data models (11 tables)
- ✅ **Database Schema**: Applied migrations, full PostgreSQL schema deployed
- ✅ **API Controllers**: CRUD operations for Users, Accounts, Goals, Income Sources
- ✅ **TSP Integration**: Complete 16-fund TSP allocation system
- ✅ **Manual Data Entry**: Government employee focused forms and interfaces
- ✅ **Frontend Components**: TSP allocation form with Material-UI, validation, preset strategies
- ✅ **End-to-End Testing**: Complete data flow verified from frontend to database
- ✅ **API-Frontend Integration**: Proxy configuration working, all endpoints accessible

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

---

**Last Updated**: September 21, 2025  
**Current Version**: v0.3.0-alpha  
**Development Phase**: Phase 2 - Core Portfolio Management (✅ 100% Complete)