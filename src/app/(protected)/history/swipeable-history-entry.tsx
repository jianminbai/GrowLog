"use client";

import Link from "next/link";
import { KeyboardEvent, PointerEvent, useRef, useState } from "react";

const revealDistance = 96;
const revealThreshold = 56;

type SwipeableHistoryEntryProps = {
  href: string;
  category: string;
  childName: string;
  title: string;
  detail: string;
  time: string;
};

export function SwipeableHistoryEntry({
  href, category, childName, title, detail, time
}: SwipeableHistoryEntryProps) {
  const [open, setOpen] = useState(false);
  const [offset, setOffset] = useState(0);
  const start = useRef<{ x: number; y: number } | null>(null);
  const distance = useRef(0);
  const startedOpen = useRef(false);

  function pointerDown(event: PointerEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest("a")) return;
    start.current = { x: event.clientX, y: event.clientY };
    distance.current = 0;
    startedOpen.current = open;
  }

  function pointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!start.current) return;
    const horizontal = event.clientX - start.current.x;
    const vertical = event.clientY - start.current.y;
    if (Math.abs(vertical) > Math.abs(horizontal)) return;
    distance.current = horizontal;
    setOffset(Math.min(revealDistance, Math.max(0, horizontal)));
  }

  function pointerEnd() {
    if (!start.current) return;
    const nextOpen = distance.current >= revealThreshold;
    setOpen(nextOpen);
    setOffset(nextOpen ? revealDistance : 0);
    start.current = null;
    distance.current = 0;
  }

  function keyDown(event: KeyboardEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest("a")) return;
    if (event.key === "Enter" || event.key === " " || event.key === "ArrowRight") {
      event.preventDefault();
      setOpen(true);
      setOffset(revealDistance);
    } else if (event.key === "Escape" || event.key === "ArrowLeft") {
      setOpen(false);
      setOffset(0);
    }
  }

  function pointerCancel() {
    setOpen(startedOpen.current);
    setOffset(startedOpen.current ? revealDistance : 0);
    start.current = null;
    distance.current = 0;
  }

  return <div
    className={`swipe-history-item${open ? " is-open" : ""}`}
    role="group"
    aria-label={title}
    tabIndex={0}
    onKeyDown={keyDown}
    onPointerDown={pointerDown}
    onPointerMove={pointerMove}
    onPointerUp={pointerEnd}
    onPointerCancel={pointerCancel}
  >
    <div className="swipe-edit-slot">
      {open ? <Link href={href}>前往编辑</Link> : null}
    </div>
    <article className="history-entry" style={{ transform: `translateX(${offset}px)` }}>
      <div className="history-copy">
        <span>{category} · {childName}</span>
        <strong>{title}</strong>
        <small>{detail}</small>
      </div>
      <div className="history-time"><time>{time}</time></div>
      <span className="sr-only">向右滑动或按 Enter 显示编辑入口</span>
    </article>
  </div>;
}
