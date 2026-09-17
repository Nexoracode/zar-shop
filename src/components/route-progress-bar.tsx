"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/** Thin top-of-page bar that fills from the left while a route transition is in flight, admin excluded (Blueprint's own design system). */
function RouteProgressBarInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const isNavigatingRef = useRef(false);
  const trickleRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hideRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stuckRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clearTimers() {
    if (trickleRef.current) {
      clearInterval(trickleRef.current);
      trickleRef.current = null;
    }
    if (hideRef.current) {
      clearTimeout(hideRef.current);
      hideRef.current = null;
    }
    if (stuckRef.current) {
      clearTimeout(stuckRef.current);
      stuckRef.current = null;
    }
  }

  function start() {
    if (isNavigatingRef.current) return;
    isNavigatingRef.current = true;
    clearTimers();
    setVisible(true);
    setProgress(8);
    trickleRef.current = setInterval(() => {
      setProgress((current) => {
        if (current >= 90) return current;
        const step = current < 50 ? 8 : current < 75 ? 4 : 1;
        return Math.min(90, current + step);
      });
    }, 250);
    // Browser back/forward (popstate) doesn't reliably pair with the pathname-change effect
    // below the way a same-tab link click does — a route restored instantly from the router
    // cache can remount this component around the same tick, resetting isNavigatingRef before
    // finish() ever sees it was navigating, which left the bar stuck around 90% forever. This
    // is a hard ceiling so it always completes even when that pairing is missed.
    stuckRef.current = setTimeout(finish, 4000);
  }

  function finish() {
    if (!isNavigatingRef.current) return;
    isNavigatingRef.current = false;
    clearTimers();
    setProgress(100);
    hideRef.current = setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, 300);
  }

  useEffect(() => {
    finish();
    // Only the route key (path + query) matters here; `finish` is stable across renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams.toString()]);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as HTMLElement | null)?.closest("a");
      if (!anchor || !(anchor instanceof HTMLAnchorElement) || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;

      let url: URL;
      try {
        url = new URL(href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      start();
    }

    document.addEventListener("click", onClick);
    window.addEventListener("popstate", start);
    window.addEventListener("beforeunload", start);
    return () => {
      document.removeEventListener("click", onClick);
      window.removeEventListener("popstate", start);
      window.removeEventListener("beforeunload", start);
      clearTimers();
    };
    // Listeners are attached once; `start` only reads/writes refs and state setters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (pathname.startsWith("/admin")) return null;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-[310] h-[3px] overflow-hidden" style={{ opacity: visible ? 1 : 0, transition: "opacity 200ms ease" }}>
      <div className="absolute inset-y-0 left-0 bg-[var(--brand-accent)]" style={{ width: `${progress}%`, transition: "width 250ms ease" }} />
    </div>
  );
}

export function RouteProgressBar() {
  return (
    <Suspense fallback={null}>
      <RouteProgressBarInner />
    </Suspense>
  );
}
