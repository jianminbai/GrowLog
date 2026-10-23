// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
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

  it("shows the nearest point time and exact value while the pointer moves across the chart", () => {
    render(<TimeSeriesChart title="身高趋势" unit="cm" timeZone="Asia/Shanghai" points={[
      { at: "2026-10-01T00:00:00Z", value: 100 },
      { at: "2026-10-02T00:00:00Z", value: 101 },
      { at: "2026-10-03T00:00:00Z", value: 102 }
    ]} />);
    const chart = screen.getByRole("img", { name: /身高趋势/ });
    Object.defineProperty(chart, "getBoundingClientRect", {
      value: () => ({ left: 0, top: 0, width: 340, height: 214, right: 340, bottom: 214, x: 0, y: 0, toJSON: () => ({}) })
    });

    fireEvent.pointerMove(chart, { clientX: 181, clientY: 100, pointerType: "mouse" });

    const tooltip = screen.getByRole("status");
    expect(tooltip).toHaveTextContent(/2026.*10.*02.*08:00/);
    expect(tooltip).toHaveTextContent("101 cm");
    expect(chart.querySelector(".report-dot.is-active")).not.toBeNull();
    expect(chart.querySelector(".chart-cursor-line")).not.toBeNull();
    expect(chart.querySelector(".report-line")).toHaveAttribute("pathLength", "1");
  });

  it("exposes every point to keyboard focus", () => {
    render(<TimeSeriesChart title="体重趋势" unit="kg" timeZone="Asia/Shanghai" points={[
      { at: "2026-10-01T00:00:00Z", value: 15 },
      { at: "2026-10-02T00:00:00Z", value: 15.4 }
    ]} />);

    const secondPoint = screen.getByRole("button", { name: /15\.4 kg/ });
    fireEvent.focus(secondPoint);

    expect(screen.getByRole("status")).toHaveTextContent("15.4 kg");
  });

  it("uses date-only labels for measurements that do not need time-of-day precision", () => {
    render(<TimeSeriesChart title="身高趋势" unit="cm" timeZone="Asia/Shanghai" dateOnly points={[
      { at: "2026-10-20T01:00:00Z", value: 104 }
    ]} />);

    expect(screen.getByRole("button", { name: /104 cm/ })).toHaveAccessibleName("2026-10-20，104 cm");
  });

  it("uses vertical distance to distinguish points recorded at the same time", () => {
    render(<TimeSeriesChart title="身高趋势" unit="cm" timeZone="Asia/Shanghai" points={[
      { at: "2026-10-01T00:00:00Z", value: 100 },
      { at: "2026-10-01T00:00:00Z", value: 102 }
    ]} />);
    const chart = screen.getByRole("img", { name: /身高趋势/ });
    Object.defineProperty(chart, "getBoundingClientRect", {
      value: () => ({ left: 0, top: 0, width: 340, height: 214, right: 340, bottom: 214, x: 0, y: 0, toJSON: () => ({}) })
    });

    fireEvent.pointerMove(chart, { clientX: 181, clientY: 68, pointerType: "touch" });

    expect(screen.getByRole("status")).toHaveTextContent("102 cm");
  });
});
