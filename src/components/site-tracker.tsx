"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

const HEARTBEAT_MS = 60_000;

function send(body: { path: string; referrer?: string; heartbeat?: boolean }) {
  // `keepalive` lets the request outlive a page that is being left; failures are ignored on
  // purpose — traffic stats must never get in the shopper's way.
  void fetch("/api/track", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), keepalive: true }).catch(() => undefined);
}

/**
 * Anonymous traffic beacon for the storefront: one page view per route change (the first one
 * carries `document.referrer` for the traffic-source breakdown) plus a light heartbeat while the
 * tab is visible, so "online now" reflects people reading a page, not only those navigating.
 * Renders nothing, and never fires inside the admin panel.
 */
export function SiteTracker() {
  const pathname = usePathname();
  const first = useRef(true);
  const pathRef = useRef(pathname);

  useEffect(() => {
    pathRef.current = pathname;
    if (pathname.startsWith("/admin")) return;
    send({ path: pathname, referrer: first.current ? document.referrer : undefined });
    first.current = false;
  }, [pathname]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState !== "visible" || pathRef.current.startsWith("/admin")) return;
      send({ path: pathRef.current, heartbeat: true });
    }, HEARTBEAT_MS);
    return () => window.clearInterval(timer);
  }, []);

  return null;
}
