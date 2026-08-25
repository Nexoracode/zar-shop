"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Re-runs the page's server components the moment the soonest discount on it expires.
 *
 * Prices, badges and struck-through originals are all rendered on the server, so a reader who
 * stays on a listing keeps seeing a discount that has already ended. Give this the earliest
 * upcoming expiry among whatever the page rendered and it refreshes once, in place — no reload,
 * so scroll position and the rest of the page survive.
 *
 * One timer per page rather than one per card, and a timeout rather than a per-second tick: the
 * only interesting instant is the expiry itself.
 */
export function DiscountExpiryRefresh({ at }: { at: string | null }) {
  const router = useRouter();

  useEffect(() => {
    if (!at) return;
    const endsAt = new Date(at).getTime();
    if (Number.isNaN(endsAt)) return;
    let done = false;

    function refresh() {
      if (done || Date.now() < endsAt) return;
      done = true;
      router.refresh();
    }

    // `setTimeout` is clamped to ~24 days; anything further out is not worth holding a timer for,
    // and the visibility check still catches it if the tab is left open that long.
    const delay = endsAt - Date.now();
    const timer = delay > 0 && delay < 86_400_000 ? window.setTimeout(refresh, delay + 500) : undefined;
    // A hidden tab throttles timers, so re-check whenever the reader comes back to it.
    function onVisible() { if (document.visibilityState === "visible") refresh(); }
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      if (timer !== undefined) window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [at, router]);

  return null;
}
