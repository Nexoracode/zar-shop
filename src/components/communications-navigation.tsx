"use client";

import Link from "next/link";
import { Card } from "@heroui/react";
import { BellRing, ChevronLeft, MessageSquarePlus, Settings2 } from "lucide-react";

const items = [
  { href: "/admin/settings/notifications/providers", title: "ارائه‌دهندگان پیامک", description: "پیکربندی فراز اس‌ام‌اس و ایران اس‌ام‌اس", icon: Settings2 },
  { href: "/admin/settings/notifications/preferences", title: "تنظیمات پیامک و اعلان", description: "کانال‌ها، رویدادها و متن پیام‌های خودکار", icon: BellRing },
  { href: "/admin/settings/notifications/manual", title: "ارسال دستی پیامک", description: "انتخاب مخاطبان هدف و مشاهده تاریخچه ارسال", icon: MessageSquarePlus },
];

export function CommunicationsNavigation() {
  return <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3" dir="rtl">{items.map((item) => <Link key={item.href} href={item.href} className="group"><Card variant="secondary" className="h-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 transition hover:-translate-y-0.5 hover:border-[var(--accent)]/40 hover:shadow-md"><div className="flex items-center gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[var(--accent)]/10 text-[var(--accent)]"><item.icon size={20} /></span><div className="min-w-0 flex-1"><strong className="block text-sm">{item.title}</strong><p className="mb-0 mt-1 text-xs leading-5 text-[var(--muted)]">{item.description}</p></div><ChevronLeft size={17} className="text-[var(--muted)] transition group-hover:-translate-x-1" /></div></Card></Link>)}</div>;
}
