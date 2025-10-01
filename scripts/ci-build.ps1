param(
    [switch]$SkipFrontend,
    [switch]$SkipBackend
)

Write-Host "PFMP CI Build Script" -ForegroundColor Cyan
Write-Host "SkipFrontend=$SkipFrontend SkipBackend=$SkipBackend" -ForegroundColor DarkGray

$ErrorActionPreference = 'Stop'

function Run-Step {
    param(
        [string]$Title,
        [scriptblock]$ScriptBlock
    )
    Write-Host "`n> $Title" -ForegroundColor Yellow
    & $ScriptBlock
    if ($LASTEXITCODE -ne 0) { throw "Step failed: $Title" }
    Write-Host "OK $Title" -ForegroundColor Green
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
# If script lives in a 'scripts' folder, repository root is its parent directory.
if ((Split-Path -Leaf $scriptDir) -ieq 'scripts') {
    $repoRoot = Split-Path -Parent $scriptDir
} else {
    $repoRoot = $scriptDir
}
$apiPath = Join-Path $repoRoot 'PFMP-API'
$fePath = Join-Path $repoRoot 'pfmp-frontend'

if (-not $SkipBackend) {
    Run-Step -Title 'Restore .NET' -ScriptBlock { dotnet restore $apiPath }
    Run-Step -Title 'Build .NET (Release)' -ScriptBlock { dotnet build $apiPath -c Release --nologo }
    # Run tests (will discover PFMP-API.Tests via solution or project reference)
    $testsPath = Join-Path $repoRoot 'PFMP-API.Tests'
    if (Test-Path $testsPath) {
        Run-Step -Title 'Test .NET' -ScriptBlock { dotnet test $testsPath -c Release --nologo --collect:"XPlat Code Coverage" }
        # Consolidate coverage (cobertura) into a stable location (coverage/) if present
        $coverageRoot = Join-Path $testsPath 'TestResults'
        if (Test-Path $coverageRoot) {
            $cobertura = Get-ChildItem -Path $coverageRoot -Recurse -Filter 'coverage.cobertura.xml' -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1
            if ($cobertura) {
                $targetDir = Join-Path $repoRoot 'coverage'
                if (-not (Test-Path $targetDir)) { New-Item -ItemType Directory -Path $targetDir | Out-Null }
                Copy-Item $cobertura.FullName (Join-Path $targetDir 'coverage.cobertura.xml') -Force
                Write-Host "Copied coverage report to $targetDir" -ForegroundColor DarkGray
            }
        }
    }
}

if (-not $SkipFrontend) {
    Push-Location $fePath
    try {
        Run-Step -Title 'Install NPM dependencies' -ScriptBlock { npm install --no-audit --no-fund }
        Run-Step -Title 'Frontend lint+type+build' -ScriptBlock { npm run build }
    } finally {
        Pop-Location
    }
}

Write-Host "`nCI build successful" -ForegroundColor Green