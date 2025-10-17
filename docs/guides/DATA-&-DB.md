# Data & Database Guide

## Connection
Remote dev PostgreSQL: `192.168.1.108:5433` (user: `pfmp_user`, db: `pfmp_dev`)
Local optional: `localhost:5432`

## Inline psql Strategies (PowerShell)
### 1. Stop Parsing Operator
```powershell
psql "postgresql://pfmp_user:***@192.168.1.108:5433/pfmp_dev" --% -c "SELECT COUNT(*) FROM \"Advice\";"
```
### 2. Pre-Escaped Variable (Do NOT nest in another powershell -Command)
```powershell
$sql = 'SELECT COUNT(*) FROM \"Advice\";'
psql "postgresql://pfmp_user:***@192.168.1.108:5433/pfmp_dev" -c $sql
```
### 3. File Based
```powershell
psql "postgresql://pfmp_user:***@192.168.1.108:5433/pfmp_dev" -f .\scripts\queries\list_advice.sql
```

## Quoting Rules
- Mixed-case identifiers require double quotes every time (`"Advice"`)
- Single quotes for string literals
- Multi-line: use here-string `@' ... '@`

## Helper Scripts
- `scripts/queries/list_advice.sql`
- `scripts/queries/list_users.sql`
- `scripts/queries/counts.sql`
- `scripts/queries/querytest.pgsql`
- `scripts/queries/query_advice_count.sql`
- `scripts/queries/query_users.sql`

## Wrapper Function Example
```powershell
function Invoke-PgQuery {
  param([string]$Sql,[string]$Conn='postgresql://pfmp_user:***@192.168.1.108:5433/pfmp_dev')
  & psql --dbname $Conn --command $Sql
}
```

## Migrations
EF migrations are in `PFMP-API/Migrations/` plus snapshot. Add new one:
```powershell
cd C:\pfmp\PFMP-API; dotnet ef migrations add MeaningfulName; dotnet ef database update
```

## Safety
- Never commit real passwords in plain text (rotate if exposed)
- Use file-based queries for anything long/complex

