"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const destinations = [
  { href: "/today", label: "今天", icon: "today" },
  { href: "/history", label: "足迹", icon: "history" },
  { href: "/children", label: "趋势", icon: "trend" },
  { href: "/settings", label: "设置", icon: "settings" }
] as const;

function isCurrent(pathname: string, href: string) {
  return pathname === href || (href === "/children" && pathname.startsWith("/children/"));
}

function NavIcon({ name }: { name: (typeof destinations)[number]["icon"] }) {
  if (name === "today") {
    return <path d="M4 10.5 12 4l8 6.5V20h-5v-6H9v6H4z" />;
  }
  if (name === "history") {
    return <path d="M5 3v4h4M5.5 7A8 8 0 1 1 4 15m4-3h4V8" />;
  }
  if (name === "trend") {
    return <path d="M4 18 9 12l4 3 7-9M16 6h4v4" />;
  }
  return <path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Zm0-5v2m0 13v2m8.5-8.5h-2m-13 0h-2m14-6-1.4 1.4M7.9 16.1l-1.4 1.4m11 0-1.4-1.4M7.9 7.9 6.5 6.5" />;
}

function NavigationLinks({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname();

  return destinations.map((destination) => {
    const current = isCurrent(pathname, destination.href);
    return (
      <Link
        className={current ? "is-current" : undefined}
        href={destination.href}
        aria-current={current ? "page" : undefined}
        key={destination.href}
      >
        {mobile ? (
          <svg aria-hidden="true" viewBox="0 0 24 24">
            <NavIcon name={destination.icon} />
          </svg>
        ) : null}
        <span>{destination.label}</span>
      </Link>
    );
  });
}

export function AppNavigation() {
  return (
    <>
      <nav className="desktop-app-nav" aria-label="桌面主要导航">
        <Link className="app-brand" href="/today">GrowLog</Link>
        <div className="app-nav-links"><NavigationLinks /></div>
      </nav>
      <nav className="mobile-app-nav" aria-label="手机主要导航">
        <NavigationLinks mobile />
      </nav>
    </>
  );
}
