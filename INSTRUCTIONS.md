# PFMP Development Instructions

### ✅ CORRECT PowerShell syntax:

Starting Services
- Use command: cd W:\pfmp; .\start-dev-servers.bat

- Use semicolon (`;`) to separate commands in PowerShell, NOT `&&`**

## Server Configuration

## Starting PFMP Development

- **API Backend**: http://localhost:5052 (.NET Core)

- **Frontend**: http://localhost:3000 (React + Vite)- Any service startup in terminal tools

- **Database**: localhost:5432 (PostgreSQL)

The project uses Microsoft Azure AD for authentication:

- **Client ID**: `efe3c2da-c4bb-45ff-b85b-e965de54f910`

- **Tenant ID**: `90c3ba91-a0c4-4816-9f8f-beeefbfc33d2`

- **Supported Accounts**: Personal and work Microsoft accounts

# Test API health

cd W:\pfmp; Invoke-WebRequest -Uri "http://localhost:5052/weatherforecast"

# Test authentication config#

cd W:\pfmp; Invoke-WebRequest -Uri "http://localhost:5052/api/auth/config"

# Test frontend availability

cd W:\pfmp; Invoke-WebRequest -Uri "http://localhost:3000"


# Multiple operations

cd W:\pfmp; git status; git log --oneline -5``````cd W:\pfmp\PFMP-API



# Web requestsW:\pfmp\

Invoke-WebRequest -Uri "http://localhost:5052/api/endpoint"

Invoke-RestMethod -Uri "http://localhost:5052/api/endpoint" -Method GET├── scripts\                 # PowerShell automation scriptsdotnet run --urls=http://localhost:5052

```

│   ├── start-dev-servers.ps1 # Main development server launcher

## Troubleshooting

│   ├── Azure-Config-Instructions.ps1 # Azure AD setup guide### ✅ CORRECT PowerShell syntax:

### Common Issues:

1. **`&&` syntax error**: Replace with `;` - `&&` does NOT exist in PowerShell│   └── Setup-AzureAD.ps1    # Azure AD app registration

2. **Service interruption**: Never run commands in service terminal windows

3. **Port conflicts**: Ensure ports 5052 and 3000 are available├── docs\                    # Documentation```powershell# In another terminal - Start Frontend  

4. **CORS errors**: Verify frontend URL matches CORS configuration

5. **Authentication errors**: Check Azure AD app registration settings│   ├── notes\               # Development notes and completion logs



### Process Management:│   ├── API-DOCUMENTATION.md # API endpoint documentationcd W:\pfmp; .\scripts\start-dev-servers.ps1cd W:\pfmp\pfmp-frontend

```powershell

# Check running processes│   └── DATABASE-TOOLS-SETUP.md # Database setup guide

Get-Process | Where-Object {$_.ProcessName -match "(dotnet|node)"}

├── PFMP-API\               # .NET Core backend API```npm run dev

# Kill specific processes if needed (use cautiously)

Stop-Process -Name "dotnet" -Force -ErrorAction SilentlyContinue├── pfmp-frontend\          # React + TypeScript frontend

Stop-Process -Name "node" -Force -ErrorAction SilentlyContinue

```└── INSTRUCTIONS.md         # This file```



### Log Monitoring:```

- **API Logs**: Check the external PowerShell window running the API

- **Frontend Logs**: Check the external PowerShell window running the frontend**Use semicolon (`;`) to separate commands in PowerShell, NOT `&&`**

- **Browser Console**: F12 Developer Tools for frontend debugging

## Server Configuration

## File Organization

## Common PowerShell Syntax Rules

### Scripts (`/scripts/`):

- `start-dev-servers.ps1` - Main launcher- **API Backend**: http://localhost:5052 (.NET Core)

- `Azure-Config-Instructions.ps1` - Azure AD setup guide

- `Setup-AzureAD.ps1` - Azure app registration- **Frontend**: http://localhost:3000 (React + Vite)## Starting PFMP Development

- `Check-RedirectUris.ps1` - Verify redirect URI configuration

- **Database**: localhost:5432 (PostgreSQL)

### Documentation (`/docs/`):

- `API-DOCUMENTATION.md` - Backend API reference1. **Command Separation**: Use `;` not `&&`

- `DATABASE-TOOLS-SETUP.md` - Database configuration

- `notes/` - Development notes and completion logs## Authentication Setup



---### Method 1: Using PowerShell Script (Recommended)2. **Current Directory Script**: Use `.\script.bat` not just `script.bat`



## Quick Start ChecklistThe project uses Microsoft Azure AD for authentication:



