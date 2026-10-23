import type { ReactNode } from "react";

export type AppIconName =
  | "today"
  | "history"
  | "trend"
  | "settings"
  | "growth"
  | "sleep"
  | "nutrition"
  | "activity"
  | "emotion"
  | "child"
  | "database"
  | "backup"
  | "table"
  | "account"
  | "plus"
  | "chevron";

const paths: Record<AppIconName, ReactNode> = {
  today: <path d="M4 10.5 12 4l8 6.5V20h-5v-6H9v6H4z" />,
  history: <path d="M5 3v4h4M5.5 7A8 8 0 1 1 4 15m4-3h4V8" />,
  trend: <path d="M4 18 9 12l4 3 7-9M16 6h4v4" />,
  settings: <path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Zm0-5v2m0 13v2m8.5-8.5h-2m-13 0h-2m14-6-1.4 1.4M7.9 16.1l-1.4 1.4m11 0-1.4-1.4M7.9 7.9 6.5 6.5" />,
  growth: <><path d="M5 20V9m7 11V4m7 16v-7" /><path d="m3.5 11 4-4 3 2 5-5 5 3" /></>,
  sleep: <path d="M19.5 15.5A8 8 0 0 1 8.5 4.5a8 8 0 1 0 11 11Z" />,
  nutrition: <><path d="M7 3v8m-3-8v5a3 3 0 0 0 6 0V3m-3 8v10" /><path d="M16 3v18m0-18c3 1 4 3 4 6h-4" /></>,
  activity: <><circle cx="12" cy="4.5" r="2" /><path d="m9 21 2-6-3-2 2-5 4 3 3 1m-1 9-3-6 3-3" /></>,
  emotion: <><circle cx="12" cy="12" r="9" /><path d="M8.5 10h.01m6.99 0h.01M8.5 15c2.2 1.6 4.8 1.6 7 0" /></>,
  child: <><circle cx="12" cy="8" r="4" /><path d="M5 21c.7-4 3-6 7-6s6.3 2 7 6" /></>,
  database: <><ellipse cx="12" cy="5" rx="8" ry="3" /><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5m-16 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" /></>,
  backup: <><path d="M6 8a7 7 0 1 1-1 8m1-8H2m4 0V4" /><path d="M12 8v5l3 2" /></>,
  table: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18M9 9v11m6-11v11" /></>,
  account: <><circle cx="12" cy="8" r="4" /><path d="M4.5 21c.8-4.3 3.3-6.5 7.5-6.5s6.7 2.2 7.5 6.5" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  chevron: <path d="m9 6 6 6-6 6" />
};

export function AppIcon({ name, className }: { name: AppIconName; className?: string }) {
  return <svg
    aria-hidden="true"
    className={["app-icon", className].filter(Boolean).join(" ")}
    data-icon={name}
    fill="none"
    focusable="false"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth="1.8"
    viewBox="0 0 24 24"
  >
    {paths[name]}
  </svg>;
}
