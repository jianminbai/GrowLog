export type MultipartBodyErrorCode = "BODY_TOO_LARGE" | "MALFORMED_MULTIPART";

export class MultipartBodyError extends Error {
  constructor(
    public readonly code: MultipartBodyErrorCode,
    public readonly status: 400 | 413,
    message: string
  ) {
    super(message);
    this.name = "MultipartBodyError";
  }
}

const oversized = () => new MultipartBodyError("BODY_TOO_LARGE", 413, "The upload is too large.");
const malformed = () => new MultipartBodyError("MALFORMED_MULTIPART", 400, "The multipart upload is malformed.");

export async function readBoundedFormData(request: Request, maximumBytes: number): Promise<FormData> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("multipart/form-data")) throw malformed();

  const declaredLength = request.headers.get("content-length");
  if (declaredLength !== null) {
    const parsed = Number(declaredLength);
    if (Number.isFinite(parsed) && parsed > maximumBytes) {
      await request.body?.cancel().catch(() => undefined);
      throw oversized();
    }
  }
  if (!request.body) throw malformed();

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maximumBytes) {
        await reader.cancel().catch(() => undefined);
        throw oversized();
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return await new Response(body, { headers: { "content-type": contentType } }).formData();
  } catch {
    throw malformed();
  }
}
