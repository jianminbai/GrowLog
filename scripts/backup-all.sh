#!/bin/sh
set -eu

COMPOSE_FILE=${COMPOSE_FILE:-docker-compose.yml}
APP_SERVICE=${APP_SERVICE:-app}
BACKUP_DIR=${BACKUP_DIR:-./backups}
TIMESTAMP=$(date -u +%Y%m%dT%H%M%SZ)
BACKUP_ID=${1:-growlog-$TIMESTAMP}

case "$BACKUP_ID" in
  ""|*[!A-Za-z0-9._-]*) echo "Backup ID may contain only letters, numbers, dots, underscores, and hyphens." >&2; exit 64 ;;
esac

umask 077
mkdir -p "$BACKUP_DIR"
DUMP_PATH=$BACKUP_DIR/$BACKUP_ID.dump
UPLOADS_PATH=$BACKUP_DIR/$BACKUP_ID-uploads.tar
MANIFEST_PATH=$BACKUP_DIR/$BACKUP_ID.manifest
APP_STOPPED=false

restart_app() {
  if [ "$APP_STOPPED" = "true" ]; then
    docker compose -f "$COMPOSE_FILE" up -d "$APP_SERVICE" >/dev/null
  fi
}
trap restart_app EXIT HUP INT TERM

docker compose -f "$COMPOSE_FILE" stop "$APP_SERVICE" >/dev/null
APP_STOPPED=true

COMPOSE_FILE=$COMPOSE_FILE ./scripts/backup.sh "$DUMP_PATH" >/dev/null
docker compose -f "$COMPOSE_FILE" run --rm --no-deps --entrypoint sh "$APP_SERVICE" \
  -c 'set -eu; mkdir -p "${UPLOAD_DIR:-/data/uploads}"; tar -C "${UPLOAD_DIR:-/data/uploads}" -cf - .' \
  > "$UPLOADS_PATH"
test -s "$DUMP_PATH"
test -s "$UPLOADS_PATH"

sha256sum "$DUMP_PATH" > "$DUMP_PATH.sha256"
sha256sum "$UPLOADS_PATH" > "$UPLOADS_PATH.sha256"
DUMP_SHA=$(sha256sum "$DUMP_PATH" | awk '{print $1}')
UPLOADS_SHA=$(sha256sum "$UPLOADS_PATH" | awk '{print $1}')

{
  printf 'version=1\n'
  printf 'backup_id=%s\n' "$BACKUP_ID"
  printf 'database_dump=%s\n' "$(basename "$DUMP_PATH")"
  printf 'database_sha256=%s\n' "$DUMP_SHA"
  printf 'uploads_archive=%s\n' "$(basename "$UPLOADS_PATH")"
  printf 'uploads_sha256=%s\n' "$UPLOADS_SHA"
} > "$MANIFEST_PATH"
sha256sum "$MANIFEST_PATH" > "$MANIFEST_PATH.sha256"

printf '%s\n' "$MANIFEST_PATH"
