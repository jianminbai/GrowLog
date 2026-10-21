import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

import manifest from "./manifest";

describe("PWA metadata and cache policy", () => {
  it("provides an installable standalone manifest with required icon sizes", () => {
    const value = manifest();
    expect(value).toMatchObject({ name: "GrowLog", start_url: "/today", display: "standalone" });
    expect(value.icons).toEqual(expect.arrayContaining([
      expect.objectContaining({ src: "/icons/icon-192.png", sizes: "192x192" }),
      expect.objectContaining({ src: "/icons/icon-512.png", sizes: "512x512" })
    ]));
  });

  it("never stores API or navigation responses in the service-worker cache", async () => {
    const worker = await readFile(new URL("../../public/sw.js", import.meta.url), "utf8");
    expect(worker).toContain('url.pathname.startsWith("/api/")');
    expect(worker).toContain('request.mode === "navigate"');
    expect(worker).toContain('caches.match("/offline.html")');
    expect(worker).toContain('url.pathname.startsWith("/_next/static/")');
    expect(worker).not.toMatch(/cache\.put\([^\n]*navigate/);
  });
});
