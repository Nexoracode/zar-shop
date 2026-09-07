"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Bell } from "lucide-react";

export const NOTIFICATIONS_UPDATED_EVENT = "storefront:notifications-updated";

/** Polls the unread count on this cadence; set to 0 to disable. */
const POLL_MS = 60_000;

export function notifyNotificationsUpdated() {
  window.dispatchEvent(new CustomEvent(NOTIFICATIONS_UPDATED_EVENT));
}

/**
 * Just the bell: an unread badge and a link to the notifications page. The list itself lives at
 * `/account/notifications`; the badge stays current by polling and by listening for the
 * "updated" event the notifications panel fires after marking things read.
 */
export function StorefrontNotificationBell({ initialUnread }: { initialUnread: number }) {
  const [unread, setUnread] = useState(initialUnread);

  const refreshUnread = useCallback(async () => {
    try {
      const response = await fetch("/api/account/notifications?limit=0", { cache: "no-store" });
      if (!response.ok) return;
      const data = (await response.json()) as { unread?: number };
      if (typeof data.unread === "number") setUnread(data.unread);
    } catch {
      /* offline — keep the last known count */
    }
  }, []);

  useEffect(() => {
    const onUpdate = () => void refreshUnread();
    window.addEventListener(NOTIFICATIONS_UPDATED_EVENT, onUpdate);
    window.addEventListener("focus", onUpdate);
    const timer = POLL_MS > 0 ? window.setInterval(onUpdate, POLL_MS) : null;
    return () => {
      window.removeEventListener(NOTIFICATIONS_UPDATED_EVENT, onUpdate);
      window.removeEventListener("focus", onUpdate);
      if (timer) window.clearInterval(timer);
    };
  }, [refreshUnread]);

  return (
    <Link
      href="/account/notifications"
      aria-label={unread > 0 ? `اعلان‌ها، ${unread.toLocaleString("fa-IR")} نخوانده` : "اعلان‌ها"}
      className="relative grid size-10 place-items-center rounded-lg bg-transparent text-[var(--foreground)] outline-none transition hover:bg-[var(--brand-primary)]/8 focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)]/30"
    >
      <Bell size={20} strokeWidth={1.7} />
      {unread > 0 && (
        <span className="absolute -bottom-0.5 -right-1 grid h-[18px] min-w-[18px] place-items-center rounded-[5px] border-2 border-white bg-[var(--brand-primary)] px-0.5 text-[9px] font-bold leading-none text-[var(--brand-primary-foreground)]">
          {Math.min(unread, 99).toLocaleString("fa-IR")}{unread > 99 ? "+" : ""}
        </span>
      )}
    </Link>
  );
}
