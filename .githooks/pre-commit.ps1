#!/usr/bin/env pwsh
# PowerShell variant of pre-commit hook
# Enable with: git config core.hooksPath .githooks
$ErrorActionPreference = 'Stop'
function Say($m){ Write-Host "[pre-commit] $m" -ForegroundColor Yellow }
function Ok($m){ Write-Host "[ok] $m" -ForegroundColor Green }
function Fail($m){ Write-Host "[fail] $m" -ForegroundColor Red }

$root = git rev-parse --show-toplevel
Set-Location $root

Say "Building backend (PFMP-API)..."
try {
  dotnet build PFMP-API/PFMP-API.csproj -c Debug /nologo | Out-Null
  Ok "Backend build passed"
} catch {
  Fail "Backend build failed"
  exit 1
}

if (Test-Path pfmp-frontend) {
  Say "Frontend lint + type check..."
  Push-Location pfmp-frontend
  try {
    npm run lint --silent | Out-Null
    Ok "Lint clean"
  } catch {
    Fail "Lint failed"; exit 1
  }
  try {
    npx tsc -p tsconfig.app.json --noEmit | Out-Null
    Ok "Type check passed"
  } catch {
    Fail "Type errors"; exit 1
  }
  Pop-Location
}

$changedJs = git diff --cached --name-only | Select-String -Pattern '^pfmp-frontend/src/.*\.(ts|tsx)$'
if ($changedJs) {
  Say "Running vitest (changed set)..."
  Push-Location pfmp-frontend
  try {
    npx vitest run --silent | Out-Null
    Ok "Tests passed"
  } catch {
    Fail "Tests failed"; exit 1
  }
  Pop-Location
} else {
  Say "No frontend src changes detected – skipping tests"
}

Ok "All pre-commit checks passed"
exit 0
