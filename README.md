# PFMP - Personal Financial Management Platform

An AI-powered financial advisor platform that provides daily market analysis, investment recommendations, and comprehensive portfolio management capabilities.

## 🚀 Features

- **AI-Powered Analysis**: Hybrid AI approach using OpenAI GPT-4 and Anthropic Claude 3.5 Sonnet
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
- **AI Services**: Azure OpenAI Service (GPT-4) + Anthropic Claude API
- **Infrastructure**: Azure App Service, Static Web Apps, Key Vault
- **Development**: Windows + Synology NAS for local development

### Development Environment
- **API**: .NET 9 Web API running on http://0.0.0.0:5052
- **Database**: PostgreSQL 15 on Synology NAS (192.168.1.108:5433)
- **Frontend**: React development server (to be configured)

## 🚦 Development Status

### Phase 1: MVP Foundation (95% Complete)
- ✅ PostgreSQL 15 deployed on Synology NAS
- ✅ .NET 9 Web API project configured
- ✅ Entity Framework Core with Npgsql provider
- ✅ Network accessibility configured
- 🟡 Git repository initialization (in progress)
- ⏳ React frontend setup
- ⏳ Entity Framework models and migrations

## 🛠️ Development Setup

### Prerequisites
- .NET 9 SDK
- Node.js 18+
- PostgreSQL 15
- Git

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

### Frontend Setup (Coming Soon)
```bash
cd pfmp-frontend
npm install
npm run dev
```

## 📝 Project Documentation

- `pfmp.txt` - Comprehensive project plan and technical specifications
- `pfmp-log.md` - Detailed development session logs and progress tracking
- `PFMP-API/` - .NET 9 Web API backend application

## 🤝 Contributing

This is a personal project currently in active development. The codebase is being built incrementally following a structured 4-phase development plan.

## 📄 License

Private project - All rights reserved

---

**Last Updated**: September 20, 2025  
**Current Version**: v0.1.0-alpha  
**Development Phase**: Phase 1 - MVP Foundation