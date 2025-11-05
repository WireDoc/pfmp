# Data & Database Guide

## Credentials
-U: 'pfmp_user' -P 'MediaPword.1'

## Connection
Remote dev PostgreSQL: `192.168.1.108:5433` (user: `pfmp_user`, db: `pfmp_dev`)

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

## Running `psql` Commands in VSCode (PowerShell Terminal)

Executing `psql` with the `-c` (command) flag from a PowerShell terminal is difficult because **PowerShell and `psql` have conflicting quoting rules**.

PowerShell parses your command *first*, interpreting and often stripping away the quotes (`"`) and backslashes (`\`) that `psql` needs to correctly understand your SQL query. This is especially true for case-sensitive identifiers (like `"Users"`) which will fail if the quotes are lost.

Here are three reliable methods to execute queries correctly.

---

### Option 1: The Stop-Parsing Operator (`--%`)

This is the most direct and reliable method for **single-line commands** in the terminal.

The `--%` operator tells PowerShell to **stop parsing** all remaining arguments and pass them "as-is" to the external program (`psql`).

**How to Use:**
1.  Place all `psql` options (like `-c`) *before* the connection string.
2.  Place the `--%` operator *before* the `psql` options.
3.  Inside the SQL string, use `\"` to escape double quotes (for case-sensitive names). `psql` will receive and understand these escapes.
4.  Place the connection string **last**.

**Example:**
```powershell
psql --% -c "SELECT 'TransactionalAccountDesiredBalance' as field, \"TransactionalAccountDesiredBalance\"::text as value FROM \"Users\" WHERE \"Id\" = 2;" "postgresql://user:password@host:port/db"

Why it Works: PowerShell stops parsing after --%, so it doesn't touch the SQL string. psql receives the literal text -c "SELECT ... \"Users\" ...;" and its own parser correctly handles the \" escapes to preserve case.

Option 2: Using a PowerShell Variable
This is the cleanest and most readable method for re-usable scripts or complex queries.

How to Use:

Define your SQL query in a PowerShell variable using single quotes ('...'). This creates a literal string where PowerShell does not interpret special characters.

Inside this single-quoted string, you must manually add the escapes that psql expects:

For case-sensitive names (double quotes): "Users" becomes \"Users\"

For literal strings (single quotes): 'my-string' becomes ''my-string'' (double them up).

Execute psql, placing the connection string last.

# 1. Define the query as a literal string with psql-specific escapes
$sql = 'SELECT ''TransactionalAccountDesiredBalance'' as field, \"TransactionalAccountDesiredBalance\"::text as value FROM \"Users\" WHERE \"Id\" = 2 UNION ALL SELECT ''EmergencyFundTarget'' as field, \"EmergencyFundTarget\"::text as value FROM \"Users\" WHERE \"Id\" = 2;'

# 2. Execute the command, with the connection string at the end
psql -c $sql "postgresql://user:password@host:port/db"

Why it Works: The $sql variable holds the exact literal string SELECT ''...'' ... \"Users\" .... When PowerShell passes this to psql, it's already perfectly formatted for psql's own parser.

Option 3: Using a .sql File
This is the simplest and most robust method for long or multi-line queries. It avoids all shell escaping problems entirely.

How to Use:

Create a new file (e.g., my_query.sql).

Write your plain SQL in this file. No special escaping is needed. Use double quotes for case-sensitive names and single quotes for strings, just as you would in any SQL editor.

Execute the file using the -f (file) flag.

Example:

File: c:\pfpm\scripts\db\get_balances.sql

Example:
SELECT
  'TransactionalAccountDesiredBalance' as field,
  "TransactionalAccountDesiredBalance"::text as value
FROM "Users"
WHERE "Id" = 2
UNION ALL
SELECT
  'EmergencyFundTarget' as field,
  "EmergencyFundTarget"::text as value
FROM "Users"
WHERE "Id" = 2;

# The -f flag tells psql to read its command from the specified file
psql -f "C:\pfpm\scripts\db\get_balances.sql" "postgresql://user:password@host:port/db"

Why it Works: PowerShell is only asked to pass a simple filename. psql receives the filename, opens the file, and reads the raw SQL directly, completely bypassing any shell parsing.