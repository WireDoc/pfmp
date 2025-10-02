param(
    [string]$ConnectionString = $env:EXTERNAL_DB_CONN,
    [string]$OutputDir = "db-backups",
    [int]$KeepDaily = 7,
    [int]$KeepWeekly = 4,
    [switch]$VerboseLog
)
$ErrorActionPreference = 'Stop'
if (-not $ConnectionString) { throw "ConnectionString not provided and EXTERNAL_DB_CONN env var not set." }
if (-not (Test-Path $OutputDir)) { New-Item -ItemType Directory -Path $OutputDir | Out-Null }

# Parse connection string minimal pieces
$host = ($ConnectionString -split ';' | Where-Object { $_ -like 'Host=*' }) -replace 'Host=',''
$port = ($ConnectionString -split ';' | Where-Object { $_ -like 'Port=*' }) -replace 'Port=',''
$db   = ($ConnectionString -split ';' | Where-Object { $_ -like 'Database=*' }) -replace 'Database=',''
$user = ($ConnectionString -split ';' | Where-Object { $_ -like 'Username=*' }) -replace 'Username=',''
$pwd  = ($ConnectionString -split ';' | Where-Object { $_ -like 'Password=*' }) -replace 'Password=',''

$timestamp = (Get-Date).ToUniversalTime().ToString('yyyyMMdd_HHmmss')
$backupFile = Join-Path $OutputDir "pfmp_${timestamp}_manual.dump"

# Use pg_dump; require it to be on PATH. Build connection args.
$env:PGPASSWORD = $pwd
$pgArgs = @('-h', $host, '-p', $port, '-U', $user, '-F', 'c', '-d', $db, '-f', $backupFile)
Write-Host "Running pg_dump -> $backupFile" -ForegroundColor Cyan
$proc = Start-Process -FilePath pg_dump -ArgumentList $pgArgs -NoNewWindow -Wait -PassThru
if ($proc.ExitCode -ne 0) { throw "pg_dump failed with exit code $($proc.ExitCode)" }

# Retention: keep last N daily and last M weekly (Sunday backups considered weekly)
$files = Get-ChildItem $OutputDir -Filter 'pfmp_*.dump' | Sort-Object LastWriteTime -Descending

$daily = @()
$weekly = @()
foreach ($f in $files) {
    $datePart = ($f.BaseName -split '_')[1]  # yyyyMMdd
    if (-not $datePart) { continue }
    $dt = [datetime]::ParseExact($datePart, 'yyyyMMdd', $null)
    if ($dt.DayOfWeek -eq 'Sunday') { $weekly += $f } else { $daily += $f }
}
$dailyToRemove = $daily | Select-Object -Skip $KeepDaily
$weeklyToRemove = $weekly | Select-Object -Skip $KeepWeekly
$toRemove = @($dailyToRemove + $weeklyToRemove) | Select-Object -Unique
foreach ($r in $toRemove) {
    if ($VerboseLog) { Write-Host "Removing old backup: $($r.Name)" -ForegroundColor DarkYellow }
    Remove-Item $r.FullName -Force
}
Write-Host "Backup complete. Retained Daily=$KeepDaily Weekly=$KeepWeekly" -ForegroundColor Green
