#!/bin/bash
# ============================================================
# PFMP PostgreSQL Restore — runs ON the Synology NAS
# Restores a pg_dump backup into the pfmp-postgresql container.
#
# Usage:
#   bash restore.sh                              # Restores the latest backup
#   bash restore.sh pfmp_dev_20260403_020000.dump # Restores a specific file
# ============================================================

set -euo pipefail

CONTAINER_NAME="pfmp-postgresql"
DB_NAME="pfmp_dev"
DB_USER="pfmp_user"
BACKUP_DIR="/volume1/docker/pfmp-postgresql/backups"

# Determine which backup to restore
if [ -n "${1:-}" ]; then
  DUMP_FILE="${BACKUP_DIR}/${1}"
else
  DUMP_FILE=$(ls -t "${BACKUP_DIR}"/pfmp_dev_*.dump 2>/dev/null | head -1)
fi

if [ -z "${DUMP_FILE}" ] || [ ! -f "${DUMP_FILE}" ]; then
  echo "ERROR: No backup file found."
  echo "Usage: $0 [filename.dump]"
  echo "Available backups:"
  ls -lht "${BACKUP_DIR}"/pfmp_dev_*.dump 2>/dev/null || echo "  (none)"
  exit 1
fi

echo "[$(date)] Restoring from: ${DUMP_FILE}"
echo "WARNING: This will overwrite the current ${DB_NAME} database."
echo "Press Ctrl+C within 5 seconds to abort..."
sleep 5

# Copy dump into the container, restore, then clean up
docker cp "${DUMP_FILE}" "${CONTAINER_NAME}:/tmp/restore.dump"

docker exec "${CONTAINER_NAME}" \
  pg_restore -U "${DB_USER}" -d "${DB_NAME}" \
    --clean --if-exists --no-owner --no-privileges \
    /tmp/restore.dump

docker exec "${CONTAINER_NAME}" rm -f /tmp/restore.dump

echo "[$(date)] Restore complete."
