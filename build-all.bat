@echo off
setlocal ENABLEDELAYEDEXPANSION
set SCRIPT_DIR=%~dp0

REM Parse optional flags (-SkipFrontend / -SkipBackend) pass-through
set PS_ARGS=
:parse
if "%~1"=="" goto run
if /I "%~1"=="-SkipFrontend" (
	set PS_ARGS=!PS_ARGS! -SkipFrontend
	shift
	goto parse
)
if /I "%~1"=="-SkipBackend" (
	set PS_ARGS=!PS_ARGS! -SkipBackend
	shift
	goto parse
)
echo Unknown argument: %1
exit /b 2

:run
echo Running CI build (backend + frontend unless skipped)...
powershell -ExecutionPolicy Bypass -File "%SCRIPT_DIR%scripts\ci-build.ps1" %PS_ARGS%
set BUILD_ERR=%ERRORLEVEL%
if %BUILD_ERR% NEQ 0 (
	echo CI build FAILED with code %BUILD_ERR%
	endlocal & exit /b %BUILD_ERR%
)
echo CI build succeeded.
endlocal & exit /b 0