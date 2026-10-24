import { createHash } from "node:crypto";
import { chmod, mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
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
  *pg_dump*) printf 'database-dump' ;;
  *'run --rm --no-deps --entrypoint sh app'*) cat "$FAKE_UPLOAD_TAR" ;;
esac
`);
  await chmod(docker, 0o755);
  const uploads = path.join(root, "uploads");
  await mkdir(uploads);
  await writeFile(path.join(uploads, "image.png"), "image-bytes");
  const archive = path.join(root, "source-uploads.tar");
  await execFile("tar", ["-cf", archive, "-C", uploads, "."]);
  return {
    root,
    archive,
    log: path.join(root, "docker.log"),
    env: {
      ...process.env,
      PATH: `${bin}:${process.env.PATH}`,
      DOCKER_LOG: path.join(root, "docker.log"),
      FAKE_UPLOAD_TAR: archive
    }
  };
}

describe("kindergarten document deployment", () => {
  it("mounts a private persistent upload directory into the application", async () => {
    const [compose, dockerfile, environment] = await Promise.all([
      readFile(path.join(repositoryRoot, "docker-compose.yml"), "utf8"),
      readFile(path.join(repositoryRoot, "Dockerfile"), "utf8"),
      readFile(path.join(repositoryRoot, ".env.production.example"), "utf8")
    ]);
    expect(compose).toContain("UPLOAD_DIR: ${UPLOAD_DIR:-/data/uploads}");
    expect(compose).toContain("uploads_data:/data/uploads");
    expect(compose).toMatch(/volumes:[\s\S]*uploads_data:/);
    expect(dockerfile).toContain("/data/uploads");
    expect(environment).toContain("UPLOAD_DIR=/data/uploads");
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
    expect(log).toContain("volume create growlog_uploads_restore_verify");
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
