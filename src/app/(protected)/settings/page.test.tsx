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
  it("places deleted records and audits under a low-frequency data-management entry", () => {
    render(<SettingsPage />);

    expect(screen.getByRole("link", { name: "打开数据管理" })).toHaveAttribute(
      "href",
      "/settings/data-management"
    );
  });
});
