import Image from "next/image";
import Link from "next/link";
import { Bell, Headphones, Home, LayoutDashboard, Menu, Search, ShoppingCart, UserRound } from "lucide-react";
import type { User } from "@generated/prisma/client";
import { db } from "@/lib/db";
import { normalizeNumericValue } from "@/lib/persian-numbers";
import type { BrandSettings } from "@/modules/settings/brand-settings";
import type { GeneralStoreSettingsInput } from "@/modules/settings/general-settings";
import { GeneralHeaderMenuRow } from "@/storefront/general/header-menu-row";

type Props = { settings: GeneralStoreSettingsInput; brand: BrandSettings; user: User | null; menuCategoryIds: string[] };

export async function GeneralHeader({ settings, brand, user, menuCategoryIds }: Props) {
  const categories = await db.category.findMany({
    where: { id: { in: menuCategoryIds }, isActive: true, parentId: null },
    include: {
      image: { select: { url: true, alt: true, type: true } },
      children: {
        where: { isActive: true },
        include: { children: { where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] } },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      },
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  const accountHref = user ? (user.isGuest ? "/cart" : "/account") : "/login";
  const logo = brand.mainLogoMedia
    ? <span className="relative block h-10 w-28"><Image src={brand.mainLogoMedia.url} alt={brand.mainLogoMedia.alt ?? settings.storeName} fill sizes="112px" className="object-contain" /></span>
    : <strong className="text-base font-black text-[var(--brand-primary)]">{settings.storeName}</strong>;

  return <>
    <header className={`relative z-50 border-b border-[#e7e9ed] bg-white shadow-[0_2px_10px_rgba(0,0,0,.035)] ${brand.stickyStoreHeader ? "sticky top-0" : ""}`}>
      <div className="relative flex h-14 items-center justify-center px-4 lg:hidden">
        <Link href="/products" className="absolute right-4" aria-label="منوی محصولات"><Menu size={23} /></Link>
        <Link href="/" aria-label={`${settings.storeName}، صفحه اصلی`}>{logo}</Link>
        <Link href="/products" className="absolute left-4" aria-label="جستجوی محصولات"><Search size={22} /></Link>
      </div>
      <div className="hidden h-[72px] grid-cols-[auto_minmax(320px,500px)_1fr] items-center gap-8 px-10 lg:grid">
        <Link href="/" aria-label={`${settings.storeName}، صفحه اصلی`}>{logo}</Link>
        <Link href="/products" aria-label="جست‌وجوی محصولات" className="flex h-11 items-center gap-3 rounded-xl bg-slate-100 px-4 text-xs text-slate-400 transition hover:bg-slate-200/70 hover:text-slate-600">
          <Search className="mr-auto" size={19} />
          جست‌وجو در کالاها
        </Link>
        <div className="mr-auto flex items-center gap-1 text-[#323741]">
          <Link href={accountHref} aria-label="اعلان‌ها" className="grid size-10 place-items-center rounded-lg transition hover:bg-slate-100"><Bell size={20} strokeWidth={1.7} /></Link>
          <Link href={accountHref} aria-label="حساب کاربری" className="grid size-10 place-items-center rounded-lg transition hover:bg-slate-100"><UserRound size={21} strokeWidth={1.7} /></Link>
          <span className="mx-2 h-6 w-px bg-slate-200" />
          <Link href="/cart" aria-label="سبد خرید" className="grid size-10 place-items-center rounded-lg transition hover:bg-slate-100"><ShoppingCart size={21} strokeWidth={1.7} /></Link>
          {user?.role !== "CUSTOMER" && user && <Link href="/admin" aria-label="پنل مدیریت"><LayoutDashboard size={20} /></Link>}
        </div>
      </div>
      <GeneralHeaderMenuRow categories={categories} deliveryHref={accountHref} />
    </header>
    <nav className="fixed inset-x-0 bottom-0 z-50 grid h-[66px] grid-cols-4 border-t border-[#e7e9ed] bg-white/95 text-[#6f7480] shadow-[0_-5px_20px_rgba(0,0,0,.05)] backdrop-blur lg:hidden" aria-label="ناوبری موبایل">
      <Link href="/" className="grid place-items-center content-center text-[var(--brand-primary)]"><Home size={21} /><small className="sr-only">خانه</small></Link>
      <Link href="/cart" className="grid place-items-center content-center"><ShoppingCart size={21} /><small className="sr-only">سبد خرید</small></Link>
      {settings.supportPhone ? <a href={`tel:${normalizeNumericValue(settings.supportPhone, false)}`} className="grid place-items-center content-center"><Headphones size={21} /><small className="sr-only">پشتیبانی</small></a> : <Link href="/pages/contact" className="grid place-items-center content-center"><Headphones size={21} /><small className="sr-only">پشتیبانی</small></Link>}
      <Link href={accountHref} className="grid place-items-center content-center"><UserRound size={21} /><small className="sr-only">حساب کاربری</small></Link>
    </nav>
  </>;
}
