import Link from "next/link";
import { BellRing, ChevronLeft, FileText, ListChecks, MessageSquarePlus, Settings2, type LucideIcon } from "lucide-react";

const items: { href: string; title: string; description: string; icon: LucideIcon }[] = [
  { href: "/admin/settings/notifications/providers", title: "ارائه‌دهندگان پیامک", description: "اتصال فراز اس‌ام‌اس، وضعیت حساب و ارسال آزمایشی", icon: Settings2 },
  { href: "/admin/settings/notifications/patterns", title: "پترن‌های پیامک", description: "ساخت، ویرایش و حذف پترن‌های تأییدشده فراز اس‌ام‌اس", icon: FileText },
  { href: "/admin/settings/notifications/events", title: "پیامک‌های رویدادها", description: "انتخاب پترن یا متن برای هر مرحله‌ی سفارش", icon: ListChecks },
  { href: "/admin/settings/notifications/preferences", title: "تنظیمات پیامک و اعلان", description: "کانال‌های پیامک و اعلان و شماره مدیر", icon: BellRing },
  { href: "/admin/settings/notifications/manual", title: "ارسال دستی پیامک", description: "انتخاب مخاطبان هدف و مشاهده تاریخچه ارسال", icon: MessageSquarePlus },
];

export function BlueprintCommunicationsNavigation() {
  return (
    <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <Link key={item.href} href={item.href} className="bp-frame group relative flex items-center gap-3 p-[14px] transition hover:border-[var(--bp-accent)]">
          <span className="grid size-9 shrink-0 place-items-center border border-[var(--bp-divider)] text-[var(--bp-accent)]"><item.icon size={17} /></span>
          <div className="min-w-0 flex-1"><strong className="block text-[13px]">{item.title}</strong><span className="bp-muted mt-0.5 block truncate text-[11px]">{item.description}</span></div>
          <ChevronLeft size={16} className="bp-muted shrink-0 transition group-hover:-translate-x-0.5 group-hover:text-[var(--bp-accent)]" />
        </Link>
      ))}
    </div>
  );
}
