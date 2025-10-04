@echo off
REM Stop PFMP dev servers (API + Frontend). Use FORCE to hard kill.
set SCRIPT_DIR=%~dp0
set ARG=%1
if /I "%ARG%"=="FORCE" (
  powershell -ExecutionPolicy Bypass -File "%SCRIPT_DIR%scripts\stop-dev-servers.ps1" -Force
) else (
  powershell -ExecutionPolicy Bypass -File "%SCRIPT_DIR%scripts\stop-dev-servers.ps1"
)
exit /b 0
