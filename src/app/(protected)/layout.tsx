import type { ReactNode } from "react";

import { requireServerSession } from "@/modules/auth/server-session";

import { AppNavigation } from "./_components/app-navigation";

export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  await requireServerSession();

  return (
    <>
      <AppNavigation />
      <div className="protected-app-shell">{children}</div>
    </>
  );
}

