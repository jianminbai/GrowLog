"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { AppIcon } from "./app-icon";

const destinations = [
  { href: "/today", label: "今天", icon: "today" },
  { href: "/history", label: "足迹", icon: "history" },
  { href: "/children", label: "趋势", icon: "trend" },
  { href: "/settings", label: "设置", icon: "settings" }
] as const;

function isCurrent(pathname: string, href: string) {
  return pathname === href || (href === "/children" && pathname.startsWith("/children/"));
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
        {mobile ? <AppIcon name={destination.icon} /> : null}
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
