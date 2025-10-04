@echo off
REM PFMP Development Server Launcher (Batch Wrapper)
REM Usage:
REM   start-dev-servers.bat            (start both)
REM   start-dev-servers.bat backend    (backend only)
REM   start-dev-servers.bat frontend   (frontend only)
REM   start-dev-servers.bat both       (explicit both)

setlocal ENABLEDELAYEDEXPANSION
set MODE_ARG=%1
if /I "%MODE_ARG%"=="" set MODE_ARG=both
if /I "%MODE_ARG%"=="both" set MODE=0
if /I "%MODE_ARG%"=="backend" set MODE=1
if /I "%MODE_ARG%"=="frontend" set MODE=2

if not defined MODE (
	echo Invalid argument: %MODE_ARG%
	echo Expected: backend ^| frontend ^| both
	exit /b 1
)

set SCRIPT_DIR=%~dp0
set PS1=%SCRIPT_DIR%scripts\start-dev-servers.ps1
if not exist "%PS1%" (
	echo ERROR: Could not find PowerShell script at %PS1%
	exit /b 1
)

set KEEP=%2
if /I "%KEEP%"=="KEEP_OPEN" (
	set NO_CLOSE=1
)

echo Starting dev servers via PowerShell (Mode=%MODE% ^| %MODE_ARG%)
powershell -ExecutionPolicy Bypass -File "%PS1%" -Mode %MODE% -NoWait

if defined NO_CLOSE (
	echo KEEP_OPEN specified. Leaving window open.
	goto :EOF
)
set /a COUNT=10
:loop
if %COUNT% LEQ 0 goto :eof
title Closing in %COUNT% seconds... (both)
ping -n 2 127.0.0.1 > nul
set /a COUNT=%COUNT%-1
goto :loop
exit /b 0