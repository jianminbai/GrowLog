export const recordDomains = [
  { route: "growth", label: "身高体重" },
  { route: "sleep", label: "睡眠" },
  { route: "nutrition", label: "饮食奶水" },
  { route: "activity", label: "运动户外" },
  { route: "emotion", label: "情绪观察" }
] as const;
export type RecordDomain = typeof recordDomains[number]["route"];
