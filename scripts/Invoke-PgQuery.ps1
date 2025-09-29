param(
  [Parameter(Mandatory)][string]$Sql,
  [string]$Conn = 'postgresql://pfmp_user:MediaPword.1@192.168.1.108:5433/pfmp_dev'
)
Write-Host "Running query..." -ForegroundColor Cyan
& psql --dbname $Conn --command $Sql