"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@heroui/react";
import { CircleUserRound, Clock3, Heart, LogOut, MapPin, MessageSquareText, PackageSearch, ShoppingBag, Star, UserRound, type LucideIcon } from "lucide-react";

type Item = { href: string; label: string; icon: LucideIcon; count?: number };

export function AccountSidebar({ user, counts }: { user: { name: string; phone: string }; counts: { orders: number; addresses: number; favorites: number; reviews: number; pendingReviews: number; visits: number } }) {
  const pathname = usePathname();
  const items: Item[] = [
    { href: "/account", label: "خلاصه حساب", icon: CircleUserRound },
    { href: "/account/orders", label: "سفارش‌های من", icon: ShoppingBag, count: counts.orders },
    { href: "/account/favorites", label: "علاقه‌مندی‌ها", icon: Heart, count: counts.favorites },
    { href: "/account/reviews", label: "دیدگاه‌های شما", icon: MessageSquareText, count: counts.reviews },
    { href: "/account/reviews/pending", label: "در انتظار دیدگاه", icon: Star, count: counts.pendingReviews },
    { href: "/account/recent-visits", label: "بازدیدهای اخیر", icon: Clock3, count: counts.visits },
    { href: "/account/addresses", label: "نشانی‌ها", icon: MapPin, count: counts.addresses },
    { href: "/account/profile", label: "اطلاعات حساب", icon: UserRound },
  ];
  return <aside className="grid gap-4 lg:sticky lg:top-24"><div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm"><div className="flex items-center gap-3 border-b border-[var(--border)] p-5"><span className="grid size-12 shrink-0 place-items-center rounded-full bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]"><UserRound size={24} /></span><div className="min-w-0"><strong className="block truncate text-sm">{user.name}</strong><span className="mt-1 block text-xs text-[var(--muted)]" dir="ltr">{user.phone}</span></div></div><nav aria-label="منوی حساب کاربری" className="flex gap-2 overflow-x-auto p-2 lg:grid lg:gap-0">{items.map(({ href, label, icon: Icon, count }) => { const exactOnly = href === "/account" || href === "/account/reviews"; const active = exactOnly ? pathname === href : pathname === href || pathname.startsWith(`${href}/`); return <Link key={href} href={href} aria-current={active ? "page" : undefined} className={`flex min-h-12 shrink-0 items-center gap-3 rounded-xl px-3 text-sm font-bold transition lg:w-full ${active ? "bg-[var(--brand-primary)]/8 text-[var(--brand-primary)]" : "text-[var(--foreground)] hover:bg-[var(--surface-secondary)]"}`}><Icon size={19} /><span>{label}</span>{typeof count === "number" && <span className="mr-auto rounded-full bg-[var(--surface-secondary)] px-2 py-0.5 text-[11px] text-[var(--muted)]">{count.toLocaleString("fa-IR")}</span>}</Link>; })}</nav><form action="/api/auth/logout" method="post" className="border-t border-[var(--border)] p-2"><Button type="submit" variant="ghost" fullWidth className="min-h-12 justify-start gap-3 px-3 text-[var(--danger)]"><LogOut size={19} />خروج از حساب کاربری</Button></form></div><div className="hidden rounded-2xl border border-dashed border-[var(--border)] p-4 text-xs text-[var(--muted)] lg:flex lg:items-center lg:gap-3"><PackageSearch size={20} />هر بخش حساب در صفحه مستقل نمایش داده می‌شود.</div></aside>;
}
