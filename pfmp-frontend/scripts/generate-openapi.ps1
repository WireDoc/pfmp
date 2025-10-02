<#!
.SYNOPSIS
Generates TypeScript types from the PFMP backend OpenAPI (Swagger) spec.

.DESCRIPTION
Invokes the local dev API swagger JSON and outputs types to:
  src/api/generated/openapi-types.ts

Performs basic availability checks and warns if backend is unreachable.

.EXAMPLE
pwsh scripts/generate-openapi.ps1

.NOTES
Run after adding/changing controllers, DTOs, or route contracts.
Commit regenerated file with the backend changes for consistency.
#>

param(
  [string]$SpecUrl = 'http://localhost:5052/swagger/v1/swagger.json',
  [string]$OutFile = 'src/api/generated/openapi-types.ts'
)

Write-Host "[openapi] Spec: $SpecUrl" -ForegroundColor Cyan

try {
  $response = Invoke-WebRequest -UseBasicParsing -Uri $SpecUrl -Method Head -TimeoutSec 5
  if ($response.StatusCode -ge 400) {
    Write-Warning "Spec URL returned HTTP $($response.StatusCode). Generation may fail."
  }
}
catch {
  Write-Warning "Could not reach spec at $SpecUrl. Is the backend running? Proceeding anyway..."
}

if (-not (Get-Command npx -ErrorAction SilentlyContinue)) {
  Write-Error "npx not found. Ensure Node.js/npm are installed."; exit 1
}

# Use npx to avoid global install requirement; relies on devDependency openapi-typescript
$npxCmd = "npx openapi-typescript `"$SpecUrl`" --output `"$OutFile`""
Write-Host "[openapi] Running: $npxCmd" -ForegroundColor Yellow

$exit = & npx openapi-typescript "$SpecUrl" --output "$OutFile"
if ($LASTEXITCODE -ne 0) {
  Write-Error "openapi-typescript failed with exit code $LASTEXITCODE"; exit $LASTEXITCODE
}

Write-Host "[openapi] Generation complete -> $OutFile" -ForegroundColor Green
