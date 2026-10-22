import Link from "next/link";

const domains = [
  { route: "growth", label: "身高体重", hint: "测量与趋势", symbol: "↗" },
  { route: "sleep", label: "睡眠", hint: "夜间与小睡", symbol: "☾" },
  { route: "nutrition", label: "饮食奶水", hint: "餐食与饮品", symbol: "◌" },
  { route: "activity", label: "运动户外", hint: "活动与时长", symbol: "◇" },
  { route: "emotion", label: "情绪观察", hint: "心情与情境", symbol: "☺" }
] as const;

export function DomainLinks({ childId }: { childId: string }) {
  return (
    <nav className="domain-links" aria-label="小朋友的记录分类">
      {domains.map((domain) => (
        <Link aria-label={domain.label} href={`/children/${childId}/${domain.route}`} key={domain.route}>
          <span className="domain-symbol" aria-hidden="true">{domain.symbol}</span>
          <span><strong>{domain.label}</strong><small>{domain.hint}</small></span>
        </Link>
      ))}
    </nav>
  );
}
