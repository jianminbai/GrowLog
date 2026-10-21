# GrowLog deployment and recovery

## Prepare configuration

Copy `.env.production.example` to a file outside version control, replace every placeholder, and run Compose with `--env-file`. Use a URL-safe PostgreSQL password or percent-encode it in `DATABASE_URL`; the database host inside Compose is `postgres`.

Generate the administrator hash locally without storing the plain password:

```sh
node --input-type=module -e 'import { hash } from "@node-rs/argon2"; const chunks=[]; for await (const chunk of process.stdin) chunks.push(chunk); console.log(await hash(Buffer.concat(chunks).toString("utf8").trim()))'
```

Pipe the password into the command, then place only the resulting Argon2id hash in the environment file. Keep the hash inside single quotes so Compose treats its `$` characters literally. Set `SITE_ADDRESS` to the public DNS name for automatic HTTPS, or `:80` for a local HTTP deployment.

## Start and verify

```sh
docker compose --env-file /secure/path/growlog.env up -d --build
docker compose --env-file /secure/path/growlog.env ps
curl --fail https://example.com/api/health
```

The app container applies checked-in Prisma migrations and idempotently creates or updates the configured household before starting. `/api/health` returns success only when PostgreSQL answers a query. PostgreSQL, Caddy certificates, and Caddy configuration use named volumes.

The image uses Node.js 24. If the build network is intercepted by an organization CA, pass that public CA to BuildKit as a temporary secret, then start Compose without rebuilding:

```sh
docker build --secret id=npm_ca,src=/path/to/organization-ca.crt -t growlog-app:local .
docker compose --env-file /secure/path/growlog.env up -d --no-build
```

The CA is available only during dependency installation and is not copied into an image layer. A normal Internet connection needs no build secret.

## Backup

Run from the repository root with the same Compose environment:

```sh
POSTGRES_USER=growlog POSTGRES_DB=growlog \
  docker compose --env-file /secure/path/growlog.env exec -T postgres pg_isready
POSTGRES_USER=growlog POSTGRES_DB=growlog \
  ./scripts/backup.sh
```

The script writes a timestamped custom-format dump under `backups/`, verifies that it is non-empty, and writes a SHA-256 sidecar. Store both files on separate protected storage.

## Restore and verify

Restore to a separate named database first:

```sh
POSTGRES_USER=growlog POSTGRES_DB=growlog \
  ./scripts/restore.sh backups/growlog-YYYYMMDDTHHMMSSZ.dump growlog_restore_verify
docker compose exec -T postgres psql -U growlog -d growlog_restore_verify \
  -c 'SELECT COUNT(*) FROM "_prisma_migrations";'
```

The restore script validates the target name, recreates only that named database, restores with `--exit-on-error`, and prints the migration count. After reviewing the restored data, remove the verification database with `dropdb`. Replacing the configured primary database requires the explicit environment variable `ALLOW_RESTORE_OVER_PRIMARY=true`; stop the app before that disaster-recovery operation and take another backup first.

Compare representative counts in the source and verification databases before removing the verification database:

```sh
docker compose exec -T postgres psql -U growlog -d growlog \
  -c 'SELECT (SELECT COUNT(*) FROM "_prisma_migrations") AS migrations, (SELECT COUNT(*) FROM "Household") AS households, (SELECT COUNT(*) FROM "Child") AS children;'
docker compose exec -T postgres psql -U growlog -d growlog_restore_verify \
  -c 'SELECT (SELECT COUNT(*) FROM "_prisma_migrations") AS migrations, (SELECT COUNT(*) FROM "Household") AS households, (SELECT COUNT(*) FROM "Child") AS children;'
docker compose exec -T postgres dropdb -U growlog --if-exists --force growlog_restore_verify
```
