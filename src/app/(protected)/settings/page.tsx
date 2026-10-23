import Link from "next/link";

import { exportDomains } from "@/modules/export/export-service";

import { AppIcon, type AppIconName } from "../_components/app-icon";
import { LogoutButton } from "./logout-button";

const labels = {
  children: "儿童档案", growth: "身高体重", sleep: "睡眠", meals: "餐食",
  beverages: "奶与饮品", activity: "运动与户外", emotion: "情绪观察", audit: "审计事件"
} as const;

export default function SettingsPage() {
  const menuLink = (href: string, icon: AppIconName, title: string, description: string) => <Link className="settings-menu-item" href={href}>
    <span className="settings-menu-icon"><AppIcon name={icon} /></span><span className="settings-menu-copy"><strong>{title}</strong><small>{description}</small></span><span className="settings-menu-arrow"><AppIcon name="chevron" /></span>
  </Link>;
  return <main className="profile-shell settings-shell">
    <header className="profile-header compact"><span className="settings-eyebrow">管理中心</span><h1>设置</h1><p>集中管理儿童资料、成长记录、家庭数据和本设备登录状态。</p></header>
    <section className="settings-menu-section" aria-labelledby="children-settings-heading">
      <h2 id="children-settings-heading">儿童与记录</h2>
      <div className="settings-menu-list">
        {menuLink("/settings/children/new", "plus", "添加孩子", "建立新的儿童档案")}
        {menuLink("/settings/children", "child", "基础资料与记录", "编辑资料并录入五类成长记录")}
      </div>
    </section>
    <section className="settings-menu-section" aria-labelledby="data-settings-heading">
      <h2 id="data-settings-heading">数据与备份</h2>
      <div className="settings-menu-list">
        {menuLink("/settings/data-management", "database", "删除记录与审计", "恢复已删除记录，查看脱敏操作记录")}
        <details className="settings-menu-disclosure">
          <summary className="settings-menu-item"><span className="settings-menu-icon"><AppIcon name="backup" /></span><span className="settings-menu-copy"><strong>JSON 备份</strong><small>完整、版本化的家庭数据</small></span><span className="settings-menu-arrow"><AppIcon name="chevron" /></span></summary>
          <div className="settings-submenu"><a href="/api/export/json">下载当前数据</a><a href="/api/export/json?includeDeleted=true">下载并包含已删除记录</a></div>
        </details>
        <details className="settings-menu-disclosure">
          <summary className="settings-menu-item"><span className="settings-menu-icon"><AppIcon name="table" /></span><span className="settings-menu-copy"><strong>分领域 CSV</strong><small>按业务分类下载 UTF-8 表格</small></span><span className="settings-menu-arrow"><AppIcon name="chevron" /></span></summary>
          <div className="settings-submenu">{exportDomains.map((domain) => <a href={`/api/export/csv?domain=${domain}`} key={domain}>{labels[domain]} CSV</a>)}</div>
        </details>
      </div>
      <p className="care-note">导出不包含登录会话、密码哈希或 CSRF 凭据。</p>
    </section>
    <section className="settings-menu-section settings-account" aria-labelledby="account-heading">
      <h2 id="account-heading">账户</h2>
      <div className="settings-account-card"><div className="settings-account-copy"><span className="settings-menu-icon"><AppIcon name="account" /></span><span><strong>管理员会话</strong><small>退出后需要重新输入邮箱和密码</small></span></div><LogoutButton /></div>
    </section>
  </main>;
}
