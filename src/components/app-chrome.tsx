"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";
import { Card } from "@heroui/react";
import { Rocket, Settings2, Store } from "lucide-react";
import { CompareProvider } from "@/components/compare-provider";
import { CompareTray } from "@/components/compare-tray";

export function AppChrome({ header, footer, children, storefrontAvailable, maintenanceMode, setupIncomplete = false, viewerIsAdmin = false, storeName, brandStyle, compactMobileGrid }: { header: ReactNode; footer: ReactNode; children: ReactNode; storefrontAvailable: boolean; maintenanceMode: boolean; setupIncomplete?: boolean; viewerIsAdmin?: boolean; storeName: string; brandStyle: CSSProperties; compactMobileGrid: boolean }) {
  const pathname = usePathname();
  // Login/register/forgot-password and checkout are bare, single-purpose screens rather
  // than storefront browsing pages, so they render standalone (same as /admin and
  // /invoices) with their own minimal top bar instead of the full store header/footer.
  // /cart stays a normal storefront page — only checkout itself gets this treatment.
  const isBareStandalonePage = pathname === "/login" || pathname === "/register" || pathname === "/forgot-password" || pathname === "/checkout";
  const isStandalone = pathname.startsWith("/admin") || pathname.startsWith("/invoices/") || isBareStandalonePage;
  const isAuthPath = pathname.startsWith("/login") || pathname.startsWith("/register") || pathname.startsWith("/account");
  // The account area is a self-contained, app-like section with its own sidebar; the marketing
  // footer under it just adds noise, so it renders header + content only.
  const hideFooter = pathname.startsWith("/account");
  if (!storefrontAvailable && !isStandalone && !isAuthPath) {
    const icon = setupIncomplete ? <Rocket size={25} /> : maintenanceMode ? <Settings2 size={25} /> : <Store size={25} />;
    const title = setupIncomplete ? "فروشگاه هنوز راه‌اندازی نشده است" : maintenanceMode ? "فروشگاه در حال بروزرسانی است" : "فروشگاه موقتاً غیرفعال است";
    const body = setupIncomplete
      ? (viewerIsAdmin
        ? "برای نمایش سایت ابتدا باید راه‌اندازی گام‌به‌گام فروشگاه را در پنل مدیریت کامل کنید."
        : `${storeName} به‌زودی راه‌اندازی می‌شود. از همراهی شما سپاسگزاریم.`)
      : `${storeName} به‌زودی دوباره در دسترس خواهد بود. از همراهی شما سپاسگزاریم.`;
    return <main className="grid min-h-dvh place-items-center bg-[var(--background)] p-5 text-right"><Card variant="secondary" className="w-full max-w-lg rounded-2xl border border-[#e5dfd4] bg-white p-8 text-center shadow-sm"><span className="mx-auto mb-4 grid size-14 place-items-center rounded-full bg-[color-mix(in_srgb,var(--warning)_14%,transparent)] text-[var(--warning)]">{icon}</span><h1 className="m-0 text-xl font-bold text-[#17233b]">{title}</h1><p className="mb-0 mt-3 text-sm leading-7 text-slate-500">{body}</p>{setupIncomplete && viewerIsAdmin && <Link href="/admin" className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--brand-primary)] px-5 py-2.5 text-sm font-bold text-[var(--brand-primary-foreground)]">تکمیل راه‌اندازی فروشگاه</Link>}</Card></main>;
  }
  if (isStandalone) return children;
  return (
    <CompareProvider>
      <div className="storefront-shell" style={brandStyle} data-compact-mobile-grid={compactMobileGrid}>{header}{children}{hideFooter ? null : footer}</div>
      <CompareTray />
    </CompareProvider>
  );
}
