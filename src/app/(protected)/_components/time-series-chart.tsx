"use client";

import type { CSSProperties, KeyboardEvent, PointerEvent } from "react";
import { useState } from "react";

import type { SeriesPoint } from "@/modules/reports/daily-series";

type Props = { title: string; unit: string; timeZone: string; points: SeriesPoint[]; dateOnly?: boolean };
type KnownPoint = SeriesPoint & { value: number };

const chartWidth = 340;
const chartHeight = 214;

export function TimeSeriesChart({ title, unit, timeZone, points, dateOnly = false }: Props) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const sorted = points.filter(p => Number.isFinite(Date.parse(p.at))).slice().sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  const known = sorted.filter((p): p is KnownPoint => p.value !== null && Number.isFinite(p.value));
  if (!known.length) return <section className="report-chart"><h2>{title}</h2><p className="care-note">暂无可绘制的数据，录入后将在这里显示。</p></section>;

  const times = sorted.map(p => Date.parse(p.at));
  const first = times[0]!;
  const last = times.at(-1)!;
  const low = Math.min(...known.map(p => p.value));
  const high = Math.max(...known.map(p => p.value));
  const padding = Math.max((high - low) * 0.12, high === 0 ? 1 : high * 0.01);
  const minimum = Math.max(0, low - padding);
  const maximum = high + padding;
  const x = (at: string) => first === last ? 181 : 52 + ((Date.parse(at) - first) / (last - first)) * 258;
  const y = (value: number) => 162 - ((value - minimum) / (maximum - minimum)) * 126;
  const dateLabel = (at: string) => {
    if (/^\d{4}-\d{2}-\d{2}$/.test(at)) return at;
    const parts = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(at));
    const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(item => item.type === type)?.value ?? "";
    return `${part("year")}-${part("month")}-${part("day")}`;
  };
  const axisLabel = (at: string) => dateLabel(at);
  const pointLabel = (at: string) => dateOnly
    ? dateLabel(at)
    : /^\d{4}-\d{2}-\d{2}$/.test(at)
    ? new Date(`${at}T12:00:00Z`).toLocaleDateString("zh-CN", { timeZone: "UTC", year: "numeric", month: "2-digit", day: "2-digit" })
    : new Date(at).toLocaleString("zh-CN", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false });

  const segments: string[][] = [[]];
  for (const point of sorted) {
    if (point.value === null || !Number.isFinite(point.value)) { segments.push([]); continue; }
    segments.at(-1)!.push(`${x(point.at)},${y(point.value)}`);
  }

  const active = activeIndex === null ? null : known[activeIndex] ?? null;
  const activeX = active ? x(active.at) : null;
  const activeY = active ? y(active.value) : null;

  function selectNearest(event: PointerEvent<SVGSVGElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const pointerX = ((event.clientX - rect.left) / rect.width) * chartWidth;
    const pointerY = ((event.clientY - rect.top) / rect.height) * chartHeight;
    const distance = (point: KnownPoint) => Math.hypot(x(point.at) - pointerX, y(point.value) - pointerY);
    let nearest = 0;
    for (let index = 1; index < known.length; index += 1) {
      if (distance(known[index]!) < distance(known[nearest]!)) nearest = index;
    }
    setActiveIndex(nearest);
  }

  function moveFromKeyboard(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const next = Math.max(0, Math.min(known.length - 1, index + (event.key === "ArrowRight" ? 1 : -1)));
    setActiveIndex(next);
    event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>(".chart-point-control")[next]?.focus();
  }

  return <figure className="report-chart interactive-chart">
    <figcaption>{title}</figcaption>
    <div className="chart-stage">
      <svg
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        role="img"
        aria-label={`${title}：横轴时间，纵轴${unit}`}
        onPointerMove={selectNearest}
        onPointerDown={selectNearest}
        onPointerLeave={() => setActiveIndex(null)}
      >
        <text x="10" y="16">{unit}</text>
        {[minimum, (minimum + maximum) / 2, maximum].map((tick, i) => <g key={i}>
          <line className="report-gridline" x1="52" x2="310" y1={y(tick)} y2={y(tick)} />
          <text x="46" y={y(tick) + 4} textAnchor="end">{Number(tick.toFixed(1))}</text>
        </g>)}
        <line className="chart-axis" x1="52" x2="52" y1="30" y2="162" />
        {segments.filter(s => s.length > 1).map((s, i) => <polyline key={i} points={s.join(" ")} pathLength="1" className="report-line" />)}
        {activeX !== null ? <line className="chart-cursor-line" x1={activeX} x2={activeX} y1="30" y2="162" /> : null}
        {known.map((p, i) => <circle key={`${p.at}-${i}`} cx={x(p.at)} cy={y(p.value)} r={activeIndex === i ? 5.5 : 3.5} className={`report-dot${activeIndex === i ? " is-active" : ""}`}><title>{`${pointLabel(p.at)} · ${p.value} ${unit}`}</title></circle>)}
        {first === last ? <text x="181" y="182" textAnchor="middle">{axisLabel(sorted[0]!.at)}</text> : <>
          <text x="52" y="182">{axisLabel(sorted[0]!.at)}</text><text x="310" y="182" textAnchor="end">{axisLabel(sorted.at(-1)!.at)}</text>
        </>}
        <text x="181" y="205" textAnchor="middle">时间</text>
      </svg>
      {known.map((point, index) => <button
        type="button"
        className="chart-point-control"
        style={{ left: `${x(point.at) / chartWidth * 100}%`, top: `${y(point.value) / chartHeight * 100}%` }}
        aria-label={`${pointLabel(point.at)}，${point.value} ${unit}`}
        onFocus={() => setActiveIndex(index)}
        onKeyDown={event => moveFromKeyboard(event, index)}
        key={`${point.at}-${index}`}
      />)}
      {active && activeX !== null && activeY !== null ? <output
        className="chart-tooltip"
        role="status"
        aria-live="polite"
        style={{ "--chart-x": `${activeX / chartWidth * 100}%`, "--chart-y": `${activeY / chartHeight * 100}%` } as CSSProperties}
      ><span>{pointLabel(active.at)}</span><strong>{active.value} {unit}</strong></output> : null}
    </div>
  </figure>;
}
