"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { earliestUpcoming } from "@/modules/products/discount-window";

/**
 * Re-runs the page's server components the moment the soonest discount on it expires.
 *
 * Prices, badges and struck-through originals are all rendered on the server, so a reader who
 * stays on a listing keeps seeing a discount that has already ended. Give this the discount end
 * moments of whatever the page rendered (`moments`, from `discountEndMoments`) and it refreshes
 * once, in place, when the earliest one still ahead arrives — no reload, so scroll position and
 * the rest of the page survive. A caller that already knows the exact instant passes it as `at`.
 *
 * The clock is read here, in the browser, and never on the server: a page that calls `Date.now()`
 * while rendering cannot be prerendered.
 *
 * One timer per page rather than one per card, and a timeout rather than a per-second tick: the
 * only interesting instant is the expiry itself.
 */
export function DiscountExpiryRefresh({ at, moments }: { at?: string | null; moments?: string[] }) {
  const router = useRouter();
  // Arrays are new on every render; a joined string keeps the effect from restarting each time.
  const momentsKey = moments?.join("|") ?? "";

  useEffect(() => {
    const target = at ?? earliestUpcoming(momentsKey ? momentsKey.split("|") : [], Date.now());
    if (!target) return;
    const endsAt = new Date(target).getTime();
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
  }, [at, momentsKey, router]);

  return null;
}
