// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() })
}));

import SettingsPage from "./page";

afterEach(cleanup);

describe("settings page", () => {
  it("groups child, data, and account actions into compact menu sections", () => {
    render(<SettingsPage />);

    expect(screen.getByRole("heading", { name: "儿童与记录" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "数据与备份" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "账户" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /添加孩子/ })).toHaveAttribute("href", "/settings/children/new");
    expect(screen.getByRole("link", { name: /基础资料与记录/ })).toHaveAttribute("href", "/settings/children");
    expect(screen.getByRole("link", { name: /删除记录与审计/ })).toHaveAttribute(
      "href",
      "/settings/data-management"
    );
    expect(screen.getByText("JSON 备份")).toBeInTheDocument();
    expect(screen.getByText("分领域 CSV")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "完整 JSON" })).not.toBeInTheDocument();
  });
});
