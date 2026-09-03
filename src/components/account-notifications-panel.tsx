"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, toast } from "@heroui/react";
import { Bell, CheckCheck, X } from "lucide-react";
import { formatRelativeFa } from "@/lib/format";
import { notifyNotificationsUpdated } from "@/components/storefront-notification-bell";

type Item = {
  id: string;
  type: string;
  title: string;
  body: string;
  ctaHref: string | null;
  createdAt: string;
  read: boolean;
  dismissed: boolean;
};

export function AccountNotificationsPanel({ items: initialItems }: { items: Item[] }) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [busy, setBusy] = useState<string | null>(null);

  async function patch(id: string, body: { read?: true; dismissed?: true }) {
    return fetch(`/api/account/notifications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  async function markRead(id: string) {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, read: true } : item)));
    try { await patch(id, { read: true }); } catch { /* best effort */ }
    notifyNotificationsUpdated();
  }

  async function remove(id: string) {
    setBusy(id);
    const previous = items;
    setItems((current) => current.filter((item) => item.id !== id));
    try {
      const response = await patch(id, { dismissed: true });
      if (!response.ok) throw new Error();
      notifyNotificationsUpdated();
      router.refresh();
    } catch {
      setItems(previous);
      toast.danger("حذف اعلان انجام نشد");
    } finally {
      setBusy(null);
    }
  }

  async function markAllRead() {
    setItems((current) => current.map((item) => ({ ...item, read: true })));
    try { await fetch("/api/account/notifications", { method: "POST" }); } catch { /* best effort */ }
    notifyNotificationsUpdated();
    router.refresh();
  }

  const hasUnread = items.some((item) => !item.read);

  return (
    <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm" dir="rtl">
      <div className="flex items-center gap-3 border-b border-[var(--border)] px-5 py-4">
        <Bell size={19} className="text-[var(--brand-primary)]" />
        <h1 className="m-0 text-base font-bold">اعلان‌ها</h1>
        {hasUnread && (
          <Button type="button" variant="ghost" size="sm" className="mr-auto min-h-9 gap-1.5 px-2 text-xs text-[var(--brand-primary)]" onPress={() => void markAllRead()}>
            <CheckCheck size={15} />خواندن همه
          </Button>
        )}
      </div>
      <ul className="m-0 list-none p-0">
        {items.map((item) => (
          <li key={item.id} className={`flex items-start gap-3 border-b border-[var(--border)] px-5 py-4 last:border-b-0 ${item.read ? "" : "bg-[var(--brand-primary)]/[0.04]"}`}>
            <span aria-hidden className={`mt-2 size-2 shrink-0 rounded-full ${item.read ? "bg-transparent" : "bg-[var(--brand-primary)]"}`} />
            <div className="min-w-0 flex-1">
              <strong className="block text-sm font-bold leading-6">{item.title}</strong>
              <p className="m-0 mt-1 text-xs leading-6 text-[var(--muted)]">{item.body}</p>
              <div className="mt-2 flex items-center gap-3">
                <span className="text-[10px] text-[var(--muted)]">{formatRelativeFa(item.createdAt)}</span>
                {item.ctaHref && (
                  <Link href={item.ctaHref} onClick={() => void markRead(item.id)} className="text-[11px] font-bold text-[var(--brand-primary)]">
                    مشاهده
                  </Link>
                )}
              </div>
            </div>
            <Button
              type="button"
              isIconOnly
              variant="ghost"
              size="sm"
              isPending={busy === item.id}
              aria-label={`حذف اعلان ${item.title}`}
              className="min-h-9 min-w-9 text-[var(--muted)]"
              onPress={() => void remove(item.id)}
            >
              <X size={16} />
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
