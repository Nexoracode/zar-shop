"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@heroui/react";
import { CircleUserRound, Clock3, Heart, LogOut, MapPin, MessageCircle, Pencil, ShoppingBag, Sparkles, UserRound, WalletCards, type LucideIcon } from "lucide-react";

type Item = { href: string; label: string; icon: LucideIcon };

export function AccountSidebar({ user }: { user: { name: string; phone: string } }) {
  const pathname = usePathname();
  const items: Item[] = [
    { href: "/account", label: "خلاصه فعالیت‌ها", icon: CircleUserRound },
    { href: "/account/orders", label: "سفارش‌ها", icon: ShoppingBag },
    { href: "/account/favorites", label: "لیست‌های من", icon: Heart },
    { href: "/account/reviews", label: "دیدگاه‌ها و پرسش‌ها", icon: MessageCircle },
    { href: "/account/recent-visits", label: "بازدیدهای اخیر", icon: Clock3 },
    { href: "/account/addresses", label: "آدرس‌ها", icon: MapPin },
    { href: "/account/profile", label: "اطلاعات حساب", icon: UserRound },
  ];

  return (
    <aside className="lg:sticky lg:top-24">
      <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
        <div className="flex min-h-20 items-center gap-3 border-b border-[var(--border)] px-5 py-4">
          <div className="min-w-0 flex-1"><strong className="block truncate text-sm font-black">{user.name}</strong><span className="mt-1 block text-[11px] text-[var(--muted)]" dir="ltr">{user.phone}</span></div>
          <Link href="/account/profile" aria-label="ویرایش اطلاعات حساب" className="grid size-9 place-items-center text-[var(--brand-primary)]"><Pencil size={19} /></Link>
        </div>
        <div className="grid border-b border-[var(--border)] px-5 py-2 text-xs">
          <div className="flex min-h-14 items-center gap-3"><WalletCards size={19} /><strong>کیف پول</strong><span className="mr-auto text-[var(--muted)]">به‌زودی</span></div>
          <div className="flex min-h-14 items-center gap-3 border-t border-[var(--border)]"><Sparkles size={19} className="text-[var(--brand-primary)]" /><strong>باشگاه مشتریان</strong><span className="mr-auto text-[var(--muted)]">۰ امتیاز</span></div>
        </div>
        <nav aria-label="منوی حساب کاربری" className="flex gap-2 overflow-x-auto px-2 lg:block lg:overflow-visible lg:px-0">
          {items.map(({ href, label, icon: Icon }) => {
            const active = href === "/account" ? pathname === href : href === "/account/reviews" ? pathname.startsWith("/account/reviews") : pathname === href || pathname.startsWith(`${href}/`);
            return <Link key={href} href={href} aria-current={active ? "page" : undefined} className={`relative flex min-h-14 shrink-0 items-center gap-3 border-b border-[var(--border)] px-4 text-sm transition last:border-b-0 lg:w-full lg:px-5 ${active ? "font-black text-[var(--foreground)] after:absolute after:inset-y-0 after:right-0 after:w-[3px] after:rounded-l-full after:bg-[var(--brand-primary)]" : "font-bold text-slate-600 hover:text-[var(--brand-primary)]"}`}><Icon size={21} strokeWidth={1.7} /><span>{label}</span></Link>;
          })}
        </nav>
        <form action="/api/auth/logout" method="post" className="border-t border-[var(--border)] p-2"><Button type="submit" variant="ghost" fullWidth className="min-h-12 justify-start gap-3 px-3 text-sm font-bold text-slate-600"><LogOut size={20} />خروج از حساب کاربری</Button></form>
      </div>
    </aside>
  );
}
