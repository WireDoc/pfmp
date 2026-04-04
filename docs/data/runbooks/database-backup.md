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

---

## Automated NAS Backup (Synology — Recommended)

The PFMP PostgreSQL container runs on a Synology NAS. Nightly backups should run
**on the NAS itself** so they work even when your laptop is off.

Scripts: `scripts/db/nas/backup-nightly.sh` and `scripts/db/nas/restore.sh`

### One-time deployment

1. **SSH into the NAS** (or use DSM > Control Panel > Terminal & SNMP to enable SSH):
   ```bash
   ssh admin@192.168.1.108
   ```

2. **Create the backup directory and copy the scripts**:
   ```bash
   sudo mkdir -p /volume1/docker/pfmp-postgresql/backups
   sudo mkdir -p /volume1/docker/pfmp-postgresql/scripts
   ```
   Copy the scripts from your repo to the NAS:
   ```powershell
   # From your laptop (PowerShell)
   scp scripts/db/nas/backup-nightly.sh admin@192.168.1.108:/volume1/docker/pfmp-postgresql/scripts/
   scp scripts/db/nas/restore.sh admin@192.168.1.108:/volume1/docker/pfmp-postgresql/scripts/
   ```

3. **Make scripts executable** (on the NAS):
   ```bash
   sudo chmod +x /volume1/docker/pfmp-postgresql/scripts/backup-nightly.sh
   sudo chmod +x /volume1/docker/pfmp-postgresql/scripts/restore.sh
   ```

4. **Create a scheduled task in DSM**:
   - Open **DSM > Control Panel > Task Scheduler**
   - Click **Create > Scheduled Task > User-defined script**
   - **General tab**: Name = `PFMP DB Backup`, User = `root`
   - **Schedule tab**: Run daily at **02:00**
   - **Task Settings tab**, User-defined script:
     ```
     bash /volume1/docker/pfmp-postgresql/scripts/backup-nightly.sh
     ```
   - (Optional) Under **Task Settings > Send run details by email**, enter your
     email to get notified on success/failure.
   - Click **OK**.

5. **Test it**: In DSM Task Scheduler, select the task and click **Run**. Check that
   a `.dump` file appears in `/volume1/docker/pfmp-postgresql/backups/`.

### Restore from NAS backup

SSH into the NAS and run:
```bash
# Restore the most recent backup
bash /volume1/docker/pfmp-postgresql/scripts/restore.sh

# Restore a specific backup
bash /volume1/docker/pfmp-postgresql/scripts/restore.sh pfmp_dev_20260403_020000.dump
```

The script has a 5-second safety delay before overwriting the database.

### Restore from laptop (without SSH)

If `pg_restore` is on your PATH:
```powershell
# First, download the dump from the NAS (via SMB or SCP)
scp admin@192.168.1.108:/volume1/docker/pfmp-postgresql/backups/pfmp_dev_20260403_020000.dump .

# Restore
$env:PGPASSWORD = 'MediaPword.1'
pg_restore -h 192.168.1.108 -p 5433 -U pfmp_user -d pfmp_dev --clean --if-exists pfmp_dev_20260403_020000.dump
```

### Backup configuration

| Setting | Default | Location |
|---------|---------|----------|
| Retention | 14 days | `KEEP_DAYS` in `backup-nightly.sh` |
| Schedule | Daily 02:00 | DSM Task Scheduler |
| Backup dir | `/volume1/docker/pfmp-postgresql/backups/` | `BACKUP_DIR` in script |
| Format | pg_dump custom (`-Fc`) | Supports selective table restore |

### Future: WAL Continuous Archiving (PITR)

For point-in-time recovery (e.g., restore to the exact second before a bad
update), enable PostgreSQL WAL archiving. This requires changes to the
`pfmp-postgres docker compose.yml`:

1. Add volume mounts for WAL archive and custom config
2. Create a `postgresql.conf` with `wal_level = replica` and `archive_mode = on`
3. Combine with a weekly base backup for full PITR capability

This is recommended before going to production. The nightly pg_dump approach
above is sufficient for development.
