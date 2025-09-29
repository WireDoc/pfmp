@echo off
REM PFMP Development Server Launcher (Batch Version)
REM Double-click this file to start both servers

echo.
echo 🚀 Starting PFMP Development Servers...
echo =======================================
echo.

REM Start .NET API in new window
echo 🔧 Starting .NET API Server...
start "PFMP API Server" powershell -NoExit -Command "cd '%~dp0PFMP-API'; Write-Host '🔧 PFMP API Server - Port 5052' -ForegroundColor Green; Write-Host 'Environment: Development' -ForegroundColor Yellow; Write-Host ''; dotnet run --urls=http://localhost:5052"

REM Wait 3 seconds for API to initialize
timeout /t 3 /nobreak > nul

REM Start React Frontend in new window
echo ⚛️  Starting React Frontend...
start "PFMP Frontend" powershell -NoExit -Command "cd '%~dp0pfmp-frontend'; Write-Host '⚛️ PFMP Frontend - Port 5173' -ForegroundColor Green; Write-Host 'Framework: React 19 + Vite 7' -ForegroundColor Yellow; Write-Host ''; npm run dev"

echo.
echo ✅ Both servers are starting in separate windows!
echo 🌐 API: http://localhost:5052
echo 🌐 Frontend: http://localhost:3000
echo.
echo ⚠️  Close the PowerShell windows to stop the servers
echo.