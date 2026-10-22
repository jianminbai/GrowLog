import Link from "next/link";

import { exportDomains } from "@/modules/export/export-service";

import { LogoutButton } from "./logout-button";

const labels = {
  children: "儿童档案", growth: "身高体重", sleep: "睡眠", meals: "餐食",
  beverages: "奶与饮品", activity: "运动与户外", emotion: "情绪观察", audit: "审计事件"
} as const;

export default function SettingsPage() {
  return <main className="profile-shell">
    <header className="profile-header compact"><h1>设置</h1><p>管理儿童资料和成长记录，下载家庭数据，或安全退出本设备。导出不包含登录会话、密码哈希或 CSRF 凭据。</p></header>
    <section className="profile-panel export-panel">
      <h2>儿童与成长记录</h2>
      <p>添加孩子、编辑基础资料，以及录入或修改身高体重、睡眠、饮食、运动和情绪记录。</p>
      <div className="settings-management-links"><Link href="/settings/children/new">添加孩子</Link><Link href="/settings/children">基础资料与记录管理</Link></div>
    </section>
    <section className="profile-panel export-panel">
      <h2>数据管理</h2>
      <p>在低频管理页面恢复已删除记录，或查看脱敏后的操作审计。</p>
      <Link className="secondary-download" href="/settings/data-management">打开数据管理</Link>
    </section>
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
    <section className="profile-panel account-panel" aria-labelledby="account-heading">
      <h2 id="account-heading">账户</h2>
      <p>退出后，本设备需要重新输入管理员邮箱和密码才能访问家庭记录。</p>
      <LogoutButton />
    </section>
    <Link className="back-link" href="/today">← 返回今天</Link>
  </main>;
}
