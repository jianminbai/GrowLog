// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { render, screen } from "@testing-library/react";
import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";

import { LoginForm } from "./login-form";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() })
}));

describe("LoginForm", () => {
  it("offers only administrator sign-in fields and no registration path", () => {
    render(createElement(LoginForm));

    expect(screen.getByRole("textbox", { name: "管理员邮箱" })).toBeRequired();
    expect(screen.getByLabelText("密码")).toBeRequired();
    expect(screen.getByRole("button", { name: "进入 GrowLog" })).toBeVisible();
    expect(screen.queryByText(/注册/)).not.toBeInTheDocument();
  });
});
