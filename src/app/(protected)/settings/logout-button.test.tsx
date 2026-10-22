// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CSRF_COOKIE_NAME } from "@/modules/auth/auth-constants";

import { LogoutButton } from "./logout-button";

const router = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => router }));

describe("LogoutButton", () => {
  beforeEach(() => {
    document.cookie = `${CSRF_COOKIE_NAME}=csrf-token`;
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("posts the CSRF token and returns to login after success", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 204 }));
    render(<LogoutButton />);

    fireEvent.click(screen.getByRole("button", { name: "退出登录" }));

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/login"));
    expect(fetch).toHaveBeenCalledWith("/api/auth/logout", {
      method: "POST",
      headers: { "x-csrf-token": "csrf-token" }
    });
    expect(router.refresh).toHaveBeenCalledOnce();
  });

  it("shows a pending label while the request is in flight", async () => {
    let finish!: (response: Response) => void;
    vi.mocked(fetch).mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    render(<LogoutButton />);

    fireEvent.click(screen.getByRole("button", { name: "退出登录" }));

    expect(screen.getByRole("button", { name: "正在退出…" })).toBeDisabled();
    finish(new Response(null, { status: 204 }));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/login"));
  });

  it.each([
    ["server response", () => Promise.resolve(new Response(null, { status: 500 }))],
    ["network error", () => Promise.reject(new Error("offline"))]
  ])("shows a safe alert without navigating after a %s failure", async (_label, response) => {
    vi.mocked(fetch).mockImplementation(response);
    render(<LogoutButton />);

    fireEvent.click(screen.getByRole("button", { name: "退出登录" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("暂时无法退出，请稍后重试。");
    expect(router.replace).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "退出登录" })).toBeEnabled();
  });
});
