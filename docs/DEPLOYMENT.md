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

The app container applies checked-in Prisma migrations and idempotently creates or updates the configured household before starting. `/api/health` returns success only when PostgreSQL answers a query. PostgreSQL, uploaded kindergarten images, Caddy certificates, and Caddy configuration use named volumes. `UPLOAD_DIR` defaults to `/data/uploads` inside the app container and is mounted from `uploads_data`; uploads are never placed under `public/`.

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
POSTGRES_USER=growlog POSTGRES_DB=growlog BACKUP_DIR=/secure/backups \
  ./scripts/backup-all.sh
```

The coordinated script briefly stops the app to pause database and image writes, then creates a PostgreSQL custom-format dump, an upload-volume tar archive, SHA-256 sidecars, and a shared manifest under one backup ID. Its exit trap restarts the app even when a backup step fails. Copy the complete bundle off the VPS; a database dump without its matching image archive leaves document metadata pointing to missing images, while an image archive without its database dump cannot restore ownership and dates.

## Restore and verify

Restore to a separate named database first:

```sh
POSTGRES_USER=growlog POSTGRES_DB=growlog \
  ./scripts/restore.sh backups/growlog-YYYYMMDDTHHMMSSZ.dump growlog_restore_verify
docker compose exec -T postgres psql -U growlog -d growlog_restore_verify \
  -c 'SELECT COUNT(*) FROM "_prisma_migrations";'
```

Restore the matching upload archive into the default verification volume. The command verifies both halves against the manifest and rejects absolute paths, parent traversal, links, and special tar entries before invoking Docker:

```sh
./scripts/restore-uploads.sh backups/growlog-YYYYMMDDTHHMMSSZ.manifest
docker volume inspect growlog_uploads_restore_verify
```

Use a temporary Compose override that mounts `growlog_uploads_restore_verify` at `/data/uploads` and points `DATABASE_URL` to `growlog_restore_verify`, start the verification app, authenticate, and open representative images from **设置 → 幼儿园资料**. Compare both database row counts and image checksums before accepting the backup. Replacing the live upload volume requires `ALLOW_RESTORE_OVER_PRIMARY=true` and the explicit target `growlog_uploads_data`; the script stops and restarts the app around that replacement.

The restore script validates the target name, recreates only that named database, restores with `--exit-on-error`, and prints the migration count. After reviewing the restored data, remove the verification database with `dropdb`. Replacing the configured primary database requires the explicit environment variable `ALLOW_RESTORE_OVER_PRIMARY=true`; stop the app before that disaster-recovery operation and take another backup first.

Compare representative counts in the source and verification databases before removing the verification database:

```sh
docker compose exec -T postgres psql -U growlog -d growlog \
  -c 'SELECT (SELECT COUNT(*) FROM "_prisma_migrations") AS migrations, (SELECT COUNT(*) FROM "Household") AS households, (SELECT COUNT(*) FROM "Child") AS children;'
docker compose exec -T postgres psql -U growlog -d growlog_restore_verify \
  -c 'SELECT (SELECT COUNT(*) FROM "_prisma_migrations") AS migrations, (SELECT COUNT(*) FROM "Household") AS households, (SELECT COUNT(*) FROM "Child") AS children;'
docker compose exec -T postgres dropdb -U growlog --if-exists --force growlog_restore_verify
```
