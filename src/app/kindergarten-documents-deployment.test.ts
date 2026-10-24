import { createHash } from "node:crypto";
import { access, chmod, mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { execFile as execFileCallback } from "node:child_process";

import { afterEach, describe, expect, it } from "vitest";

const execFile = promisify(execFileCallback);
const repositoryRoot = path.resolve(import.meta.dirname, "../..");
const temporaryRoots: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

async function workspace() {
  const root = await mkdtemp(path.join(tmpdir(), "growlog-deployment-"));
  temporaryRoots.push(root);
  const bin = path.join(root, "bin");
  await mkdir(bin);
  const docker = path.join(bin, "docker");
  await writeFile(docker, `#!/bin/sh
printf '%s\n' "$*" >> "$DOCKER_LOG"
case "$*" in
  *'ps --status running --services'*)
    if [ "\${FAKE_APP_RUNNING:-true}" = "true" ]; then printf 'app\n'; fi ;;
  *'volume inspect --format'*)
    if [ "\${FAKE_VOLUME_EXISTS:-false}" = "true" ]; then
      printf '%s|%s|%s\n' "\${FAKE_VOLUME_COMPOSE_LABEL:-}" "\${FAKE_VOLUME_ROLE_LABEL:-}" "\${FAKE_VOLUME_PROJECT_LABEL:-}"
    elif [ -f "$FAKE_VOLUME_CREATED" ]; then
      printf '|uploads-restore|\n'
    else
      exit 1
    fi ;;
  *'volume create '*) : > "$FAKE_VOLUME_CREATED" ;;
  *pg_dump*)
    if [ "\${FAKE_BLOCK_DUMP:-false}" = "true" ]; then
      : > "$FAKE_DUMP_READY"
      while [ ! -f "$FAKE_DUMP_RELEASE" ]; do sleep 0.05; done
    fi
    printf 'database-dump' ;;
  *'run --rm --no-deps --entrypoint sh app'*) cat "$FAKE_UPLOAD_TAR" ;;
esac
`);
  await chmod(docker, 0o755);
  const uploads = path.join(root, "uploads");
  await mkdir(uploads);
  await writeFile(path.join(uploads, "image.png"), "image-bytes");
  const archive = path.join(root, "source-uploads.tar");
  await execFile("tar", ["-cf", archive, "-C", uploads, "."]);
  await writeFile(path.join(root, "docker.log"), "");
  return {
    root,
    archive,
    log: path.join(root, "docker.log"),
    env: {
      ...process.env,
      PATH: `${bin}:${process.env.PATH}`,
      DOCKER_LOG: path.join(root, "docker.log"),
      FAKE_UPLOAD_TAR: archive,
      FAKE_VOLUME_CREATED: path.join(root, "volume-created")
    }
  };
}

describe("kindergarten document deployment", () => {
  async function waitForFile(file: string) {
    for (let attempt = 0; attempt < 100; attempt += 1) {
      try { await access(file); return; } catch { await new Promise((resolve) => setTimeout(resolve, 20)); }
    }
    throw new Error(`Timed out waiting for ${file}`);
  }

  it("mounts a private persistent upload directory into the application", async () => {
    const [compose, dockerfile, environment] = await Promise.all([
      readFile(path.join(repositoryRoot, "docker-compose.yml"), "utf8"),
      readFile(path.join(repositoryRoot, "Dockerfile"), "utf8"),
      readFile(path.join(repositoryRoot, ".env.production.example"), "utf8")
    ]);
    expect(compose).toContain("UPLOAD_DIR: /data/uploads");
    expect(compose).toContain("uploads_data:/data/uploads");
    expect(compose).toMatch(/volumes:[\s\S]*uploads_data:/);
    expect(dockerfile).toContain("/data/uploads");
    expect(dockerfile.match(/mount=type=secret,id=npm_ca/g)).toHaveLength(2);
    expect(environment).not.toContain("UPLOAD_DIR=");
    expect(compose).not.toContain("/app/public/uploads");
  });

  it("creates a coordinated database and upload bundle while writes are paused", async () => {
    const fixture = await workspace();
    const backupDir = path.join(fixture.root, "backups");
    await execFile("sh", ["scripts/backup-all.sh", "acceptance-20261023"], {
      cwd: repositoryRoot,
      env: { ...fixture.env, BACKUP_DIR: backupDir }
    });

    const dump = path.join(backupDir, "acceptance-20261023.dump");
    const uploads = path.join(backupDir, "acceptance-20261023-uploads.tar");
    const manifestPath = path.join(backupDir, "acceptance-20261023.manifest");
    const [dumpBytes, uploadBytes, manifest, log] = await Promise.all([
      readFile(dump), readFile(uploads), readFile(manifestPath, "utf8"), readFile(fixture.log, "utf8")
    ]);
    expect(manifest).toContain("backup_id=acceptance-20261023");
    expect(manifest).toContain(`database_sha256=${createHash("sha256").update(dumpBytes).digest("hex")}`);
    expect(manifest).toContain(`uploads_sha256=${createHash("sha256").update(uploadBytes).digest("hex")}`);
    await expect(readFile(`${dump}.sha256`, "utf8")).resolves.toContain("acceptance-20261023.dump");
    await expect(readFile(`${uploads}.sha256`, "utf8")).resolves.toContain("acceptance-20261023-uploads.tar");
    expect(log).toContain("compose -f docker-compose.yml stop app");
    expect(log).toContain("compose -f docker-compose.yml up -d app");
    expect(log).toContain("run --rm --no-deps --entrypoint sh app -c set -eu; tar -C /data/uploads -cf - .");
  });

  it("takes an exclusive backup lock and preserves an app that was already stopped", async () => {
    const fixture = await workspace();
    const backupDir = path.join(fixture.root, "backups");
    await mkdir(backupDir);
    const heldLock = path.join(fixture.root, "held-backup.lock");
    await mkdir(heldLock);
    await expect(execFile("sh", ["scripts/backup-all.sh", "locked"], {
      cwd: repositoryRoot, env: { ...fixture.env, BACKUP_DIR: backupDir, BACKUP_LOCK_DIR: heldLock }
    })).rejects.toMatchObject({ code: 75 });
    await expect(readFile(fixture.log, "utf8")).resolves.toBe("");

    await rm(heldLock, { recursive: true });
    await execFile("sh", ["scripts/backup-all.sh", "stopped"], {
      cwd: repositoryRoot,
      env: { ...fixture.env, BACKUP_DIR: backupDir, FAKE_APP_RUNNING: "false" }
    });
    const log = await readFile(fixture.log, "utf8");
    expect(log).not.toContain("stop app");
    expect(log).not.toContain("up -d app");
  });

  it("uses one Compose-scoped lock across different backup directories", async () => {
    const fixture = await workspace();
    const ready = path.join(fixture.root, "dump-ready");
    const release = path.join(fixture.root, "dump-release");
    const lockRoot = path.join(fixture.root, "locks");
    const first = execFile("sh", ["scripts/backup-all.sh", "first"], {
      cwd: repositoryRoot,
      env: {
        ...fixture.env,
        BACKUP_DIR: path.join(fixture.root, "backup-a"),
        BACKUP_LOCK_ROOT: lockRoot,
        FAKE_BLOCK_DUMP: "true",
        FAKE_DUMP_READY: ready,
        FAKE_DUMP_RELEASE: release
      }
    });
    await waitForFile(ready);
    await expect(execFile("sh", ["scripts/backup-all.sh", "second"], {
      cwd: repositoryRoot,
      env: { ...fixture.env, BACKUP_DIR: path.join(fixture.root, "backup-b"), BACKUP_LOCK_ROOT: lockRoot }
    })).rejects.toMatchObject({ code: 75 });
    await writeFile(release, "continue");
    await first;
  });

  it("restores a verified safe archive into a separate volume by default", async () => {
    const fixture = await workspace();
    const backupDir = path.join(fixture.root, "backups");
    await execFile("sh", ["scripts/backup-all.sh", "restore-safe"], {
      cwd: repositoryRoot,
      env: { ...fixture.env, BACKUP_DIR: backupDir }
    });
    await writeFile(fixture.log, "");

    await execFile("sh", ["scripts/restore-uploads.sh", path.join(backupDir, "restore-safe.manifest")], {
      cwd: repositoryRoot,
      env: fixture.env
    });

    const log = await readFile(fixture.log, "utf8");
    expect(log).toContain("volume create --label com.growlog.volume-role=uploads-restore growlog_uploads_restore_verify");
    expect(log).toContain("growlog_uploads_restore_verify:/restore");
    expect(log.match(/volume inspect --format/g)).toHaveLength(2);
  });

  it("never removes an existing unrelated volume, even with destructive flags", async () => {
    const fixture = await workspace();
    const backupDir = path.join(fixture.root, "backups");
    await execFile("sh", ["scripts/backup-all.sh", "volume-guard"], {
      cwd: repositoryRoot, env: { ...fixture.env, BACKUP_DIR: backupDir }
    });
    await writeFile(fixture.log, "");

    await expect(execFile("sh", [
      "scripts/restore-uploads.sh",
      path.join(backupDir, "volume-guard.manifest"),
      "growlog_postgres_data"
    ], {
      cwd: repositoryRoot,
      env: {
        ...fixture.env,
        FAKE_VOLUME_EXISTS: "true",
        FAKE_VOLUME_COMPOSE_LABEL: "postgres_data",
        ALLOW_REPLACE_EXISTING_UPLOAD_VOLUME: "true",
        ALLOW_RESTORE_OVER_PRIMARY: "true"
      }
    })).rejects.toMatchObject({ code: 65 });

    const log = await readFile(fixture.log, "utf8");
    expect(log).toContain("volume inspect --format");
    expect(log).not.toContain("volume rm");
    expect(log).not.toContain("run --rm -i");
  });

  it("rejects another Compose project's uploads volume and locks each restore target", async () => {
    const fixture = await workspace();
    const backupDir = path.join(fixture.root, "backups");
    await execFile("sh", ["scripts/backup-all.sh", "project-guard"], {
      cwd: repositoryRoot, env: { ...fixture.env, BACKUP_DIR: backupDir }
    });
    const manifest = path.join(backupDir, "project-guard.manifest");
    await writeFile(fixture.log, "");
    await expect(execFile("sh", ["scripts/restore-uploads.sh", manifest, "other_uploads"], {
      cwd: repositoryRoot,
      env: {
        ...fixture.env,
        FAKE_VOLUME_EXISTS: "true",
        FAKE_VOLUME_COMPOSE_LABEL: "uploads_data",
        FAKE_VOLUME_PROJECT_LABEL: "another_project",
        ALLOW_REPLACE_EXISTING_UPLOAD_VOLUME: "true",
        ALLOW_RESTORE_OVER_PRIMARY: "true"
      }
    })).rejects.toMatchObject({ code: 65 });
    expect(await readFile(fixture.log, "utf8")).not.toContain("run --rm -i");

    const lockRoot = path.join(fixture.root, "restore-locks");
    await mkdir(lockRoot);
    await mkdir(path.join(lockRoot, "growlog_uploads_restore_verify.lock"));
    await writeFile(fixture.log, "");
    await expect(execFile("sh", ["scripts/restore-uploads.sh", manifest], {
      cwd: repositoryRoot,
      env: { ...fixture.env, RESTORE_LOCK_ROOT: lockRoot }
    })).rejects.toMatchObject({ code: 75 });
    expect(await readFile(fixture.log, "utf8")).toBe("");
  });

  it("requires an explicit flag before replacing a labeled upload volume", async () => {
    const fixture = await workspace();
    const backupDir = path.join(fixture.root, "backups");
    await execFile("sh", ["scripts/backup-all.sh", "existing-upload"], {
      cwd: repositoryRoot, env: { ...fixture.env, BACKUP_DIR: backupDir }
    });
    await writeFile(fixture.log, "");
    const manifest = path.join(backupDir, "existing-upload.manifest");
    const existingEnv = {
      ...fixture.env,
      FAKE_VOLUME_EXISTS: "true",
      FAKE_VOLUME_ROLE_LABEL: "uploads-restore"
    };

    await expect(execFile("sh", ["scripts/restore-uploads.sh", manifest], {
      cwd: repositoryRoot, env: existingEnv
    })).rejects.toMatchObject({ code: 65 });
    expect(await readFile(fixture.log, "utf8")).not.toContain("volume rm");

    await writeFile(fixture.log, "");
    await execFile("sh", ["scripts/restore-uploads.sh", manifest], {
      cwd: repositoryRoot,
      env: { ...existingEnv, ALLOW_REPLACE_EXISTING_UPLOAD_VOLUME: "true" }
    });
    const log = await readFile(fixture.log, "utf8");
    expect(log).not.toContain("volume rm growlog_uploads_restore_verify");
    expect(log).toContain("growlog_uploads_restore_verify:/restore");
  });

  it("rejects traversal archives before invoking Docker and guards the primary volume", async () => {
    const fixture = await workspace();
    const unsafeSource = path.join(fixture.root, "unsafe-source");
    await mkdir(unsafeSource);
    await writeFile(path.join(unsafeSource, "image.png"), "bad");
    const unsafeArchive = path.join(fixture.root, "unsafe-uploads.tar");
    await execFile("tar", ["-cf", unsafeArchive, "--transform=s#image.png#../escape.png#", "-C", unsafeSource, "image.png"]);
    const digest = createHash("sha256").update(await readFile(unsafeArchive)).digest("hex");
    const dumpDigest = createHash("sha256").update("unused").digest("hex");
    const manifest = path.join(fixture.root, "unsafe.manifest");
    await writeFile(manifest, [
      "version=1",
      "backup_id=unsafe",
      "database_dump=unsafe.dump",
      `database_sha256=${dumpDigest}`,
      "uploads_archive=unsafe-uploads.tar",
      `uploads_sha256=${digest}`,
      ""
    ].join("\n"));
    await writeFile(path.join(fixture.root, "unsafe.dump"), "unused");
    await writeFile(fixture.log, "");

    await expect(execFile("sh", ["scripts/restore-uploads.sh", manifest], {
      cwd: repositoryRoot, env: fixture.env
    })).rejects.toMatchObject({ code: 65 });
    await expect(readFile(fixture.log, "utf8")).resolves.toBe("");

    await expect(execFile("sh", ["scripts/restore-uploads.sh", manifest, "growlog_uploads_data"], {
      cwd: repositoryRoot, env: fixture.env
    })).rejects.toMatchObject({ code: 65 });
  });
});
