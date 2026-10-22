// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { LoginForm } from "./login-form";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() })
}));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("LoginForm", () => {
  it("offers only administrator sign-in fields and no registration path", () => {
    render(createElement(LoginForm));

    expect(screen.getByRole("textbox", { name: "管理员邮箱" })).toBeRequired();
    expect(screen.getByLabelText("密码")).toBeRequired();
    expect(screen.getByRole("button", { name: "进入 GrowLog" })).toBeVisible();
    expect(screen.queryByText(/注册/)).not.toBeInTheDocument();
  });

  it("keeps the email, clears the password, and restores the button after rejection", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 401 })));
    render(<LoginForm />);
    const email = screen.getByRole("textbox", { name: "管理员邮箱" });
    const password = screen.getByLabelText("密码");

    fireEvent.change(email, { target: { value: "parent@example.com" } });
    fireEvent.change(password, { target: { value: "correct-length-password" } });
    fireEvent.submit(screen.getByRole("button", { name: "进入 GrowLog" }).closest("form")!);

    expect(await screen.findByRole("alert")).toHaveTextContent("邮箱或密码不正确");
    expect(email).toHaveValue("parent@example.com");
    expect(password).toHaveValue("");
    await waitFor(() => expect(screen.getByRole("button", { name: "进入 GrowLog" })).toBeEnabled());
  });
});
