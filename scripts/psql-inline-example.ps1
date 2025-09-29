param(
  [string]$Sql = 'SELECT "UserId","Email" FROM "Users" ORDER BY "UserId" LIMIT 3;'
)
# Usage: ./psql-inline-example.ps1 -Sql "SELECT COUNT(*) FROM \"Users\";"
$Conn = 'postgresql://pfmp_user:MediaPword.1@192.168.1.108:5433/pfmp_dev'
Write-Host "Running SQL: $Sql" -ForegroundColor Cyan
& psql --dbname $Conn --command $Sql