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
    const { container } = render(<SettingsPage />);

    expect(screen.getByRole("heading", { name: "儿童与记录" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "数据与备份" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "账户" })).toBeInTheDocument();
    expect(container.querySelector('a[href="/settings/children/new"]')).toHaveTextContent("添加孩子");
    expect(container.querySelector('a[href="/settings/children"]')).toHaveTextContent("基础资料与记录");
    expect(container.querySelector('a[href="/settings/kindergarten-documents"]')).toHaveTextContent("幼儿园资料");
    expect(container.querySelector('a[href="/settings/data-management"]')).toHaveTextContent("删除记录与审计");
    expect(screen.getByText("JSON 备份")).toBeInTheDocument();
    expect(screen.getByText("分领域 CSV")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "完整 JSON" })).not.toBeInTheDocument();
    for (const name of ["plus", "child", "documents", "database", "backup", "table", "account", "chevron"]) {
      expect(container.querySelector(`[data-icon="${name}"]`)).toBeInTheDocument();
    }
    const iconContainers = [...container.querySelectorAll(".settings-menu-icon")];
    expect(iconContainers).toHaveLength(7);
    expect(iconContainers.every((icon) => icon.textContent === "")).toBe(true);
  }, 15_000);
});
