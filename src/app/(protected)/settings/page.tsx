import Link from "next/link";

import { exportDomains } from "@/modules/export/export-service";

const labels = {
  children: "儿童档案", growth: "身高体重", sleep: "睡眠", meals: "餐食",
  beverages: "奶与饮品", activity: "运动与户外", emotion: "情绪观察", audit: "审计事件"
} as const;

export default function SettingsPage() {
  return <main className="profile-shell">
    <header className="profile-header compact"><span className="eyebrow">Settings & export</span><h1>设置与数据导出</h1><p>下载当前家庭的可移植数据。导出不包含登录会话、密码哈希或 CSRF 凭据。</p></header>
    <section className="profile-panel export-panel">
      <h2>完整 JSON</h2>
      <p>版本化 JSON 保留领域结构、明确单位字段和 ISO 时间戳，适合备份或迁移。</p>
      <div className="record-actions"><a className="primary-action" href="/api/export/json">下载当前数据</a><a className="secondary-download" href="/api/export/json?includeDeleted=true">包含已删除记录</a></div>
    </section>
    <section className="profile-panel export-panel">
      <h2>分领域 CSV</h2>
      <p>CSV 使用 UTF-8，按领域拆分；列名标明 cm、kg、ml 和 minutes 等单位。</p>
      <div className="export-links">{exportDomains.map((domain) => <a href={`/api/export/csv?domain=${domain}`} key={domain}>{labels[domain]} CSV</a>)}</div>
      <p className="care-note">如需保留软删除记录，可在下载地址后追加 <code>&amp;includeDeleted=true</code>。默认导出只包含当前有效记录。</p>
    </section>
    <Link className="back-link" href="/today">← 返回今天</Link>
  </main>;
}
