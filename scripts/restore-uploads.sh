#!/bin/sh
set -eu

if [ "$#" -lt 1 ] || [ "$#" -gt 2 ]; then
  echo "Usage: $0 MANIFEST_FILE [TARGET_VOLUME]" >&2
  exit 64
fi

MANIFEST_PATH=$1
TARGET_VOLUME=${2:-growlog_uploads_restore_verify}
PRIMARY_UPLOAD_VOLUME=${PRIMARY_UPLOAD_VOLUME:-growlog_uploads_data}
PRIMARY_UPLOAD_PROJECT=${PRIMARY_UPLOAD_PROJECT:-growlog}
APP_IMAGE=${APP_IMAGE:-growlog-app:local}
COMPOSE_FILE=${COMPOSE_FILE:-docker-compose.yml}
APP_SERVICE=${APP_SERVICE:-app}
RESTORE_LOCK_ROOT=${RESTORE_LOCK_ROOT:-${TMPDIR:-/tmp}/growlog-restore-locks}

case "$TARGET_VOLUME" in
  ""|*[!A-Za-z0-9_.-]*) echo "Target volume name is invalid." >&2; exit 64 ;;
esac

mkdir -p "$RESTORE_LOCK_ROOT"
RESTORE_LOCK_DIR=$RESTORE_LOCK_ROOT/$TARGET_VOLUME.lock
if ! mkdir "$RESTORE_LOCK_DIR" 2>/dev/null; then
  echo "Another restore is already operating on target volume $TARGET_VOLUME." >&2
  exit 75
fi
APP_STOPPED=false
cleanup() {
  status=$?
  trap - EXIT HUP INT TERM
  if [ "$APP_STOPPED" = "true" ]; then
    docker compose -f "$COMPOSE_FILE" up -d "$APP_SERVICE" >/dev/null || status=$?
  fi
  rmdir "$RESTORE_LOCK_DIR" 2>/dev/null || true
  exit "$status"
}
trap cleanup EXIT HUP INT TERM

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

VOLUME_EXISTS=false
IS_PRIMARY=false
COMPOSE_PROJECT=
if VOLUME_LABELS=$(docker volume inspect --format '{{ index .Labels "com.docker.compose.volume" }}|{{ index .Labels "com.growlog.volume-role" }}|{{ index .Labels "com.docker.compose.project" }}' "$TARGET_VOLUME" 2>/dev/null); then
  VOLUME_EXISTS=true
  COMPOSE_VOLUME=${VOLUME_LABELS%%|*}
  REST=${VOLUME_LABELS#*|}
  VOLUME_ROLE=${REST%%|*}
  COMPOSE_PROJECT=${REST#*|}
  if [ "$COMPOSE_VOLUME" = "uploads_data" ]; then
    if [ "$TARGET_VOLUME" != "$PRIMARY_UPLOAD_VOLUME" ] || [ "$COMPOSE_PROJECT" != "$PRIMARY_UPLOAD_PROJECT" ]; then
      echo "Refusing an uploads_data volume whose name or Compose project does not match the configured primary." >&2
      exit 65
    fi
    IS_PRIMARY=true
  elif [ -z "$COMPOSE_VOLUME" ] && [ "$VOLUME_ROLE" = "uploads-restore" ]; then
    IS_PRIMARY=false
  else
    echo "Refusing to replace an existing volume that is not labeled for GrowLog uploads." >&2
    exit 65
  fi
  if [ "${ALLOW_REPLACE_EXISTING_UPLOAD_VOLUME:-false}" != "true" ]; then
    echo "Refusing to replace an existing upload volume without ALLOW_REPLACE_EXISTING_UPLOAD_VOLUME=true." >&2
    exit 65
  fi
fi
if [ "$TARGET_VOLUME" = "$PRIMARY_UPLOAD_VOLUME" ]; then
  IS_PRIMARY=true
  COMPOSE_PROJECT=$PRIMARY_UPLOAD_PROJECT
fi
if [ "$IS_PRIMARY" = "true" ] && [ "${ALLOW_RESTORE_OVER_PRIMARY:-false}" != "true" ]; then
  echo "Refusing to replace the primary upload volume without ALLOW_RESTORE_OVER_PRIMARY=true." >&2
  exit 65
fi

if [ "$IS_PRIMARY" = "true" ]; then
  RUNNING_SERVICES=$(docker compose -f "$COMPOSE_FILE" ps --status running --services)
  case "
$RUNNING_SERVICES
" in
    *"
$APP_SERVICE
"*) docker compose -f "$COMPOSE_FILE" stop "$APP_SERVICE" >/dev/null; APP_STOPPED=true ;;
  esac
fi

if [ "$VOLUME_EXISTS" = "false" ]; then
  if [ "$IS_PRIMARY" = "true" ]; then
    docker volume create \
      --label "com.docker.compose.project=$COMPOSE_PROJECT" \
      --label "com.docker.compose.volume=uploads_data" \
      --label "com.growlog.volume-role=uploads" \
      "$TARGET_VOLUME" >/dev/null
  else
    docker volume create --label com.growlog.volume-role=uploads-restore "$TARGET_VOLUME" >/dev/null
  fi

  CREATED_LABELS=$(docker volume inspect --format '{{ index .Labels "com.docker.compose.volume" }}|{{ index .Labels "com.growlog.volume-role" }}|{{ index .Labels "com.docker.compose.project" }}' "$TARGET_VOLUME" 2>/dev/null) || {
    echo "Could not verify the newly created upload volume." >&2
    exit 65
  }
  CREATED_COMPOSE_VOLUME=${CREATED_LABELS%%|*}
  CREATED_REST=${CREATED_LABELS#*|}
  CREATED_ROLE=${CREATED_REST%%|*}
  CREATED_PROJECT=${CREATED_REST#*|}
  if [ "$IS_PRIMARY" = "true" ]; then
    if [ "$CREATED_COMPOSE_VOLUME" != "uploads_data" ] || [ "$CREATED_PROJECT" != "$PRIMARY_UPLOAD_PROJECT" ]; then
      echo "The primary upload volume labels changed during creation; refusing to mount it." >&2
      exit 65
    fi
  elif [ -n "$CREATED_COMPOSE_VOLUME" ] || [ "$CREATED_ROLE" != "uploads-restore" ]; then
    echo "The verification upload volume labels changed during creation; refusing to mount it." >&2
    exit 65
  fi
fi
docker run --rm -i -v "$TARGET_VOLUME:/restore" --entrypoint sh "$APP_IMAGE" \
  -c 'set -eu; find /restore -mindepth 1 -maxdepth 1 -exec rm -rf -- {} +; tar -C /restore -xf -' \
  < "$UPLOADS_PATH"

printf '%s\n' "$TARGET_VOLUME"
