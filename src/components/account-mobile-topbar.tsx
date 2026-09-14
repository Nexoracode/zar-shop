"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { Bell, ChevronRight, Headset, Settings } from "lucide-react";
import { getAccountNavItems } from "@/components/account-nav-items";

// Mirrors Digikala's own mobile profile top bar exactly: on the hub it's a plain sticky bar
// with bell / support / settings icons (no logo, no search — measured from the live site), and
// on every sub-page it collapses to a back-chevron + page title instead, since Digikala's
// sub-pages are separate full-bleed screens rather than the hub with a nav strip glued on top.
// This replaces the storefront's usual mobile header (see globals.css .storefront-shell--focused
// rule) only below lg; desktop keeps the regular site header since there's room for both it and
// the persistent sidebar.
export function AccountMobileTopBar({ showReferral }: { showReferral: boolean }) {
  const pathname = usePathname();
  const isHub = pathname === "/account";

  // Entering /account (e.g. from the bottom nav while scrolled down on a taller page like the
  // home feed) doesn't reset scroll on its own: the storefront's shared root layout/AppChrome
  // wrapper never unmounts across this navigation, so Next's own scroll-to-top never fires and
  // the account page renders mid-scroll instead of at its top.
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0 });
  }, [pathname]);

  if (isHub) {
    return (
      <div className="sticky top-0 z-20 flex items-center justify-between bg-white px-5 py-4 lg:hidden">
        <div className="flex items-center gap-4">
          <Link href="/account/notifications" aria-label="اعلان‌ها" className="grid place-items-center text-[var(--foreground)]"><Bell size={22} strokeWidth={1.6} /></Link>
          <Link href="/account/tickets" aria-label="پشتیبانی" className="grid place-items-center text-[var(--foreground)]"><Headset size={22} strokeWidth={1.6} /></Link>
        </div>
        <Link href="/account/profile" aria-label="تنظیمات حساب" className="grid place-items-center text-[var(--foreground)]"><Settings size={22} strokeWidth={1.6} /></Link>
      </div>
    );
  }

  const items = getAccountNavItems(showReferral);
  const title = pathname === "/account/wallet" ? "کیف پول" : items.find((item) => pathname.startsWith(item.href))?.label ?? "حساب کاربری";
  return (
    <div className="sticky top-0 z-20 flex items-center gap-3 bg-white px-5 py-4 lg:hidden">
      <Link href="/account" aria-label="بازگشت به پروفایل" className="grid place-items-center text-[var(--foreground)]"><ChevronRight size={22} /></Link>
      <strong className="text-base font-bold">{title}</strong>
    </div>
  );
}
