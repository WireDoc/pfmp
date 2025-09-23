# ⚠️ CRITICAL DEVELOPMENT WORKFLOW REMINDER

## 🚨 DO NOT START SERVICES IN TERMINAL TOOLS

**NEVER use run_in_terminal to start development servers directly!**

## 🚨 TERMINAL ISOLATION PROBLEM
**CRITICAL ISSUE**: run_in_terminal often defaults to the "active" terminal, which becomes the service terminal. This causes commands to interrupt running services.

### ✅ CORRECT Approach:
1. **Start Services**: ONLY use `.\start-dev-servers.bat` 
2. **Services run in SEPARATE external PowerShell windows**
3. **Testing Commands**: Use run_in_terminal ONLY for quick commands (curl, git, file ops)
4. **Never use same terminal**: Each command should create a fresh terminal context

### ❌ WRONG Approach:
- `dotnet run` in run_in_terminal tool (even with isBackground: true)
- `npm run dev` in run_in_terminal tool  
- Any service startup in terminal tools
- Running commands after starting background services in same session

### 🔧 Development Workflow:
1. **Start Services**: Execute `.\start-dev-servers.bat` 
2. **Verify Running**: Check external windows show services started
3. **Test APIs**: Use separate run_in_terminal calls for each test command
4. **Change Directory First**: Always cd to appropriate directory in each command
5. **Stop Services**: Close the external PowerShell windows

### 🎯 Terminal Usage Rules:
- **Service Terminals**: External windows only (via batch file)
- **Command Terminals**: Fresh run_in_terminal calls only
- **Never Mix**: Don't run commands in service terminal contexts
- **Directory First**: Always specify full path or cd first

### 🔍 Command Examples:
```powershell
# ✅ CORRECT - Fresh terminal for testing
cd W:\pfmp; Invoke-WebRequest -Uri "http://localhost:5052/api/tasks?userId=1"

# ✅ CORRECT - Fresh terminal for git operations  
cd W:\pfmp; git status

# ❌ WRONG - Using service terminal
# (Any command after starting a background service)
```

---

**AI Reminder**: The user has emphasized this workflow requirement multiple times. Always use the batch file for service management, and create fresh terminal contexts for each command to avoid interrupting services.