import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { createLocalDocumentFileStore, DocumentFileStoreError } from "./document-file-store";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

async function store() {
  const root = await mkdtemp(path.join(tmpdir(), "growlog-documents-"));
  roots.push(root);
  return createLocalDocumentFileStore(root);
}

describe("local document file store", () => {
  it("writes with a random controlled key and reads identical bytes", async () => {
    const files = await store();
    const bytes = Uint8Array.from([1, 2, 3, 4]);

    const first = await files.write(bytes, "png");
    const second = await files.write(bytes, "png");

    expect(first).toMatch(/^[0-9a-f-]{36}\.png$/);
    expect(second).not.toBe(first);
    expect([...await files.read(first)]).toEqual([1, 2, 3, 4]);
  });

  it("removes files idempotently", async () => {
    const files = await store();
    const key = await files.write(Uint8Array.from([1]), "jpg");

    await files.remove(key);
    await files.remove(key);

    await expect(files.read(key)).rejects.toMatchObject<Partial<DocumentFileStoreError>>({ code: "NOT_FOUND" });
  });

  it.each(["../secret.png", "/absolute.png", "key.exe", "key.png/extra"])("rejects unsafe storage key %s", async (key) => {
    const files = await store();
    await expect(files.read(key)).rejects.toMatchObject({ code: "INVALID_KEY" });
    await expect(files.remove(key)).rejects.toMatchObject({ code: "INVALID_KEY" });
  });

  it("rejects extensions outside the validated allowlist", async () => {
    const files = await store();
    await expect(files.write(Uint8Array.from([1]), "svg" as never)).rejects.toMatchObject({ code: "INVALID_EXTENSION" });
  });
});
