import type { GrowthMeasurementDto } from "@/modules/growth/growth-handlers";

function points(records: GrowthMeasurementDto[], field: "heightCm" | "weightKg") {
  const available = records
    .map((record, index) => ({ index, value: record[field] }))
    .filter((point): point is { index: number; value: number } => point.value !== null);
  if (available.length === 0) return "";
  const values = available.map((point) => point.value);
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const range = maximum - minimum || 1;
  const divisor = Math.max(records.length - 1, 1);
  return available
    .map((point) => `${20 + (point.index / divisor) * 280},${120 - ((point.value - minimum) / range) * 90}`)
    .join(" ");
}

export function GrowthChart({ measurements }: { measurements: GrowthMeasurementDto[] }) {
  if (measurements.length === 0) return null;
  return (
    <figure className="growth-chart">
      <svg viewBox="0 0 320 140" role="img" aria-label="身高和体重历史趋势，两条曲线分别按自身范围显示">
        <line x1="20" y1="120" x2="300" y2="120" className="chart-axis" />
        <polyline points={points(measurements, "heightCm")} className="height-line" />
        <polyline points={points(measurements, "weightKg")} className="weight-line" />
      </svg>
      <figcaption><span className="height-key">身高</span><span className="weight-key">体重</span> · 曲线分别按自身范围展示，仅用于观察历史变化。</figcaption>
    </figure>
  );
}
