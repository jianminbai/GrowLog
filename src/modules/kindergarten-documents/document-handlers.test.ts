import type { KindergartenDocument } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CSRF_COOKIE_NAME, SESSION_COOKIE_NAME } from "@/modules/auth/auth-constants";
import { issueSession, type SessionRecord, type SessionRepository } from "@/modules/auth/auth-service";

import { DocumentFileStoreError } from "./document-file-store";
import {
  createKindergartenDocumentHandlers,
  type KindergartenDocumentHandlerDependencies
} from "./document-handlers";

function sessionRepository(): SessionRepository {
  const records: SessionRecord[] = [];
  return {
    async create(record) { records.push(record); },
    async findByTokenDigest(digest) { return records.find((record) => record.tokenDigest === digest) ?? null; },
    async revokeByTokenDigest() {}
  };
}

const png = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const key = "00000000-0000-4000-8000-000000000001.png";

function document(overrides: Partial<KindergartenDocument> = {}): KindergartenDocument {
  return {
    id: "document-1",
    householdId: "household-1",
    childId: "child-1",
    type: "DAILY_CARE_SHEET",
    periodStart: new Date("2026-10-20T00:00:00.000Z"),
    originalFileName: "care.png",
    storageKey: key,
    mimeType: "image/png",
    sizeBytes: png.byteLength,
    createdAt: new Date("2026-10-20T01:00:00.000Z"),
    updatedAt: new Date("2026-10-20T02:00:00.000Z"),
    ...overrides
  };
}

