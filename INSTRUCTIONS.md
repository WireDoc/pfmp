# PFMP Development Instructions

## CRITICAL: PowerShell Command Syntax

**NEVER use `&&` in PowerShell commands - it doesn't work!**

### ❌ WRONG (Bash syntax - will fail in PowerShell):
```powershell
cd W:\pfmp && start-dev-servers.bat
```

### ✅ CORRECT PowerShell syntax:
```powershell
cd W:\pfmp; .\start-dev-servers.bat
```

**Use semicolon (`;`) to separate commands in PowerShell, NOT `&&`**

## Starting PFMP Development Servers

### Method 1: Using Batch File (Recommended)
```powershell
cd W:\pfmp
.\start-dev-servers.bat
```

### Method 2: Manual Startup
```powershell
# Start API
cd W:\pfmp\PFMP-API
dotnet run --urls=http://localhost:5052

# In another terminal - Start Frontend  
cd W:\pfmp\pfmp-frontend
npm run dev
```

## Common PowerShell Syntax Rules

1. **Command Separation**: Use `;` not `&&`
2. **Current Directory Script**: Use `.\script.bat` not just `script.bat`
3. **Path Separators**: Use `\` for Windows paths
4. **Multiple Commands**: 
   ```powershell
   # Correct
   cd path; command
   
   # Wrong
   cd path && command
   ```

## Testing Authentication After Startup

Once servers are running:

```powershell
# Test API health
Invoke-RestMethod http://localhost:5052/weatherforecast

# Test auth config
Invoke-RestMethod http://localhost:5052/api/auth/config

# Test auth endpoints (bypass mode)
$body = @{
    email = "test@example.com"
    password = "password123"
} | ConvertTo-Json

Invoke-RestMethod -Uri http://localhost:5052/api/auth/login -Method POST -Body $body -ContentType "application/json"
```

## Troubleshooting

### Common Issues:
1. **`&&` syntax error**: Use `;` instead
2. **Script not found**: Make sure you're in the correct directory (`W:\pfmp`)
3. **Permission denied**: Run PowerShell as administrator if needed
4. **Port conflicts**: Make sure ports 5052 and 5173 are available

### Port Information:
- **API**: http://localhost:5052
- **Frontend**: http://localhost:5173 (or http://localhost:3000)
- **Database**: localhost:5432 (PostgreSQL)

## Quick Reference Commands

```powershell
# Navigate to project
cd W:\pfmp

# Start both servers
.\start-dev-servers.bat

# Check running processes
Get-Process | Where-Object {$_.ProcessName -like "*dotnet*" -or $_.ProcessName -like "*node*"}

# Kill processes if needed
Stop-Process -Name "dotnet" -Force
Stop-Process -Name "node" -Force
```