# 🛠️ Development Server Scripts

This directory contains convenient scripts for starting both the backend API and frontend development servers during development.

## 📁 Available Scripts

### 1. `start-dev-servers.ps1` (PowerShell Script)
**Best for: Developers comfortable with PowerShell**

- Comprehensive error checking and path validation
- Detailed console output with colored status messages  
- Shows helpful URLs and testing endpoints
- Configures proper environment variables

**Usage:**
```powershell
# From PowerShell terminal
.\start-dev-servers.ps1

# Or right-click → "Run with PowerShell"
```

### 2. `start-dev-servers.bat` (Batch File)
**Best for: Quick double-click execution**

- Simple double-click to start both servers
- Minimal output for clean experience
- Works on any Windows system
- No PowerShell execution policy concerns

**Usage:**
- Double-click the `start-dev-servers.bat` file
- Both servers will start in separate windows

## 🖥️ What Each Script Does

1. **Starts .NET API Server**
   - Runs in separate PowerShell window titled "PFMP API Server"
   - Uses port 5052 (configured in launchSettings.json)
   - Sets Development environment
   - Shows startup progress and any errors

2. **Starts React Frontend Server**
   - Runs in separate PowerShell window titled "PFMP Frontend" 
   - Uses port 5173 (Vite default)
   - Runs `npm run dev` command
   - Shows Vite development server output

## 🌐 Server Information

| Service | URL | Purpose |
|---------|-----|---------|
| .NET API | http://localhost:5052 | Backend REST API |
| React Frontend | http://localhost:3000 | Development UI |

### 🔍 Testing Endpoints

Once servers are running, you can test these URLs:

| Endpoint | URL | Description |
|----------|-----|-------------|
| Health Check | http://localhost:5052/weatherforecast | Basic API connectivity |
| User Tasks | http://localhost:5052/api/tasks/user/1 | Task management API |
| Frontend | http://localhost:3000 | React application |
| API Swagger | http://localhost:5052/swagger | API documentation (if enabled) |

## ⚙️ Configuration Details

### Backend (.NET API)
- **Project**: PFMP-API.csproj
- **Framework**: .NET 9.0
- **Environment**: Development  
- **Database**: PostgreSQL (connection string in appsettings.Development.json)
- **CORS**: Configured to allow requests from http://localhost:3000

### Frontend (React)
- **Framework**: React 19.1.1 + TypeScript 5.7
- **Build Tool**: Vite 7.x
- **UI Library**: Material-UI v6
- **Package Manager**: npm
- **Port**: 3000 (configured in vite.config.ts)
- **API Proxy**: Requests to /api/* are proxied to http://localhost:5052

## 🛑 Stopping Servers

To stop the development servers:

1. **Close PowerShell Windows**: Simply close each server window
2. **Ctrl+C**: Press Ctrl+C in each PowerShell window
3. **Task Manager**: End the `dotnet.exe` and `node.exe` processes if needed

## 🚨 Troubleshooting

### "Execution Policy" Error
If you get a PowerShell execution policy error:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Port Already in Use
If ports 5052 or 5173 are already in use:
- Check for existing dotnet/node processes in Task Manager
- Use `netstat -ano | findstr :5052` to find processes using the port
- Kill the process or restart your computer

### Database Connection Issues
- Ensure PostgreSQL is running
- Verify connection string in `PFMP-API/appsettings.Development.json`
- Run database migrations if needed: `dotnet ef database update`

### npm Dependencies
If the frontend fails to start:
```powershell
cd pfmp-frontend
npm install
npm run dev
```

## 🔧 Development Workflow

1. **Start Servers**: Run either script to start both services
2. **API Development**: Make changes in PFMP-API/, server auto-restarts
3. **Frontend Development**: Make changes in pfmp-frontend/src/, page auto-refreshes  
4. **Database Changes**: Run `dotnet ef migrations add <name>` and `dotnet ef database update`
5. **Testing**: Use the provided testing endpoints to verify functionality

## 📝 Notes

- Both servers support hot reload/auto-restart during development
- CORS is pre-configured for local development
- Environment variables are set appropriately for Development mode
- Console output is preserved in separate windows for easy debugging

---

**Need help?** Check the main project documentation in `PHASE3_COMPLETION_NOTES.md` for detailed implementation information.