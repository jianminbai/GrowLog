import { describe, expect, it } from "vitest";

import { MultipartBodyError, readBoundedFormData } from "./bounded-form-data";

const requestWithStream = (
  chunks: Uint8Array[],
  headers: Record<string, string>,
  onCancel?: () => void
) => {
  let index = 0;
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (index >= chunks.length) return controller.close();
      controller.enqueue(chunks[index++]);
    },
    cancel() { onCancel?.(); }
  });
  return new Request("http://localhost/upload", {
    method: "POST",
    headers,
    body: stream,
    duplex: "half"
  } as RequestInit & { duplex: "half" });
};

describe("bounded multipart parsing", () => {
  it("parses valid multipart data", async () => {
    const source = new FormData();
    source.set("childId", "child-1");
    source.set("image", new File([Uint8Array.from([0xff, 0xd8, 0xff])], "care.jpg", { type: "image/jpeg" }));
    const request = new Request("http://localhost/upload", { method: "POST", body: source });

    const result = await readBoundedFormData(request, 1024);

    expect(result.get("childId")).toBe("child-1");
    expect(result.get("image")).toBeInstanceOf(File);
  });

  it.each([undefined, "10"])("stops an oversized stream with Content-Length %s", async (length) => {
    let cancelled = false;
    const request = requestWithStream(
      [new Uint8Array(7), new Uint8Array(7), new Uint8Array(7)],
      {
        "content-type": "multipart/form-data; boundary=x",
        ...(length ? { "content-length": length } : {})
      },
      () => { cancelled = true; }
    );

    await expect(readBoundedFormData(request, 12)).rejects.toMatchObject<Partial<MultipartBodyError>>({
      code: "BODY_TOO_LARGE",
      status: 413
    });
    expect(cancelled).toBe(true);
  });

  it("rejects an excessive declared length without consuming the stream", async () => {
    let pulls = 0;
    const stream = new ReadableStream<Uint8Array>({ pull(controller) { pulls += 1; controller.enqueue(new Uint8Array(1)); } });
    const request = new Request("http://localhost/upload", {
      method: "POST",
      headers: { "content-type": "multipart/form-data; boundary=x", "content-length": "13" },
      body: stream,
      duplex: "half"
    } as RequestInit & { duplex: "half" });

    await expect(readBoundedFormData(request, 12)).rejects.toMatchObject({ code: "BODY_TOO_LARGE", status: 413 });
    expect(pulls).toBeLessThanOrEqual(1);
  });

  it("maps malformed or non-multipart bodies to a typed client error", async () => {
    const request = new Request("http://localhost/upload", { method: "POST", body: "not multipart" });
    await expect(readBoundedFormData(request, 100)).rejects.toMatchObject({ code: "MALFORMED_MULTIPART", status: 400 });
  });
});
