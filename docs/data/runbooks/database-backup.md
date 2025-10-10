# Database Backup & Restore Guide

## When to Backup (MANDATORY)
Always perform a backup BEFORE:
- Applying schema migrations
- Large seed or bulk data operations
- Changing lifecycle/provenance critical fields
- Upgrading Postgres major version

## Quick Manual Backup (PowerShell)
Requires `pg_dump` on PATH and `.env` with `EXTERNAL_DB_CONN`.
```
pwsh scripts/db/backup-postgres.ps1
```
Creates: `db-backups/pfmp_<UTC>_manual.dump`

## Restore (Local Sandbox)
```
# Drop & recreate database manually if needed, then:
pg_restore -h 192.168.1.108 -p 5433 -U pfmp_user -d pfmp_dev --clean --if-exists db-backups/pfmp_20250102_120500_manual.dump
```
(Uses password from prompt or PGPASSWORD environment variable.)

## Retention Strategy
Script keeps:
- Last 7 daily backups (non-Sunday)
- Last 4 Sunday weekly backups
Adjust via `-KeepDaily` and `-KeepWeekly` parameters.

## Automated Scheduled Backup Example (Windows Task)
Action:
```
pwsh -File scripts/db/backup-postgres.ps1 -VerboseLog
```
Schedule: Daily 02:00 local. Ensure working directory is repo root (or provide `-OutputDir` absolute path).

## Verifying Integrity
1. Run `pg_restore --list <dump>` to ensure catalog readable.
2. Periodically restore into a disposable database and run integration tests.

## Disaster Recovery Checklist
- Latest manual + automatic dumps exist.
- Credentials for Synology Postgres confirmed.
- Application connection string unchanged (unless infrastructure move). 
- Perform restore drill at least quarterly.

## Environment Variable Reference
The script parses:
```
Host=192.168.1.108;Port=5433;Database=pfmp_dev;Username=pfmp_user;Password=***
```
Ensure the password remains strong and rotated per security policy.
