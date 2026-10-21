const snapshotItems = [
  { label: "睡眠", value: "等待记录", tone: "mint" },
  { label: "饮食与饮水", value: "等待记录", tone: "peach" },
  { label: "活动", value: "等待记录", tone: "blue" },
  { label: "今日心情", value: "等待记录", tone: "rose" }
] as const;

export default function HomePage() {
  return (
    <main>
      <section className="hero" aria-labelledby="welcome-title">
        <div className="eyebrow">GrowLog · 家庭成长记录</div>
        <h1 id="welcome-title">把每一天，连成看得见的成长。</h1>
        <p>
          用轻量的日常记录保留睡眠、饮食、活动、情绪与成长变化。GrowLog
          关注长期趋势，也尊重每个孩子自己的节奏。
        </p>
        <div className="hero-actions">
          <a className="primary-action" href="/login">
            管理员登录
          </a>
          <span>私有部署 · 数据由家庭掌控</span>
        </div>
      </section>

      <section className="preview" aria-labelledby="preview-title">
        <div className="section-heading">
          <div>
            <span>今日概览</span>
            <h2 id="preview-title">常用信息，一眼看清</h2>
          </div>
          <div className="date-chip">示例界面</div>
        </div>
        <div className="snapshot-grid">
          {snapshotItems.map((item) => (
            <article className={`snapshot-card ${item.tone}`} key={item.label}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </article>
          ))}
        </div>
        <p className="care-note">
          GrowLog 提供记录与描述性趋势，不替代医生评估，也不会根据少量数据给孩子贴上健康标签。
        </p>
      </section>
    </main>
  );
}

