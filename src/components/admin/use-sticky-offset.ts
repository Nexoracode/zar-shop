"use client";

import { useLayoutEffect, type RefObject } from "react";

/**
 * Publishes a sticky page header's height as `--admin-sticky-top` on the shell root, so a
 * table's own sticky header can park directly beneath it instead of sliding behind it.
 *
 * Measured rather than hard-coded: the admin header wraps to a second line on narrow screens,
 * and a stale constant would leave the table header either overlapped or floating.
 */
export function useStickyHeaderOffset(headerRef: RefObject<HTMLElement | null>, rootRef: RefObject<HTMLElement | null>, extra = 0) {
  useLayoutEffect(() => {
    const header = headerRef.current;
    const root = rootRef.current;
    if (!header || !root) return;
    const publish = () => root.style.setProperty("--admin-sticky-top", `${Math.round(header.getBoundingClientRect().height) + extra}px`);
    publish();
    const observer = new ResizeObserver(publish);
    observer.observe(header);
    return () => observer.disconnect();
  }, [headerRef, rootRef, extra]);
}
