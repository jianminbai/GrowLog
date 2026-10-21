#!/bin/sh
set -eu

COMPOSE_FILE=${COMPOSE_FILE:-docker-compose.yml}
DB_SERVICE=${DB_SERVICE:-postgres}
POSTGRES_USER=${POSTGRES_USER:-growlog}
POSTGRES_DB=${POSTGRES_DB:-growlog}
BACKUP_DIR=${BACKUP_DIR:-./backups}
TIMESTAMP=$(date -u +%Y%m%dT%H%M%SZ)
OUTPUT=${1:-$BACKUP_DIR/growlog-$TIMESTAMP.dump}

umask 077
mkdir -p "$(dirname "$OUTPUT")"
docker compose -f "$COMPOSE_FILE" exec -T "$DB_SERVICE" \
  pg_dump --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  --format=custom --no-owner --no-privileges > "$OUTPUT"
test -s "$OUTPUT"
sha256sum "$OUTPUT" > "$OUTPUT.sha256"
printf '%s\n' "$OUTPUT"
