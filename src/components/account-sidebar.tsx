"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@heroui/react";
import { Bell, Box, ChevronLeft, CircleUserRound, Clock3, Gift, Headset, Heart, LogOut, MapPin, MessageCircle, PackageCheck, Pencil, ShoppingBag, Undo2, UserRound, Wallet, type LucideIcon } from "lucide-react";

type Item = { href: string; label: string; icon: LucideIcon };
type OrderStats = { totalOrders: number; activeOrders: number; deliveredOrders: number; returnCount: number };

export function AccountSidebar({ user, showWallet = false, showReferral = false, walletBalance, orderStats }: { user: { name: string; phone: string }; showWallet?: boolean; showReferral?: boolean; walletBalance?: string; orderStats: OrderStats }) {
  const pathname = usePathname();
  const orderStatItems: Item[] = [
    { href: "/account/orders", label: "کل سفارش‌ها", icon: ShoppingBag },
    { href: "/account/orders", label: "در حال پیگیری", icon: Box },
    { href: "/account/orders", label: "تحویل‌شده", icon: PackageCheck },
    { href: "/account/returns", label: "مرجوعی‌ها", icon: Undo2 },
  ];
  const orderStatValues = [orderStats.totalOrders, orderStats.activeOrders, orderStats.deliveredOrders, orderStats.returnCount];
  // Digikala's mobile profile screen shows this menu only on the hub itself; sub-pages are
  // full-bleed screens with their own heading, reached from here or the bottom-nav account tab.
  // Desktop keeps the sidebar visible everywhere since there's room for it alongside content.
  const isHub = pathname === "/account";
  const items: Item[] = [
    { href: "/account", label: "خلاصه فعالیت‌ها", icon: CircleUserRound },
    { href: "/account/notifications", label: "اعلان‌ها", icon: Bell },
    { href: "/account/orders", label: "سفارش‌ها", icon: ShoppingBag },
    { href: "/account/returns", label: "مرجوعی‌ها", icon: Undo2 },
    { href: "/account/tickets", label: "تیکت‌های من", icon: Headset },
    { href: "/account/favorites", label: "لیست‌های من", icon: Heart },
    { href: "/account/reviews", label: "دیدگاه‌ها و پرسش‌ها", icon: MessageCircle },
    ...(showReferral ? [{ href: "/account/referral", label: "دعوت دوستان", icon: Gift }] : []),
    { href: "/account/recent-visits", label: "بازدیدهای اخیر", icon: Clock3 },
    { href: "/account/addresses", label: "آدرس‌ها", icon: MapPin },
    { href: "/account/profile", label: "اطلاعات حساب", icon: UserRound },
  ];

  return (
    <aside className={`min-w-0 lg:sticky lg:top-24 ${isHub ? "" : "hidden lg:block"}`}>
      <div className="lg:overflow-hidden lg:rounded-xl lg:border lg:border-[var(--border)] lg:bg-[var(--surface)]">
        <div className="flex min-h-20 items-center gap-3 border-b border-[var(--border)] py-4 lg:px-5">
          <div className="min-w-0 flex-1"><strong className="block truncate text-sm font-bold">{user.name}</strong><span className="mt-1 block text-[11px] text-[var(--muted)]" dir="ltr">{user.phone}</span></div>
          <Link href="/account/profile" aria-label="ویرایش اطلاعات حساب" className="grid size-9 shrink-0 place-items-center text-[var(--brand-primary)]"><Pencil size={19} /></Link>
        </div>
        {showWallet && (
          <Link href="/account/wallet" aria-current={pathname === "/account/wallet" ? "page" : undefined} className="flex min-h-14 items-center gap-3 border-b border-[var(--border)] text-xs transition hover:text-[var(--brand-primary)] lg:px-5">
            <Wallet size={19} className="text-[var(--brand-primary)]" />
            <strong>کیف پول</strong>
            <span className="mr-auto font-bold text-[var(--foreground)]">{walletBalance ?? "—"}</span>
          </Link>
        )}
        <div className="border-b border-[var(--border)] py-4 sm:hidden">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="m-0 text-base font-bold">سفارش‌های من</h2>
            <Link href="/account/orders" className="inline-flex items-center gap-1 text-xs font-bold text-[var(--brand-primary)]">مشاهده همه<ChevronLeft size={15} /></Link>
          </div>
          <div className="flex justify-between gap-1">
            {orderStatItems.map(({ href, label, icon: Icon }, index) => (
              <Link key={label} href={href} className="flex min-w-0 flex-1 flex-col items-center gap-2 text-center">
                <span className="relative grid size-12 place-items-center rounded-full bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]">
                  <Icon size={20} />
                  <span className="absolute -left-1 -top-1 grid size-5 place-items-center rounded-full bg-[var(--brand-primary)] text-[10px] font-bold text-[var(--brand-primary-foreground)]">{orderStatValues[index].toLocaleString("fa-IR")}</span>
                </span>
                <span className="w-full truncate text-[11px] text-[var(--muted)]">{label}</span>
              </Link>
            ))}
          </div>
        </div>
        <nav aria-label="منوی حساب کاربری" className="flex flex-col">
          {items.map(({ href, label, icon: Icon }) => {
            const active = href === "/account" ? pathname === href : href === "/account/reviews" ? pathname.startsWith("/account/reviews") : pathname === href || pathname.startsWith(`${href}/`);
            // On mobile this menu only renders while already on /account (isHub above), so a
            // self-link back to the current page is dead weight there — Digikala's own hub
            // screen has no such entry either. Desktop keeps it since the sidebar persists
            // across sub-pages and needs a way back to the hub.
            const isSelfLink = href === "/account";
            return (
              <Link key={href} href={href} aria-current={active ? "page" : undefined} className={`relative ${isSelfLink ? "hidden lg:flex" : "flex"} min-h-14 items-center justify-between border-b border-[var(--border)] text-sm transition last:border-b-0 lg:px-5 ${active ? "font-bold text-[var(--foreground)] after:absolute after:inset-y-0 after:right-0 after:w-[3px] after:rounded-l-full after:bg-[var(--brand-primary)]" : "font-bold text-slate-600 hover:text-[var(--brand-primary)]"}`}>
                <span className="flex items-center gap-3"><Icon size={21} strokeWidth={1.7} /><span>{label}</span></span>
                <ChevronLeft size={17} className="shrink-0 text-[var(--muted)]" />
              </Link>
            );
          })}
        </nav>
        <form action="/api/auth/logout" method="post" className="border-t border-[var(--border)] p-2"><Button type="submit" variant="ghost" fullWidth className="min-h-12 justify-start gap-3 px-1 text-sm font-bold text-slate-600 lg:px-3"><LogOut size={20} />خروج از حساب کاربری</Button></form>
      </div>
    </aside>
  );
}
