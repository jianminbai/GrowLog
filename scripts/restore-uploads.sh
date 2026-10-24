#!/bin/sh
set -eu

if [ "$#" -lt 1 ] || [ "$#" -gt 2 ]; then
  echo "Usage: $0 MANIFEST_FILE [TARGET_VOLUME]" >&2
  exit 64
fi

MANIFEST_PATH=$1
TARGET_VOLUME=${2:-growlog_uploads_restore_verify}
PRIMARY_UPLOAD_VOLUME=${PRIMARY_UPLOAD_VOLUME:-growlog_uploads_data}
APP_IMAGE=${APP_IMAGE:-growlog-app:local}
COMPOSE_FILE=${COMPOSE_FILE:-docker-compose.yml}
APP_SERVICE=${APP_SERVICE:-app}

case "$TARGET_VOLUME" in
  ""|*[!A-Za-z0-9_.-]*) echo "Target volume name is invalid." >&2; exit 64 ;;
esac
if [ "$TARGET_VOLUME" = "$PRIMARY_UPLOAD_VOLUME" ] && [ "${ALLOW_RESTORE_OVER_PRIMARY:-false}" != "true" ]; then
  echo "Refusing to replace the primary upload volume without ALLOW_RESTORE_OVER_PRIMARY=true." >&2
  exit 65
fi
if [ ! -s "$MANIFEST_PATH" ]; then echo "Manifest is missing or empty." >&2; exit 66; fi

manifest_value() {
  sed -n "s/^$1=//p" "$MANIFEST_PATH" | tail -n 1
}

VERSION=$(manifest_value version)
BACKUP_ID=$(manifest_value backup_id)
DUMP_NAME=$(manifest_value database_dump)
DUMP_SHA=$(manifest_value database_sha256)
UPLOADS_NAME=$(manifest_value uploads_archive)
UPLOADS_SHA=$(manifest_value uploads_sha256)

case "$VERSION:$BACKUP_ID" in
  1:*) ;;
  *) echo "Unsupported or malformed backup manifest." >&2; exit 65 ;;
esac
case "$BACKUP_ID" in ""|*[!A-Za-z0-9._-]*) echo "Invalid backup ID." >&2; exit 65 ;; esac
case "$DUMP_NAME:$UPLOADS_NAME" in
  *"/"*|*"\\"*) echo "Manifest file names must be safe basenames." >&2; exit 65 ;;
esac
case "$DUMP_SHA:$UPLOADS_SHA" in
  *[!0-9a-f:]*|*::*|:*|*:) echo "Manifest checksums are invalid." >&2; exit 65 ;;
esac
if [ "${#DUMP_SHA}" -ne 64 ] || [ "${#UPLOADS_SHA}" -ne 64 ]; then
  echo "Manifest checksums are invalid." >&2
  exit 65
fi

BUNDLE_DIR=$(dirname "$MANIFEST_PATH")
DUMP_PATH=$BUNDLE_DIR/$DUMP_NAME
UPLOADS_PATH=$BUNDLE_DIR/$UPLOADS_NAME
if [ ! -s "$DUMP_PATH" ] || [ ! -s "$UPLOADS_PATH" ]; then
  echo "The coordinated backup bundle is incomplete." >&2
  exit 66
fi
if [ "$(sha256sum "$DUMP_PATH" | awk '{print $1}')" != "$DUMP_SHA" ] || \
   [ "$(sha256sum "$UPLOADS_PATH" | awk '{print $1}')" != "$UPLOADS_SHA" ]; then
  echo "Backup checksum verification failed." >&2
  exit 65
fi

tar -tf "$UPLOADS_PATH" >/dev/null 2>&1 || { echo "Upload archive is unreadable." >&2; exit 65; }
tar -tf "$UPLOADS_PATH" | while IFS= read -r member; do
  case "$member" in
    ""|/*|../*|*/../*|*/..|*"\\"*) echo "Upload archive contains an unsafe path." >&2; exit 65 ;;
  esac
done
if ! tar -tvf "$UPLOADS_PATH" | awk '{ kind=substr($1,1,1); if (kind != "-" && kind != "d") exit 1 }'; then
  echo "Upload archive contains an unsupported entry type." >&2
  exit 65
fi

APP_STOPPED=false
restart_app() {
  if [ "$APP_STOPPED" = "true" ]; then
    docker compose -f "$COMPOSE_FILE" up -d "$APP_SERVICE" >/dev/null
  fi
}
trap restart_app EXIT HUP INT TERM
if [ "$TARGET_VOLUME" = "$PRIMARY_UPLOAD_VOLUME" ]; then
  docker compose -f "$COMPOSE_FILE" stop "$APP_SERVICE" >/dev/null
  APP_STOPPED=true
fi

docker volume rm -f "$TARGET_VOLUME" >/dev/null 2>&1 || true
docker volume create "$TARGET_VOLUME" >/dev/null
docker run --rm -i -v "$TARGET_VOLUME:/restore" --entrypoint sh "$APP_IMAGE" \
  -c 'set -eu; find /restore -mindepth 1 -maxdepth 1 -exec rm -rf -- {} +; tar -C /restore -xf -' \
  < "$UPLOADS_PATH"

printf '%s\n' "$TARGET_VOLUME"
