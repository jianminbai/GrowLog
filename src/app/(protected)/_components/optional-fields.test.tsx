// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { OptionalFields } from "./optional-fields";

afterEach(cleanup);

describe("OptionalFields", () => {
  it("uses a closed native details element by default", () => {
    render(<OptionalFields><label>备注<input /></label></OptionalFields>);

    const details = screen.getByText("更多信息").closest("details");
    expect(details).not.toHaveAttribute("open");
    expect(screen.getByLabelText("备注")).toBeInTheDocument();
  });

  it("opens when an edited record already has optional content", () => {
    render(<OptionalFields defaultOpen label="补充信息"><span>已有内容</span></OptionalFields>);

    expect(screen.getByText("补充信息").closest("details")).toHaveAttribute("open");
  });
});
