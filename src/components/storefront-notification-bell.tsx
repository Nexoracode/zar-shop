"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button, Popover, Spinner, toast } from "@heroui/react";
import { Bell, CheckCheck } from "lucide-react";
import { formatRelativeFa } from "@/lib/format";

export const NOTIFICATIONS_UPDATED_EVENT = "storefront:notifications-updated";

/** Polls the unread count on this cadence; set to 0 to disable. */
const POLL_MS = 60_000;

export function notifyNotificationsUpdated() {
  window.dispatchEvent(new CustomEvent(NOTIFICATIONS_UPDATED_EVENT));
}

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string;
  ctaHref: string | null;
  createdAt: string;
  read: boolean;
};

export function StorefrontNotificationBell({ initialUnread }: { initialUnread: number }) {
  const [unread, setUnread] = useState(initialUnread);
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggerAreaRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);

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

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/account/notifications?limit=8", { cache: "no-store" });
      const data = (await response.json().catch(() => null)) as { items?: NotificationItem[]; unread?: number; message?: string } | null;
      if (!response.ok) throw new Error(data?.message ?? "اعلان‌ها دریافت نشد.");
      setItems(data?.items ?? []);
    } catch (error) {
      toast.danger("اعلان‌ها دریافت نشد", { description: error instanceof Error ? error.message : "خطای ناشناخته" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const containsPoint = (element: HTMLElement | null, x: number, y: number, tolerance = 0) => {
      if (!element) return false;
      const rect = element.getBoundingClientRect();
      return x >= rect.left - tolerance && x <= rect.right + tolerance && y >= rect.top - tolerance && y <= rect.bottom + tolerance;
    };

    const cancelScheduledClose = () => {
      if (!closeTimer.current) return;
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    };

    const schedulePointerClose = () => {
      if (closeTimer.current) return;
      closeTimer.current = setTimeout(() => {
        closeTimer.current = null;
        setIsOpen(false);
      }, 260);
    };

    const handlePointerMove = (event: PointerEvent) => {
      const isOverTrigger = containsPoint(triggerAreaRef.current, event.clientX, event.clientY, 4);
      const isOverContent = containsPoint(contentRef.current, event.clientX, event.clientY, 8);
      if (isOverTrigger || isOverContent) cancelScheduledClose();
      else schedulePointerClose();
    };

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (triggerAreaRef.current?.contains(target) || contentRef.current?.contains(target)) return;
      cancelScheduledClose();
      setIsOpen(false);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      cancelScheduledClose();
      setIsOpen(false);
    };

    document.addEventListener("pointermove", handlePointerMove, { passive: true });
    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("keydown", handleEscape);
      cancelScheduledClose();
    };
  }, [isOpen]);

  function openPopover() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setIsOpen(true);
    if (!items && !loading) void loadItems();
  }

  function closePopover() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = null;
    setIsOpen(false);
  }

  async function markRead(item: NotificationItem) {
    if (item.read) return;
    setItems((current) => current?.map((row) => (row.id === item.id ? { ...row, read: true } : row)) ?? current);
    setUnread((current) => Math.max(0, current - 1));
    try {
      await fetch(`/api/account/notifications/${item.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ read: true }) });
    } catch {
      /* best effort */
    }
    notifyNotificationsUpdated();
  }

  async function markAllRead() {
    setItems((current) => current?.map((row) => ({ ...row, read: true })) ?? current);
    setUnread(0);
    try {
      await fetch("/api/account/notifications", { method: "POST" });
    } catch {
      /* best effort */
    }
    notifyNotificationsUpdated();
  }

  const badge = unread > 0 && (
    <span className="absolute -bottom-0.5 -right-1 grid h-[18px] min-w-[18px] place-items-center rounded-[5px] border-2 border-white bg-[var(--brand-primary)] px-0.5 text-[9px] font-bold leading-none text-[var(--brand-primary-foreground)]">
      {Math.min(unread, 99).toLocaleString("fa-IR")}{unread > 99 ? "+" : ""}
    </span>
  );

  return (
    <div ref={triggerAreaRef} onPointerEnter={openPopover} className="relative">
      <Link
        href="/account/notifications"
        aria-label={unread > 0 ? `اعلان‌ها، ${unread.toLocaleString("fa-IR")} نخوانده` : "اعلان‌ها"}
        onClick={closePopover}
        className="relative z-10 grid size-10 cursor-pointer place-items-center rounded-lg bg-transparent text-[var(--foreground)] outline-none transition hover:bg-[var(--brand-primary)]/8 focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)]/30"
      >
        <Bell size={20} strokeWidth={1.7} />
        {badge}
      </Link>
      <Popover isOpen={isOpen}>
        <Popover.Trigger aria-hidden="true" className="pointer-events-none absolute inset-0" />
        <Popover.Content
          ref={contentRef}
          isNonModal
          placement="bottom left"
          offset={8}
          dir="rtl"
          className="z-[200] w-[min(94vw,380px)] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] p-0 text-right text-[var(--foreground)] shadow-[0_10px_35px_rgba(15,23,42,.18)]"
        >
          <Popover.Dialog dir="rtl" className="p-0 text-right">
            <div className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-3">
              <Popover.Heading className="m-0 text-sm font-bold">اعلان‌ها</Popover.Heading>
              {items && items.some((item) => !item.read) && (
                <Button type="button" variant="ghost" size="sm" onPress={() => void markAllRead()} className="mr-auto min-h-8 gap-1.5 px-2 text-[11px] text-[var(--brand-primary)]">
                  <CheckCheck size={14} />خواندن همه
                </Button>
              )}
            </div>

            {loading && !items ? (
              <div className="grid min-h-32 place-items-center"><Spinner size="md" /></div>
            ) : items && items.length > 0 ? (
              <ul className="m-0 max-h-[360px] list-none overflow-y-auto p-0">
                {items.map((item) => (
                  <li key={item.id} className="border-b border-[var(--border)] last:border-b-0">
                    <Link
                      href={item.ctaHref ?? "/account/notifications"}
                      onClick={() => { void markRead(item); closePopover(); }}
                      className={`flex gap-2.5 px-4 py-3 transition hover:bg-[var(--surface-secondary)] ${item.read ? "" : "bg-[var(--brand-primary)]/[0.04]"}`}
                    >
                      <span aria-hidden className={`mt-1.5 size-2 shrink-0 rounded-full ${item.read ? "bg-transparent" : "bg-[var(--brand-primary)]"}`} />
                      <span className="min-w-0 flex-1">
                        <strong className="block text-[13px] font-bold leading-6">{item.title}</strong>
                        <span className="mt-0.5 block text-[12px] leading-5 text-[var(--muted)] line-clamp-2">{item.body}</span>
                        <span className="mt-1 block text-[10px] text-[var(--muted)]">{formatRelativeFa(item.createdAt)}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="grid min-h-28 place-items-center px-5 text-sm text-[var(--muted)]">اعلانی ندارید.</div>
            )}

            <Link href="/account/notifications" onClick={closePopover} className="block border-t border-[var(--border)] px-4 py-3 text-center text-[12px] font-bold text-[var(--brand-primary)]">
              همه اعلان‌ها
            </Link>
          </Popover.Dialog>
        </Popover.Content>
      </Popover>
    </div>
  );
}
