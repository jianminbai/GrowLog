#!/bin/sh
set -eu

if [ "$#" -ne 2 ]; then
  echo "Usage: $0 BACKUP_FILE TARGET_DATABASE" >&2
  exit 64
fi

BACKUP_FILE=$1
TARGET_DATABASE=$2
COMPOSE_FILE=${COMPOSE_FILE:-docker-compose.yml}
DB_SERVICE=${DB_SERVICE:-postgres}
POSTGRES_USER=${POSTGRES_USER:-growlog}
POSTGRES_DB=${POSTGRES_DB:-growlog}

case "$TARGET_DATABASE" in
  ""|*[!A-Za-z0-9_]*|[0-9]*) echo "Target database must use letters, numbers, and underscores and cannot start with a number." >&2; exit 64 ;;
esac
if [ ! -s "$BACKUP_FILE" ]; then echo "Backup file is missing or empty." >&2; exit 66; fi
if [ "$TARGET_DATABASE" = "$POSTGRES_DB" ] && [ "${ALLOW_RESTORE_OVER_PRIMARY:-false}" != "true" ]; then
  echo "Refusing to replace the primary database without ALLOW_RESTORE_OVER_PRIMARY=true." >&2
  exit 65
fi

docker compose -f "$COMPOSE_FILE" exec -T "$DB_SERVICE" \
  dropdb --username "$POSTGRES_USER" --if-exists --force "$TARGET_DATABASE"
docker compose -f "$COMPOSE_FILE" exec -T "$DB_SERVICE" \
  createdb --username "$POSTGRES_USER" "$TARGET_DATABASE"
docker compose -f "$COMPOSE_FILE" exec -T "$DB_SERVICE" \
  pg_restore --username "$POSTGRES_USER" --dbname "$TARGET_DATABASE" \
  --no-owner --no-privileges --exit-on-error < "$BACKUP_FILE"
docker compose -f "$COMPOSE_FILE" exec -T "$DB_SERVICE" \
  psql --username "$POSTGRES_USER" --dbname "$TARGET_DATABASE" --tuples-only --no-align \
  --command 'SELECT COUNT(*) FROM "_prisma_migrations";'
