@echo off
REM PFMP Test Runner (Batch Wrapper)
REM Runs dotnet test in an external window and logs output to PFMP-API.Tests.Output.txt
REM Usage:
REM   run-tests.bat            (run all tests)
REM   run-tests.bat verbose    (run with verbose output)

setlocal ENABLEDELAYEDEXPANSION
set MODE_ARG=%1
set SCRIPT_DIR=%~dp0
set PS1=%SCRIPT_DIR%scripts\run-tests.ps1

if not exist "%PS1%" (
	echo ERROR: Could not find PowerShell script at %PS1%
	exit /b 1
)

echo Running PFMP-API.Tests in external window...
echo Output will be written to: %SCRIPT_DIR%PFMP-API.Tests.Output.txt

if /I "%MODE_ARG%"=="verbose" (
	powershell -ExecutionPolicy Bypass -File "%PS1%" -Verbose
) else (
	powershell -ExecutionPolicy Bypass -File "%PS1%"
)

echo.
echo Test execution started in external window.
echo Check PFMP-API.Tests.Output.txt for results.
exit /b 0