1. ✅ Ensure you're in PowerShell (not Command Prompt)```powershell3. **Path Separators**: Use `\` for Windows paths

2. ✅ Navigate to project root: `cd W:\pfmp`

3. ✅ **Services run in SEPARATE external PowerShell windows**: `.\scripts\start-dev-servers.ps1`- **Client ID**: `efe3c2da-c4bb-45ff-b85b-e965de54f910`

4. ✅ Wait for both external windows to show "running"

5. ✅ Test in browser: http://localhost:3000- **Tenant ID**: `90c3ba91-a0c4-4816-9f8f-beeefbfc33d2`cd W:\pfmp4. **Multiple Commands**: 

6. ✅ Use fresh terminals for any additional commands

- **Supported Accounts**: Personal and work Microsoft accounts

**Remember**: Services run in their own windows, commands run in fresh terminals!
.\scripts\start-dev-servers.ps1   ```powershell

### Azure Configuration

Run the Azure configuration script for setup instructions:```   # Correct

```powershell

cd W:\pfmp   cd path; command

.\scripts\Azure-Config-Instructions.ps1

```### Method 2: Manual Startup (Advanced)   



## Development Testing Commands```powershell   # Wrong



**Always use fresh terminal contexts for testing:**# Start API in one external terminal   cd path && command



```powershellcd W:\pfmp\PFMP-API   ```

# Test API health

cd W:\pfmp; Invoke-WebRequest -Uri "http://localhost:5052/weatherforecast"dotnet run --urls=http://localhost:5052



# Test authentication config## Testing Authentication After Startup

cd W:\pfmp; Invoke-WebRequest -Uri "http://localhost:5052/api/auth/config"

# Start Frontend in another external terminal

# Test frontend availability

cd W:\pfmp; Invoke-WebRequest -Uri "http://localhost:3000"cd W:\pfmp\pfmp-frontendOnce servers are running:

```

npm run dev

## Common PowerShell Patterns

``````powershell

```powershell

# Command chaining (correct)# Test API health

cd path; command1; command2

## Project StructureInvoke-RestMethod http://localhost:5052/weatherforecast

# Multiple operations

cd W:\pfmp; git status; git log --oneline -5



# Web requests```# Test auth config

Invoke-WebRequest -Uri "http://localhost:5052/api/endpoint"

Invoke-RestMethod -Uri "http://localhost:5052/api/endpoint" -Method GETW:\pfmp\Invoke-RestMethod http://localhost:5052/api/auth/config

```

├── scripts\                 # PowerShell automation scripts

## Troubleshooting

│   ├── start-dev-servers.ps1 # Main development server launcher# Test auth endpoints (bypass mode)

### Common Issues:

1. **`&&` syntax error**: Replace with `;`│   ├── Azure-Config-Instructions.ps1 # Azure AD setup guide$body = @{

2. **Service interruption**: Never run commands in service terminal windows

3. **Port conflicts**: Ensure ports 5052 and 3000 are available│   └── Setup-AzureAD.ps1    # Azure AD app registration    email = "test@example.com"

4. **CORS errors**: Verify frontend URL matches CORS configuration

5. **Authentication errors**: Check Azure AD app registration settings├── docs\                    # Documentation    password = "password123"



### Process Management:│   ├── notes\               # Development notes and completion logs} | ConvertTo-Json

```powershell

# Check running processes│   ├── API-DOCUMENTATION.md # API endpoint documentation

Get-Process | Where-Object {$_.ProcessName -match "(dotnet|node)"}

│   └── DATABASE-TOOLS-SETUP.md # Database setup guideInvoke-RestMethod -Uri http://localhost:5052/api/auth/login -Method POST -Body $body -ContentType "application/json"

# Kill specific processes if needed (use cautiously)

Stop-Process -Name "dotnet" -Force -ErrorAction SilentlyContinue├── PFMP-API\               # .NET Core backend API```

Stop-Process -Name "node" -Force -ErrorAction SilentlyContinue

```├── pfmp-frontend\          # React + TypeScript frontend



### Log Monitoring:└── INSTRUCTIONS.md         # This file## Troubleshooting

- **API Logs**: Check the external PowerShell window running the API

- **Frontend Logs**: Check the external PowerShell window running the frontend```

- **Browser Console**: F12 Developer Tools for frontend debugging

### Common Issues:

## File Organization

## Server Configuration1. **`&&` syntax error**: Use `;` instead

### Scripts (`/scripts/`):

- `start-dev-servers.ps1` - Main launcher2. **Script not found**: Make sure you're in the correct directory (`W:\pfmp`)

