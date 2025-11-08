<#
PFMP Development Server Launcher (Rewritten Clean Implementation)
Starts API and/or Frontend in separate PowerShell windows.

Usage:
    .\start-dev-servers.ps1            # both
    .\start-dev-servers.ps1 backend    # backend only
    .\start-dev-servers.ps1 frontend   # frontend only
    .\start-dev-servers.ps1 -Mode 1    # backend (numeric)
    .\start-dev-servers.ps1 -Mode 2 -NoWait

Exit codes:
    0 success launch initiated
    1 configuration/path error
    2 dependency missing (dotnet / npm)
#>
param(
    [Parameter(Position=0)]
    [string]$Mode = 'both',   # accepts: both|backend|frontend|0|1|2
    [switch]$NoWait
)

function Resolve-ModeValue([string]$m) {
    switch ($m.ToLower()) {
        '0' { return 0 }
        'both' { return 0 }
        '1' { return 1 }
        'backend' { return 1 }
        'api' { return 1 }
        '2' { return 2 }
        'frontend' { return 2 }
        default { return 0 }
    }
}

$numericMode = Resolve-ModeValue $Mode
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoLeaf = Split-Path -Leaf $scriptDir
if ($repoLeaf -ieq 'scripts') { $repoRoot = Split-Path -Parent $scriptDir } else { $repoRoot = $scriptDir }
$apiPath = Join-Path $repoRoot 'PFMP-API'
$frontendPath = Join-Path $repoRoot 'pfmp-frontend'

if (-not (Test-Path $apiPath)) { Write-Host "ERROR: API path not found: $apiPath" -ForegroundColor Red; exit 1 }
if (-not (Test-Path $frontendPath)) { Write-Host "ERROR: Frontend path not found: $frontendPath" -ForegroundColor Red; exit 1 }

function Test-Command($name){ $null -ne (Get-Command $name -ErrorAction SilentlyContinue) }
if (-not (Test-Command dotnet)) { Write-Host "ERROR: 'dotnet' not on PATH" -ForegroundColor Red; exit 2 }
if (-not (Test-Command npm)) { Write-Host "ERROR: 'npm' not on PATH" -ForegroundColor Red; exit 2 }

Write-Host "Launching (mode=$numericMode)" -ForegroundColor Green
Write-Host " API Path:      $apiPath" -ForegroundColor Yellow
Write-Host " Frontend Path: $frontendPath" -ForegroundColor Yellow

function Start-PfmpWindow {
    param(
        [string]$Title,
        [string]$WorkDir,
        [string]$Body
    )
    $command = "[Console]::Title='$Title'; Set-Location '$WorkDir'; $Body"
    Start-Process powershell -WorkingDirectory $WorkDir -ArgumentList '-NoExit','-Command', $command | Out-Null
}

if ($numericMode -eq 0 -or $numericMode -eq 1) {
        Start-PfmpWindow -Title 'PFMP API' -WorkDir $apiPath -Body "`$env:DOTNET_ENVIRONMENT='Development'; Write-Host 'API listening http://localhost:5052' -ForegroundColor Green; dotnet run --urls=http://localhost:5052"
    Start-Sleep -Seconds 2
}
if ($numericMode -eq 0 -or $numericMode -eq 2) {
        Start-PfmpWindow -Title 'PFMP Frontend' -WorkDir $frontendPath -Body "Write-Host 'Frontend dev server http://localhost:3000' -ForegroundColor Green; npm run dev"
}

switch ($numericMode) { 0 { $msg='Both services starting' } 1 { $msg='Backend starting' } 2 { $msg='Frontend starting' } }
Write-Host $msg -ForegroundColor Green
Write-Host 'API:      http://localhost:5052'
Write-Host 'Frontend: http://localhost:3000'
Write-Host 'Database: postgresql://localhost:5433 (pfmp_dev)'
Write-Host 'Health:   http://localhost:5052/health   (liveness)'
Write-Host 'Ready:    http://localhost:5052/health/ready (readiness)'
Write-Host "Stop by closing windows or Ctrl+C in each." -ForegroundColor Yellow

if (-not $NoWait) { Read-Host 'Press Enter to close launcher shell' | Out-Null }

exit 0