#!/bin/sh
set -eu

COMPOSE_FILE=${COMPOSE_FILE:-docker-compose.yml}
APP_SERVICE=${APP_SERVICE:-app}
BACKUP_DIR=${BACKUP_DIR:-./backups}
TIMESTAMP=$(date -u +%Y%m%dT%H%M%SZ)
BACKUP_ID=${1:-growlog-$TIMESTAMP}
BACKUP_LOCK_ROOT=${BACKUP_LOCK_ROOT:-${TMPDIR:-/tmp}/growlog-backup-locks}

case "$BACKUP_ID" in
  ""|*[!A-Za-z0-9._-]*) echo "Backup ID may contain only letters, numbers, dots, underscores, and hyphens." >&2; exit 64 ;;
esac

umask 077
mkdir -p "$BACKUP_DIR"
if [ -n "${BACKUP_LOCK_DIR:-}" ]; then
  LOCK_DIR=$BACKUP_LOCK_DIR
else
  COMPOSE_DIRECTORY=$(dirname "$COMPOSE_FILE")
  COMPOSE_FILENAME=$(basename "$COMPOSE_FILE")
  if CANONICAL_DIRECTORY=$(CDPATH= cd "$COMPOSE_DIRECTORY" 2>/dev/null && pwd -P); then
    LOCK_SOURCE=$CANONICAL_DIRECTORY/$COMPOSE_FILENAME:$APP_SERVICE
  else
    LOCK_SOURCE=$COMPOSE_FILE:$APP_SERVICE
  fi
  LOCK_KEY=$(printf '%s\n' "$LOCK_SOURCE" | sha256sum | awk '{print $1}')
  mkdir -p "$BACKUP_LOCK_ROOT"
  LOCK_DIR=$BACKUP_LOCK_ROOT/$LOCK_KEY.lock
fi
if ! mkdir "$LOCK_DIR" 2>/dev/null; then
  echo "Another coordinated backup is already running." >&2
  exit 75
fi

APP_STOPPED=false
BUNDLE_TMP=
cleanup() {
  status=$?
  trap - EXIT HUP INT TERM
  if [ "$APP_STOPPED" = "true" ]; then
    docker compose -f "$COMPOSE_FILE" up -d "$APP_SERVICE" >/dev/null || status=$?
  fi
  if [ -n "$BUNDLE_TMP" ] && [ -d "$BUNDLE_TMP" ]; then
    find "$BUNDLE_TMP" -depth -delete 2>/dev/null || true
  fi
  rmdir "$LOCK_DIR" 2>/dev/null || true
  exit "$status"
}
trap cleanup EXIT HUP INT TERM

BUNDLE_TMP=$(mktemp -d "$BACKUP_DIR/.$BACKUP_ID.tmp.XXXXXX")
RUNNING_SERVICES=$BUNDLE_TMP/running-services
docker compose -f "$COMPOSE_FILE" ps --status running --services > "$RUNNING_SERVICES"
if grep -Fxq "$APP_SERVICE" "$RUNNING_SERVICES"; then
  docker compose -f "$COMPOSE_FILE" stop "$APP_SERVICE" >/dev/null
  APP_STOPPED=true
fi

DUMP_NAME=$BACKUP_ID.dump
UPLOADS_NAME=$BACKUP_ID-uploads.tar
MANIFEST_NAME=$BACKUP_ID.manifest
DUMP_TMP=$BUNDLE_TMP/$DUMP_NAME
UPLOADS_TMP=$BUNDLE_TMP/$UPLOADS_NAME
MANIFEST_TMP=$BUNDLE_TMP/$MANIFEST_NAME

COMPOSE_FILE=$COMPOSE_FILE ./scripts/backup.sh "$DUMP_TMP" >/dev/null
docker compose -f "$COMPOSE_FILE" run --rm --no-deps --entrypoint sh "$APP_SERVICE" \
  -c 'set -eu; tar -C /data/uploads -cf - .' > "$UPLOADS_TMP"
test -s "$DUMP_TMP"
test -s "$UPLOADS_TMP"

DUMP_SHA=$(sha256sum "$DUMP_TMP" | awk '{print $1}')
UPLOADS_SHA=$(sha256sum "$UPLOADS_TMP" | awk '{print $1}')
printf '%s  %s\n' "$DUMP_SHA" "$DUMP_NAME" > "$DUMP_TMP.sha256"
printf '%s  %s\n' "$UPLOADS_SHA" "$UPLOADS_NAME" > "$UPLOADS_TMP.sha256"

{
  printf 'version=1\n'
  printf 'backup_id=%s\n' "$BACKUP_ID"
  printf 'database_dump=%s\n' "$DUMP_NAME"
  printf 'database_sha256=%s\n' "$DUMP_SHA"
  printf 'uploads_archive=%s\n' "$UPLOADS_NAME"
  printf 'uploads_sha256=%s\n' "$UPLOADS_SHA"
} > "$MANIFEST_TMP"
MANIFEST_SHA=$(sha256sum "$MANIFEST_TMP" | awk '{print $1}')
printf '%s  %s\n' "$MANIFEST_SHA" "$MANIFEST_NAME" > "$MANIFEST_TMP.sha256"

mv "$DUMP_TMP" "$BACKUP_DIR/$DUMP_NAME"
mv "$DUMP_TMP.sha256" "$BACKUP_DIR/$DUMP_NAME.sha256"
mv "$UPLOADS_TMP" "$BACKUP_DIR/$UPLOADS_NAME"
mv "$UPLOADS_TMP.sha256" "$BACKUP_DIR/$UPLOADS_NAME.sha256"
mv "$MANIFEST_TMP.sha256" "$BACKUP_DIR/$MANIFEST_NAME.sha256"
mv "$MANIFEST_TMP" "$BACKUP_DIR/$MANIFEST_NAME"

printf '%s\n' "$BACKUP_DIR/$MANIFEST_NAME"
