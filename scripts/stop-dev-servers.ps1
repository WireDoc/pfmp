<#
Stops PFMP dev server windows (API & Frontend) launched by start-dev-servers.
Improved detection logic:
 1. Find any console host (powershell/pwsh/cmd) windows whose MainWindowTitle contains 'PFMP'.
 2. Close them gracefully (CloseMainWindow) then force if still alive.
 3. Fallback: Kill lingering child processes (node vite / dotnet) that match expected working directories.
Use -Force to skip graceful phase and force kill immediately.
#>
param(
    [switch]$Force
)

Write-Host "Stopping PFMP dev servers..." -ForegroundColor Cyan

# Step 1: Gather candidate console windows
$consoleNames = @('powershell','pwsh','cmd')
$windowProcs = @()
foreach ($name in $consoleNames) {
    $list = Get-Process $name -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle -match 'PFMP' }
    if ($list) { $windowProcs += $list }
}

if (-not $windowProcs -and -not $Force) {
    Write-Host "No PFMP-labeled console windows found via title match. Will still attempt to locate lingering node/dotnet processes." -ForegroundColor Yellow
}

$stopped = @()
foreach ($p in $windowProcs | Sort-Object Id -Unique) {
    $title = $p.MainWindowTitle
    try {
        if ($Force) {
            Stop-Process -Id $p.Id -Force -ErrorAction Stop
        } else {
            $p.CloseMainWindow() | Out-Null
            Start-Sleep -Milliseconds 700
            if (-not $p.HasExited) { Stop-Process -Id $p.Id -Force }
        }
        $stopped += $p.Id
        Write-Host "Closed window: '$title' (PID $($p.Id))" -ForegroundColor Green
    } catch {
        Write-Host "Failed closing window PID $($p.Id): $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Step 2: Kill lingering vite/node or dotnet processes if their parent windows are gone
$repoRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$frontendDir = Join-Path $repoRoot 'pfmp-frontend'
$apiDir = Join-Path $repoRoot 'PFMP-API'

function Try-GetProcessesByCommand([string]$pattern){
    try {
        Get-CimInstance Win32_Process -ErrorAction Stop | Where-Object { $_.CommandLine -match $pattern }
    } catch { @() }
}

# Identify node vite dev processes
$viteProcs = Try-GetProcessesByCommand 'vite' | Where-Object { $_.CommandLine -match [regex]::Escape($frontendDir) }
foreach ($vp in $viteProcs) {
    try {
        Stop-Process -Id $vp.ProcessId -Force -ErrorAction Stop
        Write-Host "Killed lingering vite/node process (PID $($vp.ProcessId))" -ForegroundColor Green
    } catch {
        Write-Host "Failed to kill vite/node PID $($vp.ProcessId): $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Identify dotnet run for API (only if still around and window closed)
$dotnetApi = Try-GetProcessesByCommand 'dotnet.+PFMP-API' | Where-Object { $_.CommandLine -match [regex]::Escape($apiDir) }
foreach ($dp in $dotnetApi) {
    try {
        Stop-Process -Id $dp.ProcessId -Force -ErrorAction Stop
        Write-Host "Killed lingering dotnet API process (PID $($dp.ProcessId))" -ForegroundColor Green
    } catch {
        Write-Host "Failed to kill dotnet API PID $($dp.ProcessId): $($_.Exception.Message)" -ForegroundColor Red
    }
}

$total = $stopped.Count + $viteProcs.Count + $dotnetApi.Count
if ($total -eq 0) {
    Write-Host "No PFMP dev processes found." -ForegroundColor Yellow
} else {
    Write-Host "Total processes terminated: $total" -ForegroundColor Cyan
}

# Step 3: Second pass to close any now-idle PFMP Frontend window that remained open (sometimes vite exits but the shell stays)
$remainingFrontend = Get-Process -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle -match 'PFMP Frontend' }
foreach ($rf in $remainingFrontend) {
    try {
        if (-not $rf.HasExited) {
            $rf.CloseMainWindow() | Out-Null
            Start-Sleep -Milliseconds 300
            if (-not $rf.HasExited) { Stop-Process -Id $rf.Id -Force -ErrorAction Stop }
            Write-Host "Closed lingering frontend window (PID $($rf.Id))" -ForegroundColor Green
        }
    } catch {
        Write-Host "Failed final-close frontend window PID $($rf.Id): $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Step 4: Heuristic – sometimes the window title persists blank; detect shells whose command line started the PFMP frontend (npm run dev)
try {
    $shellMatches = Get-CimInstance Win32_Process -ErrorAction Stop | Where-Object {
        ($_.CommandLine -match 'npm' -and $_.CommandLine -match 'run' -and $_.CommandLine -match 'dev') -and ($_.CommandLine -match [regex]::Escape($frontendDir))
    }
    foreach ($sm in $shellMatches) {
        try {
            Stop-Process -Id $sm.ProcessId -Force -ErrorAction Stop
            Write-Host "Force-closed frontend shell (PID $($sm.ProcessId))" -ForegroundColor Green
        } catch {
            Write-Host "Failed to force-close frontend shell PID $($sm.ProcessId): $($_.Exception.Message)" -ForegroundColor Red
        }
    }
} catch {
    Write-Host "Heuristic shell detection failed: $($_.Exception.Message)" -ForegroundColor DarkYellow
}
