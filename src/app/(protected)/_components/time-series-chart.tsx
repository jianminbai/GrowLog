import type { SeriesPoint } from "@/modules/reports/daily-series";

type Props = { title: string; unit: string; timeZone: string; points: SeriesPoint[] };
export function TimeSeriesChart({ title, unit, timeZone, points }: Props) {
  const sorted = points.filter(p => Number.isFinite(Date.parse(p.at))).slice().sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  const known = sorted.filter((p): p is SeriesPoint & { value: number } => p.value !== null && Number.isFinite(p.value));
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
  const label = (at: string) => /^\d{4}-\d{2}-\d{2}$/.test(at) ? at : new Date(at).toLocaleDateString("zh-CN", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" });
  // Break a line at explicitly unknown values rather than imply a zero or a measured segment.
  const segments: string[][] = [[]];
  for (const point of sorted) {
    if (point.value === null || !Number.isFinite(point.value)) { segments.push([]); continue; }
    segments.at(-1)!.push(`${x(point.at)},${y(point.value)}`);
  }
  return <figure className="report-chart">
    <figcaption>{title}</figcaption>
    <svg viewBox="0 0 340 214" role="img" aria-label={`${title}：横轴时间，纵轴${unit}`}>
      <text x="10" y="16">{unit}</text>
      {[minimum, (minimum + maximum) / 2, maximum].map((tick, i) => <g key={i}>
        <line className="report-gridline" x1="52" x2="310" y1={y(tick)} y2={y(tick)} />
        <text x="46" y={y(tick) + 4} textAnchor="end">{Number(tick.toFixed(1))}</text>
      </g>)}
      <line className="chart-axis" x1="52" x2="52" y1="30" y2="162" />
      {segments.filter(s => s.length > 1).map((s, i) => <polyline key={i} points={s.join(" ")} className="report-line" />)}
      {known.map((p, i) => <circle key={i} cx={x(p.at)} cy={y(p.value)} r="3.5" className="report-dot"><title>{label(p.at)} · {p.value} {unit}</title></circle>)}
      {first === last ? <text x="181" y="182" textAnchor="middle">{label(sorted[0]!.at)}</text> : <>
        <text x="52" y="182">{label(sorted[0]!.at)}</text><text x="310" y="182" textAnchor="end">{label(sorted.at(-1)!.at)}</text>
      </>}
      <text x="181" y="205" textAnchor="middle">时间</text>
    </svg>
    <p className="care-note">仅展示已记录数据；空缺不等于零。完整数值见下方表格。</p>
  </figure>;
}
