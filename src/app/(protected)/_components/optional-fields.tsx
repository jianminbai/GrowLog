import type { ReactNode } from "react";

export function OptionalFields({
  children,
  defaultOpen = false,
  label = "更多信息"
}: {
  children: ReactNode;
  defaultOpen?: boolean;
  label?: string;
}) {
  return (
    <details className="optional-fields" open={defaultOpen}>
      <summary>{label}</summary>
      <div className="optional-fields-content">{children}</div>
    </details>
  );
}
