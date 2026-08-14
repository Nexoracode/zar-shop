"use client";

import Link from "next/link";
import { Button, Popover } from "@heroui/react";
import { ChevronDown, ChevronLeft, Clock3, Heart, LogOut, MapPin, MessageCircle, ShoppingBag, Sparkles, UserRound } from "lucide-react";

type AccountUser = { firstName: string | null; lastName: string | null; email: string; phone: string | null; isGuest: boolean };

export function StorefrontAccountMenu({ user, className = "" }: { user: AccountUser | null; className?: string }) {
  if (!user || user.isGuest) {
    return <Link href={user ? "/cart" : "/login"} aria-label={user ? "ادامه خرید مهمان" : "ورود به حساب کاربری"} className={`grid size-10 place-items-center rounded-lg transition hover:bg-[var(--brand-primary)]/8 ${className}`}><UserRound size={21} strokeWidth={1.7} /></Link>;
  }

  const name = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.email;
  const items = [
    { href: "/account/orders", label: "سفارش‌ها", icon: ShoppingBag },
    { href: "/account/addresses", label: "آدرس‌ها", icon: MapPin },
    { href: "/account/favorites", label: "لیست‌های من", icon: Heart },
    { href: "/account/reviews", label: "دیدگاه‌ها و پرسش‌ها", icon: MessageCircle },
    { href: "/account/recent-visits", label: "بازدیدهای اخیر", icon: Clock3 },
  ];

  return (
    <Popover>
      <Popover.Trigger aria-label="نمایش منوی حساب کاربری" className={`group flex h-10 cursor-pointer items-center gap-1 rounded-lg bg-transparent px-2 text-[var(--foreground)] outline-none transition aria-expanded:bg-[var(--brand-primary)]/8 focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)]/30 ${className}`}>
        <UserRound size={21} strokeWidth={1.7} />
        <ChevronDown size={14} className="text-[var(--muted)] transition-transform group-aria-expanded:rotate-180" />
      </Popover.Trigger>
      <Popover.Content placement="bottom left" dir="rtl" className="z-[190] w-[min(92vw,290px)] rounded-xl border border-[var(--border)] bg-[var(--surface)] p-0 text-right text-[var(--foreground)] shadow-[0_10px_35px_rgba(15,23,42,.18)]">
        <Popover.Dialog dir="rtl" className="p-0 text-right">
          <Link href="/account/profile" className="flex min-h-16 items-center gap-3 border-b border-[var(--border)] px-5 font-black"><span className="min-w-0 flex-1 truncate text-sm">{name}</span><ChevronLeft size={18} className="text-[var(--muted)]" /></Link>
          <Link href="/account" className="flex min-h-12 items-center gap-3 border-b border-[var(--border)] px-5 text-xs font-bold text-[var(--brand-primary)]"><Sparkles size={18} /><span className="flex-1">باشگاه مشتریان</span><small className="font-normal text-[var(--muted)]">به‌زودی</small><ChevronLeft size={15} /></Link>
          <nav aria-label="دسترسی‌های حساب کاربری" className="px-4">
            {items.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className="flex min-h-12 items-center gap-3 border-b border-[var(--border)] px-1 text-sm font-bold text-slate-700 transition last:border-b-0 hover:text-[var(--brand-primary)]"><Icon size={20} strokeWidth={1.7} className="text-slate-600" /><span className="flex-1">{label}</span></Link>)}
          </nav>
          <form action="/api/auth/logout" method="post" className="border-t border-[var(--border)] p-2"><Button type="submit" variant="ghost" fullWidth className="min-h-11 justify-start gap-3 px-3 text-sm font-bold text-slate-700"><LogOut size={20} strokeWidth={1.7} />خروج از حساب کاربری</Button></form>
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
}
