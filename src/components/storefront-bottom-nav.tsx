"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Headphones, Home, LayoutGrid, UserRound } from "lucide-react";
import { StorefrontCartLink } from "@/components/storefront-cart-link";

// Matches Digikala's own mobile bottom nav exactly (measured from the live site): 5 tabs, each
// icon with a visible label under it (not the sr-only label the old 4-tab bar used), muted gray
// by default and bold/dark on the active tab. The "من" tab is renamed off Digikala's own brand
// name to this store's, and the community-feed tab (a feature this app doesn't have) becomes the
// closest existing equivalent — support — rather than a nonsense link.
export function StorefrontBottomNav({ cartCount, accountHref, ticketsHref }: { cartCount: number; accountHref: string; ticketsHref: string }) {
  const pathname = usePathname();
  const tabClass = (active: boolean) => `flex flex-1 flex-col items-center justify-center gap-1 py-1 ${active ? "font-bold text-[var(--foreground)]" : "text-slate-400"}`;

  const isHome = pathname === "/";
  const isCategories = pathname === "/categories";
  const isCart = pathname === "/cart";
  const isTickets = pathname.startsWith("/account/tickets");
  const isAccount = (pathname.startsWith("/account") && !isTickets) || pathname === "/login" || pathname === "/register";

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 flex h-[66px] border-t border-[#e7e9ed] bg-white/95 shadow-[0_-5px_20px_rgba(0,0,0,.05)] backdrop-blur lg:hidden" aria-label="ناوبری موبایل">
      <Link href="/" className={tabClass(isHome)}><Home size={22} strokeWidth={1.7} /><span className="text-[10px]">خانه</span></Link>
      <Link href="/categories" className={tabClass(isCategories)}><LayoutGrid size={22} strokeWidth={1.7} /><span className="text-[10px]">دسته‌بندی</span></Link>
      <StorefrontCartLink initialCount={cartCount} mobile showLabel iconSize={22} className={tabClass(isCart)} />
      <Link href={ticketsHref} className={tabClass(isTickets)}><Headphones size={22} strokeWidth={1.7} /><span className="text-[10px]">پشتیبانی</span></Link>
      <Link href={accountHref} className={tabClass(isAccount)}><UserRound size={22} strokeWidth={1.7} /><span className="text-[10px]">{accountHref === "/login" ? "ورود" : "حساب من"}</span></Link>
    </nav>
  );
}
