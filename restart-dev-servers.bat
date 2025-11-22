@echo off
REM PFMP Development Server Restart Script
REM Stops dev servers, waits for completion, then starts them again
REM Usage:
REM   restart-dev-servers.bat            (restart both)
REM   restart-dev-servers.bat backend    (restart backend only)
REM   restart-dev-servers.bat frontend   (restart frontend only)

setlocal ENABLEDELAYEDEXPANSION
set MODE_ARG=%1
if /I "%MODE_ARG%"=="" set MODE_ARG=both

echo ========================================
echo PFMP Development Server Restart
echo ========================================
echo.

REM Step 1: Stop servers
echo [1/3] Stopping dev servers...
echo.
call "%~dp0stop-dev-servers.bat"
if errorlevel 1 (
    echo ERROR: Failed to stop servers
    pause
    exit /b 1
)

echo.
echo [2/3] Waiting for processes to terminate...
timeout /t 3 /nobreak > nul

REM Step 2: Start servers
echo.
echo [3/3] Starting dev servers (mode=%MODE_ARG%)...
echo.
call "%~dp0start-dev-servers.bat" %MODE_ARG% KEEP_OPEN
if errorlevel 1 (
    echo ERROR: Failed to start servers
    pause
    exit /b 1
)

echo.
echo ========================================
echo Restart Complete
echo ========================================
echo Backend:  http://localhost:5052
echo Frontend: http://localhost:3000
echo ========================================
echo.

REM Countdown before closing
set /a COUNT=5
:loop
if %COUNT% LEQ 0 goto :eof
title Restart complete - Closing in %COUNT% seconds...
ping -n 2 127.0.0.1 > nul
set /a COUNT=%COUNT%-1
goto :loop

exit /b 0
