// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CSRF_COOKIE_NAME } from "@/modules/auth/auth-constants";

import { RestoreDeletedRecordButton } from "./restore-deleted-record-button";

const router = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("RestoreDeletedRecordButton", () => {
  it("restores through the scoped endpoint with CSRF protection", async () => {
    document.cookie = `${CSRF_COOKIE_NAME}=csrf-token`;
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    render(<RestoreDeletedRecordButton endpoint="/api/children/child-1/sleep/sleep-1/restore" label="夜间睡眠" />);

    fireEvent.click(screen.getByRole("button", { name: "恢复夜间睡眠" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      "/api/children/child-1/sleep/sleep-1/restore",
      { method: "POST", headers: { "x-csrf-token": "csrf-token" } }
    ));
    expect(router.refresh).toHaveBeenCalledOnce();
  });
});
