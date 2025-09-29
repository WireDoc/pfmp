# PFMP Development Server Launcher
# This script starts both the .NET API and React frontend in separate PowerShell windows
# Usage: Right-click and "Run with PowerShell" or execute from terminal with: .\start-dev-servers.ps1

Write-Host "🚀 Starting PFMP Development Servers..." -ForegroundColor Green
Write-Host "=======================================" -ForegroundColor Green

# Get the script directory to ensure relative paths work
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Define paths
$ApiPath = Join-Path $ScriptDir "PFMP-API"
$FrontendPath = Join-Path $ScriptDir "pfmp-frontend"

# Verify paths exist
if (!(Test-Path $ApiPath)) {
    Write-Host "❌ ERROR: API directory not found at $ApiPath" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

if (!(Test-Path $FrontendPath)) {
    Write-Host "❌ ERROR: Frontend directory not found at $FrontendPath" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "📁 API Path: $ApiPath" -ForegroundColor Yellow
Write-Host "📁 Frontend Path: $FrontendPath" -ForegroundColor Yellow
Write-Host ""

# Start .NET API in new PowerShell window
Write-Host "🔧 Starting .NET API Server..." -ForegroundColor Cyan
$ApiTitle = "PFMP API Server - .NET 9"
$ApiCommand = "cd '$ApiPath'; Write-Host '🔧 Starting .NET API on http://localhost:5052' -ForegroundColor Green; dotnet run --urls=http://localhost:5052; Read-Host 'Press Enter to close'"

Start-Process powershell -ArgumentList "-NoExit", "-Command", "& {$env:DOTNET_ENVIRONMENT='Development'; [Console]::Title='$ApiTitle'; $ApiCommand}"

# Wait a moment for API to start initializing
Start-Sleep -Seconds 2

# Start React Frontend in new PowerShell window  
Write-Host "⚛️  Starting React Frontend..." -ForegroundColor Cyan
$FrontendTitle = "PFMP Frontend - React + Vite"
$FrontendCommand = "cd '$FrontendPath'; Write-Host '⚛️ Starting React Frontend on http://localhost:5173' -ForegroundColor Green; npm run dev; Read-Host 'Press Enter to close'"

Start-Process powershell -ArgumentList "-NoExit", "-Command", "& {[Console]::Title='$FrontendTitle'; $FrontendCommand}"

Write-Host ""
Write-Host "✅ Both servers are starting up!" -ForegroundColor Green
Write-Host "🌐 API will be available at: http://localhost:5052" -ForegroundColor White
Write-Host "🌐 Frontend will be available at: http://localhost:5173" -ForegroundColor White
Write-Host ""
Write-Host "📝 Development Notes:" -ForegroundColor Yellow
Write-Host "   • API runs on port 5052 (configured in launchSettings.json)" -ForegroundColor Gray
Write-Host "   • Frontend runs on port 5173 (Vite default)" -ForegroundColor Gray
Write-Host "   • CORS is configured to allow frontend-API communication" -ForegroundColor Gray
Write-Host "   • Both windows will stay open for easy monitoring" -ForegroundColor Gray
Write-Host ""
Write-Host "🔍 Testing URLs:" -ForegroundColor Yellow
Write-Host "   • API Health: http://localhost:5052/weatherforecast" -ForegroundColor Gray
Write-Host "   • Task API: http://localhost:5052/api/tasks?userId=1" -ForegroundColor Gray
Write-Host "   • Frontend: http://localhost:3000" -ForegroundColor Gray
Write-Host ""
Write-Host "⚠️  To stop servers: Close each PowerShell window or press Ctrl+C in each" -ForegroundColor Yellow
Write-Host ""

# Keep this window open briefly to show the status
Write-Host "Script completed. Check the new windows for server output." -ForegroundColor Green
Read-Host "Press Enter to close this launcher window"