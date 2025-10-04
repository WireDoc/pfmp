<#
.SYNOPSIS
  Simple timestamped backup for pfmp_dev Postgres database.
.DESCRIPTION
  Uses pg_dump custom format. Stores backups under ../backups relative to this script.
  Requires pg_dump in PATH. Adjust connection variables below as needed.
#>

param(
  [string]$Host = "192.168.1.108",
  [int]$Port = 5433,
  [string]$Database = "pfmp_dev",
  [string]$Username = "pfmp_user",
  [string]$OutputDir = "$(Split-Path -Parent $PSScriptRoot)\backups"
)

$timestamp = Get-Date -Format 'yyyyMMdd_HHmmss'
$backupFile = Join-Path $OutputDir "${Database}_$timestamp.dump"

if (-not (Test-Path $OutputDir)) { New-Item -ItemType Directory -Path $OutputDir | Out-Null }

Write-Host "Backing up $Database to $backupFile" -ForegroundColor Cyan

$env:PGPASSWORD = Read-Host -AsSecureString | ForEach-Object { [Runtime.InteropServices.Marshal]::PtrToStringBSTR([Runtime.InteropServices.Marshal]::SecureStringToBSTR($_)) }

$pgDumpArgs = @(
  "-h", $Host,
  "-p", $Port,
  "-U", $Username,
  "-d", $Database,
  "-F", "c",
  "-f", $backupFile
)

$proc = Start-Process -FilePath pg_dump -ArgumentList $pgDumpArgs -NoNewWindow -PassThru -Wait
if ($proc.ExitCode -eq 0) {
  Write-Host "Backup completed." -ForegroundColor Green
} else {
  Write-Host "Backup FAILED with exit code $($proc.ExitCode)" -ForegroundColor Red
  exit $proc.ExitCode
}
