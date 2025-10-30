# Execute SQL script to seed User 2 holdings
$env:PGPASSWORD = "MediaPword.1"
$psqlPath = "C:\Program Files\PostgreSQL\16\bin\psql.exe"

Write-Host "Seeding holdings for User 2 (Michael Smith)..." -ForegroundColor Cyan

& $psqlPath -h 192.168.1.108 -p 5433 -U pfmp_user -d pfmp_dev -f "c:\pfmp\scripts\db\seed-user2-holdings.sql"

if ($LASTEXITCODE -eq 0) {
    Write-Host "`nHoldings seeded successfully!" -ForegroundColor Green
} else {
    Write-Host "`nError seeding holdings. Exit code: $LASTEXITCODE" -ForegroundColor Red
}

# Clear password from environment
Remove-Item Env:\PGPASSWORD