describe("kindergarten document handlers", () => {
  let dependencies: KindergartenDocumentHandlerDependencies;
  let cookie: string;
  let csrf: string;

  beforeEach(async () => {
    const sessions = sessionRepository();
    const issued = await issueSession("household-1", sessions);
    cookie = `${SESSION_COOKIE_NAME}=${issued.token}; ${CSRF_COOKIE_NAME}=${issued.csrfToken}`;
    csrf = issued.csrfToken;
    dependencies = {
      sessions,
      actorId: "parent@example.com",
      documents: {
        list: vi.fn().mockResolvedValue([document()]),
        find: vi.fn().mockResolvedValue(document()),
        upsert: vi.fn().mockResolvedValue({ document: document(), created: true, replacedStorageKey: null }),
        remove: vi.fn().mockResolvedValue({ deletedStorageKey: key })
      },
      files: {
        write: vi.fn().mockResolvedValue(key),
        read: vi.fn().mockResolvedValue(png),
        remove: vi.fn().mockResolvedValue(undefined)
      }
    };
  });

  function form(overrides: { childId?: string; type?: string; date?: string; files?: File[] } = {}) {
    const value = new FormData();
    value.set("childId", overrides.childId ?? "child-1");
    value.set("type", overrides.type ?? "DAILY_CARE_SHEET");
    value.set("date", overrides.date ?? "2026-10-20");
    for (const image of overrides.files ?? [new File([png], "care.png", { type: "image/png" })]) {
      value.append("image", image);
    }
    return value;
  }

  function uploadRequest(body: FormData) {
    return new Request("https://growlog.test/api/kindergarten-documents", {
      method: "POST",
      headers: { cookie, origin: "https://growlog.test", "x-csrf-token": csrf },
      body
    });
  }

  it("rejects anonymous list access", async () => {
    const response = await createKindergartenDocumentHandlers(dependencies).list(
      new Request("https://growlog.test/api/kindergarten-documents?childId=child-1")
    );
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({ error: { code: "UNAUTHORIZED" } });
  });

  it("authenticates mutations before parsing the multipart body", async () => {
    const response = await createKindergartenDocumentHandlers(dependencies).upload(
      new Request("https://growlog.test/api/kindergarten-documents", {
        method: "POST",
        headers: { cookie, origin: "https://growlog.test" },
        body: form()
      })
    );
    expect(response.status).toBe(403);
    expect(dependencies.files.write).not.toHaveBeenCalled();
    expect(dependencies.documents.upsert).not.toHaveBeenCalled();
  });

  it("returns 413 for an oversized chunked body with no declared length", async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(6 * 1024 * 1024));
        controller.enqueue(new Uint8Array(6 * 1024 * 1024));
        controller.close();
      }
    });
    const request = new Request("https://growlog.test/api/kindergarten-documents", {
      method: "POST",
      headers: {
        cookie,
        origin: "https://growlog.test",
        "x-csrf-token": csrf,
        "content-type": "multipart/form-data; boundary=x"
      },
      body: stream,
      duplex: "half"
    } as RequestInit & { duplex: "half" });

    const response = await createKindergartenDocumentHandlers(dependencies).upload(request);
    expect(response.status).toBe(413);
    await expect(response.json()).resolves.toMatchObject({ error: { code: "BODY_TOO_LARGE" } });
  });

  it("rejects invalid fields, impossible dates, and multiple images", async () => {
    const handlers = createKindergartenDocumentHandlers(dependencies);
    const invalidDate = await handlers.upload(uploadRequest(form({ date: "2026-02-30" })));
    expect(invalidDate.status).toBe(400);

    const multiple = await handlers.upload(uploadRequest(form({ files: [
      new File([png], "one.png", { type: "image/png" }),
      new File([png], "two.png", { type: "image/png" })
    ] })));
    expect(multiple.status).toBe(400);
    expect(dependencies.files.write).not.toHaveBeenCalled();
  });

  it("creates a document and returns public metadata without a storage key", async () => {
    const response = await createKindergartenDocumentHandlers(dependencies).upload(uploadRequest(form()));
    expect(response.status).toBe(201);
    const payload = await response.json();
    expect(payload).toEqual({ data: { document: {
      id: "document-1",
      childId: "child-1",
      type: "DAILY_CARE_SHEET",
      periodStart: "2026-10-20",
      originalFileName: "care.png",
      mimeType: "image/png",
      sizeBytes: 8,
      createdAt: "2026-10-20T01:00:00.000Z",
      updatedAt: "2026-10-20T02:00:00.000Z",
      imageUrl: "/api/kindergarten-documents/document-1/image?v=2026-10-20T02%3A00%3A00.000Z"
    } } });
    expect(JSON.stringify(payload)).not.toContain("storageKey");
  });

  it("returns 200 on replacement and removes the old file after commit", async () => {
    vi.mocked(dependencies.documents.upsert).mockResolvedValue({
      document: document(), created: false, replacedStorageKey: "00000000-0000-4000-8000-000000000099.png"
    });
    const response = await createKindergartenDocumentHandlers(dependencies).upload(uploadRequest(form()));
    expect(response.status).toBe(200);
    expect(dependencies.files.remove).toHaveBeenCalledWith("00000000-0000-4000-8000-000000000099.png");
  });

  it("removes a newly written file when persistence fails", async () => {
    vi.mocked(dependencies.documents.upsert).mockRejectedValue(new Error("database unavailable"));
    await expect(createKindergartenDocumentHandlers(dependencies).upload(uploadRequest(form())))
      .rejects.toThrow("database unavailable");
    expect(dependencies.files.remove).toHaveBeenCalledWith(key);
  });

  it("lists versioned metadata and never serializes private paths", async () => {
    const response = await createKindergartenDocumentHandlers(dependencies).list(
      new Request("https://growlog.test/api/kindergarten-documents?childId=child-1", { headers: { cookie } })
    );
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.data.documents[0].imageUrl).toContain("?v=2026-10-20T02%3A00%3A00.000Z");
    expect(JSON.stringify(payload)).not.toContain(key);
  });

  it("serves authenticated image bytes with private inline headers", async () => {
    const response = await createKindergartenDocumentHandlers(dependencies).image(
      new Request("https://growlog.test/api/kindergarten-documents/document-1/image", { headers: { cookie } }),
      "document-1"
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
    expect(response.headers.get("cache-control")).toContain("private, no-store");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("content-disposition")).toBe("inline");
    expect([...new Uint8Array(await response.arrayBuffer())]).toEqual([...png]);
  });

  it("uses a generic 404 for missing metadata or disk bytes", async () => {
    vi.mocked(dependencies.files.read).mockRejectedValue(new DocumentFileStoreError("NOT_FOUND", "private path"));
    const response = await createKindergartenDocumentHandlers(dependencies).image(
      new Request("https://growlog.test/api/kindergarten-documents/document-1/image", { headers: { cookie } }),
      "document-1"
    );
    expect(response.status).toBe(404);
    expect(await response.text()).not.toContain("private path");
  });

  it("deletes owned metadata and committed bytes only with CSRF", async () => {
    const request = new Request("https://growlog.test/api/kindergarten-documents/document-1", {
      method: "DELETE",
      headers: { cookie, origin: "https://growlog.test", "x-csrf-token": csrf }
    });
    const response = await createKindergartenDocumentHandlers(dependencies).remove(request, "document-1");
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ data: { deletedId: "document-1" } });
    expect(dependencies.files.remove).toHaveBeenCalledWith(key);
  });
});
