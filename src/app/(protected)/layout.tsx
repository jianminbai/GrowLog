import Link from "next/link";
import type { ReactNode } from "react";

import { requireServerSession } from "@/modules/auth/server-session";

export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  await requireServerSession();

  return (
    <>
      <nav className="app-nav" aria-label="主要导航">
        <Link className="app-brand" href="/today">GrowLog</Link>
        <div>
          <Link href="/today">今天</Link>
          <Link href="/children">儿童档案</Link>
        </div>
      </nav>
      {children}
    </>
  );
}

