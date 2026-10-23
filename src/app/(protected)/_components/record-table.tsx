import type { ReactNode } from "react";
export type ReportTable = { title: string; headers: string[]; rows: { id: string; cells: ReactNode[] }[]; className?: string };
export function RecordTable({ title, headers, rows, className }: ReportTable) {
  return <section className="report-table-section">
    <h2>{title}</h2><p className="care-note">表格可左右滑动查看完整数据。</p>
    <div className="report-table-scroll" role="region" aria-label={`${title}，可横向滚动`} tabIndex={0}>
      <table className={`report-table${className ? ` ${className}` : ""}`}><caption className="sr-only">{title}</caption>
        <thead><tr>{headers.map(h => <th scope="col" key={h}>{h}</th>)}</tr></thead>
        <tbody>{rows.length ? rows.map(row => <tr key={row.id}>{row.cells.map((cell, i) => <td key={i}>{cell === null || cell === undefined || cell === "" ? "未记录" : cell}</td>)}</tr>) : <tr><td colSpan={headers.length}>暂无记录</td></tr>}</tbody>
      </table>
    </div>
  </section>;
}