- `Azure-Config-Instructions.ps1` - Azure AD setup guide

- `Setup-AzureAD.ps1` - Azure app registration- **API Backend**: http://localhost:5052 (.NET Core)3. **Permission denied**: Run PowerShell as administrator if needed

- `Check-RedirectUris.ps1` - Verify redirect URI configuration

- **Frontend**: http://localhost:3000 (React + Vite)4. **Port conflicts**: Make sure ports 5052 and 5173 are available

### Documentation (`/docs/`):

- `API-DOCUMENTATION.md` - Backend API reference- **Database**: localhost:5432 (PostgreSQL)

- `DATABASE-TOOLS-SETUP.md` - Database configuration

- `notes/` - Development notes and completion logs### Port Information:



---## Authentication Setup- **API**: http://localhost:5052



## Quick Start Checklist- **Frontend**: http://localhost:5173 (or http://localhost:3000)



1. ✅ Ensure you're in PowerShell (not Command Prompt)The project uses Microsoft Azure AD for authentication:- **Database**: localhost:5432 (PostgreSQL)

2. ✅ Navigate to project root: `cd W:\pfmp`

3. ✅ **Services run in SEPARATE external PowerShell windows**: `.\scripts\start-dev-servers.ps1`

4. ✅ Wait for both external windows to show "running"

5. ✅ Test in browser: http://localhost:3000- **Client ID**: `efe3c2da-c4bb-45ff-b85b-e965de54f910`## Quick Reference Commands

6. ✅ Use fresh terminals for any additional commands

- **Tenant ID**: `90c3ba91-a0c4-4816-9f8f-beeefbfc33d2`

**Remember**: Services run in their own windows, commands run in fresh terminals!
- **Supported Accounts**: Personal and work Microsoft accounts```powershell

# Navigate to project

### Azure Configurationcd W:\pfmp

Run the Azure configuration script for setup instructions:

```powershell# Start both servers

cd W:\pfmp.\start-dev-servers.bat

.\scripts\Azure-Config-Instructions.ps1

```# Check running processes

Get-Process | Where-Object {$_.ProcessName -like "*dotnet*" -or $_.ProcessName -like "*node*"}

## Development Testing Commands

# Kill processes if needed

**Always use fresh terminal contexts for testing:**Stop-Process -Name "dotnet" -Force

Stop-Process -Name "node" -Force

```powershell```
# Test API health
cd W:\pfmp; Invoke-WebRequest -Uri "http://localhost:5052/weatherforecast"

# Test authentication config
cd W:\pfmp; Invoke-WebRequest -Uri "http://localhost:5052/api/auth/config"

# Test frontend availability
cd W:\pfmp; Invoke-WebRequest -Uri "http://localhost:3000"
```

## Common PowerShell Patterns

```powershell
# Command chaining (correct)
cd path; command1; command2

# Multiple operations
cd W:\pfmp; git status; git log --oneline -5

# Web requests
Invoke-WebRequest -Uri "http://localhost:5052/api/endpoint"
Invoke-RestMethod -Uri "http://localhost:5052/api/endpoint" -Method GET
```

## Troubleshooting

### Common Issues:
1. **`&&` syntax error**: Replace with `;`
2. **Service interruption**: Never run commands in service terminal windows
3. **Port conflicts**: Ensure ports 5052 and 3000 are available
4. **CORS errors**: Verify frontend URL matches CORS configuration
5. **Authentication errors**: Check Azure AD app registration settings

### Process Management:
- powershell
# Check running processes
Get-Process | Where-Object {$_.ProcessName -match "(dotnet|node)"}

# Kill specific processes if needed (use cautiously)
Stop-Process -Name "dotnet" -Force -ErrorAction SilentlyContinue
Stop-Process -Name "node" -Force -ErrorAction SilentlyContinue
```

### Log Monitoring:
- **API Logs**: Check the external PowerShell window running the API
- **Frontend Logs**: Check the external PowerShell window running the frontend
- **Browser Console**: F12 Developer Tools for frontend debugging

## File Organization

### Scripts (`/scripts/`):
- `start-dev-servers.ps1` - Main launcher
- `Azure-Config-Instructions.ps1` - Azure AD setup guide
- `Setup-AzureAD.ps1` - Azure app registration
- `Check-RedirectUris.ps1` - Verify redirect URI configuration

### Documentation (`/docs/`):
- `API-DOCUMENTATION.md` - Backend API reference
- `DATABASE-TOOLS-SETUP.md` - Database configuration
- `notes/` - Development notes and completion logs
