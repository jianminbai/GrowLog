export default function TodayPage() {
  return (
    <main className="today-shell">
      <header className="today-header">
        <div>
          <span className="eyebrow">Today</span>
          <h1>今天，慢慢记录。</h1>
        </div>
        <span className="date-chip">成长概览即将建立</span>
      </header>
      <section className="empty-state">
        <p>先建立儿童档案，GrowLog 就会在这里整理今天已记录和待记录的项目。</p>
      </section>
    </main>
  );
}

