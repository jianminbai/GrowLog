import Link from "next/link";

import { AppIcon, type AppIconName } from "./app-icon";

const domains = [
  { route: "growth", label: "身高体重", hint: "测量与趋势", icon: "growth" },
  { route: "sleep", label: "睡眠", hint: "夜间与小睡", icon: "sleep" },
  { route: "nutrition", label: "饮食奶水", hint: "餐食与饮品", icon: "nutrition" },
  { route: "activity", label: "运动户外", hint: "活动与时长", icon: "activity" },
  { route: "emotion", label: "情绪观察", hint: "心情与情境", icon: "emotion" }
] as const satisfies ReadonlyArray<{ route: string; label: string; hint: string; icon: AppIconName }>;

export function DomainLinks({ childId }: { childId: string }) {
  return (
    <nav className="domain-links" aria-label="小朋友的记录分类">
      {domains.map((domain) => (
        <Link aria-label={domain.label} href={`/children/${childId}/${domain.route}`} key={domain.route}>
          <span className="domain-symbol"><AppIcon name={domain.icon} /></span>
          <span><strong>{domain.label}</strong><small>{domain.hint}</small></span>
        </Link>
      ))}
    </nav>
  );
}
