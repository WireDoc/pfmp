param(
  [string]$Host = '192.168.1.108',
  [int]$Port = 5433,
  [string]$Db = 'pfmp_dev',
  [string]$User = 'pfmp_user',
  [string]$SqlFile
)

# Default SQL file to repo-relative path if not provided
if (-not $SqlFile -or [string]::IsNullOrWhiteSpace($SqlFile)) {
  $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
  # scripts/dev -> scripts/db
  $repoRoot = Split-Path -Parent (Split-Path -Parent $scriptDir)
  $SqlFile = Join-Path $repoRoot 'scripts/db/truncate_and_seed.sql'
}

Write-Host "WARNING: This will DESTROY Alerts, Advice, and Tasks data in database '$Db'." -ForegroundColor Yellow
$confirmation = Read-Host "Type 'WIPE' to continue"
if ($confirmation -ne 'WIPE') {
  Write-Host 'Aborted by user.' -ForegroundColor Cyan
  exit 1
}

if (-not (Get-Command psql -ErrorAction SilentlyContinue)) {
  Write-Host 'psql not found in PATH. Install PostgreSQL client tools first.' -ForegroundColor Red
  exit 2
}

$secure = Read-Host -AsSecureString -Prompt 'Postgres Password'
$env:PGPASSWORD = (New-Object System.Net.NetworkCredential('', $secure)).Password

Write-Host "Executing seed script..." -ForegroundColor Green
$cmd = "psql -h $Host -p $Port -U $User -d $Db -f `"$SqlFile`""
Write-Host $cmd -ForegroundColor DarkGray
Invoke-Expression $cmd

if ($LASTEXITCODE -eq 0) {
  Write-Host 'Seed completed successfully.' -ForegroundColor Green
} else {
  Write-Host "Seed failed with exit code $LASTEXITCODE" -ForegroundColor Red
}
