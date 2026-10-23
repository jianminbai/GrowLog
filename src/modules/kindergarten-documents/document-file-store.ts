import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";

export type DocumentExtension = "jpg" | "png" | "webp";

export class DocumentFileStoreError extends Error {
  constructor(public readonly code: "INVALID_KEY" | "INVALID_EXTENSION" | "NOT_FOUND", message: string) {
    super(message);
    this.name = "DocumentFileStoreError";
  }
}

export type DocumentFileStore = {
  write(bytes: Uint8Array, extension: DocumentExtension): Promise<string>;
  read(storageKey: string): Promise<Uint8Array>;
  remove(storageKey: string): Promise<void>;
};

const keyPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(?:jpg|png|webp)$/i;
const extensions = new Set(["jpg", "png", "webp"]);

function validateKey(storageKey: string) {
  if (!keyPattern.test(storageKey)) {
    throw new DocumentFileStoreError("INVALID_KEY", "Invalid document storage key.");
  }
}

function isNotFound(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}

export function createLocalDocumentFileStore(rootDir: string): DocumentFileStore {
  return {
    async write(bytes, extension) {
      if (!extensions.has(extension)) {
        throw new DocumentFileStoreError("INVALID_EXTENSION", "Unsupported document extension.");
      }
      await mkdir(rootDir, { recursive: true, mode: 0o700 });
      const key = `${randomUUID()}.${extension}`;
      const target = path.join(rootDir, key);
      const temporary = path.join(rootDir, `.${key}.${randomUUID()}.tmp`);
      try {
        await writeFile(temporary, bytes, { flag: "wx", mode: 0o600 });
        await rename(temporary, target);
      } catch (error) {
        await rm(temporary, { force: true }).catch(() => undefined);
        throw error;
      }
      return key;
    },
    async read(storageKey) {
      validateKey(storageKey);
      try {
        return new Uint8Array(await readFile(path.join(rootDir, storageKey)));
      } catch (error) {
        if (isNotFound(error)) throw new DocumentFileStoreError("NOT_FOUND", "Document image not found.");
        throw error;
      }
    },
    async remove(storageKey) {
      validateKey(storageKey);
      try {
        await rm(path.join(rootDir, storageKey));
      } catch (error) {
        if (!isNotFound(error)) throw error;
      }
    }
  };
}
