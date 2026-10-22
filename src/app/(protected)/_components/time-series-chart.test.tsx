// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { TimeSeriesChart } from "./time-series-chart";
afterEach(cleanup);
describe("time-series chart", () => {
  it("spaces measurements by elapsed time and labels both axes", () => {
    const { container } = render(<TimeSeriesChart title="身高趋势" unit="cm" timeZone="Asia/Shanghai" points={[
      { at: "2026-10-11T00:00:00Z", value: 104 },
      { at: "2026-10-01T00:00:00Z", value: 100 },
      { at: "2026-10-02T00:00:00Z", value: 101 }
    ]} />);
    const circles = [...container.querySelectorAll("circle")];
    const xs = circles.map(c => Number(c.getAttribute("cx")));
    expect(xs).toHaveLength(3);
    expect((xs[1]! - xs[0]!) / (xs[2]! - xs[0]!)).toBeCloseTo(0.1);
    expect(screen.getByRole("img", { name: /身高趋势/ })).toHaveTextContent("cm");
    expect(screen.getByText("时间")).toBeInTheDocument();
  });
  it("preserves zero, skips missing values, and renders a single point", () => {
    const { container } = render(<TimeSeriesChart title="户外时长" unit="分钟" timeZone="UTC" points={[
      { at: "2026-10-01T00:00:00Z", value: null },
      { at: "2026-10-02T00:00:00Z", value: 0 }
    ]} />);
    expect(container.querySelectorAll("circle")).toHaveLength(1);
    expect(container.querySelector("circle title")).toHaveTextContent("0 分钟");
    expect(container.innerHTML).not.toMatch(/NaN|Infinity/);
  });
  it("shows an honest empty state", () => {
    render(<TimeSeriesChart title="体重趋势" unit="kg" timeZone="UTC" points={[]} />);
    expect(screen.getByText(/暂无可绘制/)).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});
