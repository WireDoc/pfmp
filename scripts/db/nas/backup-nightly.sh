#!/bin/bash
# ============================================================
# PFMP Nightly PostgreSQL Backup — runs ON the Synology NAS
# Designed for DSM Task Scheduler (root user) or cron.
#
# Performs a pg_dump inside the running pfmp-postgresql container,
# compresses it, and rotates old backups.
# ============================================================

set -euo pipefail

# --- Configuration ---
CONTAINER_NAME="pfmp-postgresql"
DB_NAME="pfmp_dev"
DB_USER="pfmp_user"
BACKUP_DIR="/volume1/docker/pfmp-postgresql/backups"
KEEP_DAYS=14          # Delete backups older than this

# --- Run ---
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
FILENAME="pfmp_dev_${TIMESTAMP}.dump"
BACKUP_PATH="${BACKUP_DIR}/${FILENAME}"

mkdir -p "${BACKUP_DIR}"

echo "[$(date)] Starting PFMP database backup..."

# pg_dump using custom format (-Fc) for fast selective restore
docker exec "${CONTAINER_NAME}" \
  pg_dump -Fc -U "${DB_USER}" "${DB_NAME}" \
  > "${BACKUP_PATH}"

# Verify the dump file is non-empty
if [ ! -s "${BACKUP_PATH}" ]; then
  echo "[$(date)] ERROR: Backup file is empty — pg_dump may have failed."
  exit 1
fi

SIZE=$(du -h "${BACKUP_PATH}" | cut -f1)
echo "[$(date)] Backup complete: ${BACKUP_PATH} (${SIZE})"

# Rotate: delete backups older than KEEP_DAYS
DELETED=$(find "${BACKUP_DIR}" -name "pfmp_dev_*.dump" -mtime "+${KEEP_DAYS}" -print -delete | wc -l)
if [ "${DELETED}" -gt 0 ]; then
  echo "[$(date)] Rotated ${DELETED} backup(s) older than ${KEEP_DAYS} days."
fi

echo "[$(date)] Done."
