"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ADMIN_IDLE_MS } from "@/modules/auth/admin-elevation";

const PING_EVERY_MS = 4 * 60 * 1000;
const CHECK_EVERY_MS = 30 * 1000;
const ACTIVITY_EVENTS = ["pointerdown", "keydown", "scroll", "touchstart"] as const;

/**
 * Keeps the admin window (see modules/auth/admin-elevation.ts) open while the panel is actually
 * being used and closes it on this side when it is not. Typing into a long form counts as
 * activity, so an edit that runs past the idle limit doesn't get its Save rejected; a panel left
 * open and untouched is sent back to the sign-in page once the limit passes.
 */
export function AdminSessionKeeper() {
  const router = useRouter();
  const lastActivity = useRef(0);
  const lastPing = useRef(0);
  const pinging = useRef(false);

  useEffect(() => {
    lastActivity.current = Date.now();
    lastPing.current = Date.now();
    let ended = false;

    function end() {
      if (ended) return;
      ended = true;
      router.replace("/admin/login");
    }

    async function check() {
      if (ended) return;
      const now = Date.now();
      if (now - lastActivity.current >= ADMIN_IDLE_MS) return end();
      if (lastActivity.current <= lastPing.current || now - lastPing.current < PING_EVERY_MS || pinging.current) return;
      pinging.current = true;
      try {
        const response = await fetch("/api/admin/session/keepalive", { method: "POST" });
        lastPing.current = Date.now();
        if (response.status === 401) end();
      } catch {
        // A dropped connection isn't a closed window; the next check simply tries again.
      } finally {
        pinging.current = false;
      }
    }

    const mark = () => { lastActivity.current = Date.now(); };
    const onVisible = () => { if (document.visibilityState === "visible") void check(); };
    for (const name of ACTIVITY_EVENTS) window.addEventListener(name, mark, { passive: true, capture: true });
    document.addEventListener("visibilitychange", onVisible);
    const timer = window.setInterval(() => void check(), CHECK_EVERY_MS);

    return () => {
      for (const name of ACTIVITY_EVENTS) window.removeEventListener(name, mark, { capture: true });
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(timer);
    };
  }, [router]);

  return null;
}
