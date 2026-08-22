"use client";

import { usePathname } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";
import { Card } from "@heroui/react";
import { Settings2, Store } from "lucide-react";

export function AppChrome({ header, footer, children, storefrontAvailable, maintenanceMode, storeName, brandStyle, compactMobileGrid }: { header: ReactNode; footer: ReactNode; children: ReactNode; storefrontAvailable: boolean; maintenanceMode: boolean; storeName: string; brandStyle: CSSProperties; compactMobileGrid: boolean }) {
  const pathname = usePathname();
  const isStandalone = pathname.startsWith("/admin") || pathname.startsWith("/invoices/");
  const isAuthPath = pathname.startsWith("/login") || pathname.startsWith("/register") || pathname.startsWith("/account");
  if (!storefrontAvailable && !isStandalone && !isAuthPath) return <main className="grid min-h-dvh place-items-center bg-[var(--background)] p-5 text-right"><Card variant="secondary" className="w-full max-w-lg rounded-2xl border border-[#e5dfd4] bg-white p-8 text-center shadow-sm"><span className="mx-auto mb-4 grid size-14 place-items-center rounded-full bg-amber-50 text-amber-700">{maintenanceMode ? <Settings2 size={25} /> : <Store size={25} />}</span><h1 className="m-0 text-xl font-bold text-[#17233b]">{maintenanceMode ? "فروشگاه در حال بروزرسانی است" : "فروشگاه موقتاً غیرفعال است"}</h1><p className="mb-0 mt-3 text-sm leading-7 text-slate-500">{storeName} به‌زودی دوباره در دسترس خواهد بود. از همراهی شما سپاسگزاریم.</p></Card></main>;
  if (isStandalone) return children;
  return <div className="storefront-shell" style={brandStyle} data-compact-mobile-grid={compactMobileGrid}>{header}{children}{footer}</div>;
}
