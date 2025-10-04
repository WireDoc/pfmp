@echo off
REM Backend-only launcher with auto-close (10s). Use KEEP_OPEN arg to prevent closing.
set SCRIPT_DIR=%~dp0
set KEEP=%1
if /I "%KEEP%"=="KEEP_OPEN" (
	shift
	set NO_CLOSE=1
)
echo Starting backend server...
powershell -ExecutionPolicy Bypass -File "%SCRIPT_DIR%scripts\start-dev-servers.ps1" -Mode 1 -NoWait %*
if defined NO_CLOSE (
	echo KEEP_OPEN specified. Leaving window open.
	goto :EOF
)
set /a COUNT=10
:loop
if %COUNT% LEQ 0 goto :eof
title Closing in %COUNT% seconds... (backend)
ping -n 2 127.0.0.1 > nul
set /a COUNT=%COUNT%-1
goto :loop
exit /b 0
