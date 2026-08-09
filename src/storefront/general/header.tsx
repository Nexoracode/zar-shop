import Image from "next/image";
import Link from "next/link";
import { Headphones, Home, LayoutDashboard, Menu, Search, ShoppingCart, UserRound } from "lucide-react";
import type { User } from "@generated/prisma/client";
import { db } from "@/lib/db";
import { normalizeNumericValue } from "@/lib/persian-numbers";
import type { BrandSettings } from "@/modules/settings/brand-settings";
import type { GeneralStoreSettingsInput } from "@/modules/settings/general-settings";
import { GeneralCategoryMegaMenu } from "@/storefront/general/category-mega-menu";

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
      <div className="hidden h-9 items-center justify-between bg-[#f7f8fa] px-10 text-[0.7rem] text-[#666d79] lg:flex">
        <span>{settings.tagline}</span>
        <nav className="flex items-center gap-6" aria-label="دسترسی‌های اطلاعاتی"><Link href="/pages/about">درباره ما</Link><Link href="/pages/contact">تماس با ما</Link><Link href="/#faq">سوالات متداول</Link></nav>
      </div>
      <div className="relative flex h-14 items-center justify-center px-4 lg:hidden">
        <Link href="/products" className="absolute right-4" aria-label="منوی محصولات"><Menu size={23} /></Link>
        <Link href="/" aria-label={`${settings.storeName}، صفحه اصلی`}>{logo}</Link>
        <Link href="/products" className="absolute left-4" aria-label="جستجوی محصولات"><Search size={22} /></Link>
      </div>
      <div className="hidden h-16 items-center px-10 lg:flex">
        <Link href="/" aria-label={`${settings.storeName}، صفحه اصلی`}>{logo}</Link>
        <nav className="mr-12 flex h-full items-center gap-8 text-sm" aria-label="دسته‌بندی محصولات">
          <GeneralCategoryMegaMenu categories={categories} />
          {categories.map((category) => <Link key={category.id} href={`/products?category=${category.slug}`} className="flex h-full items-center border-b-2 border-transparent transition hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)]">{category.name}</Link>)}
        </nav>
        <div className="mr-auto flex items-center gap-5 text-[#555]">
          <Link href="/products" aria-label="جستجوی محصولات"><Search size={21} /></Link>
          <Link href={accountHref} aria-label="حساب کاربری"><UserRound size={21} /></Link>
          <Link href="/cart" aria-label="سبد خرید"><ShoppingCart size={21} /></Link>
          {user?.role !== "CUSTOMER" && user && <Link href="/admin" aria-label="پنل مدیریت"><LayoutDashboard size={20} /></Link>}
        </div>
      </div>
    </header>
    <nav className="fixed inset-x-0 bottom-0 z-50 grid h-[66px] grid-cols-4 border-t border-[#e7e9ed] bg-white/95 text-[#6f7480] shadow-[0_-5px_20px_rgba(0,0,0,.05)] backdrop-blur lg:hidden" aria-label="ناوبری موبایل">
      <Link href="/" className="grid place-items-center content-center text-[var(--brand-primary)]"><Home size={21} /><small className="sr-only">خانه</small></Link>
      <Link href="/cart" className="grid place-items-center content-center"><ShoppingCart size={21} /><small className="sr-only">سبد خرید</small></Link>
      {settings.supportPhone ? <a href={`tel:${normalizeNumericValue(settings.supportPhone, false)}`} className="grid place-items-center content-center"><Headphones size={21} /><small className="sr-only">پشتیبانی</small></a> : <Link href="/pages/contact" className="grid place-items-center content-center"><Headphones size={21} /><small className="sr-only">پشتیبانی</small></Link>}
      <Link href={accountHref} className="grid place-items-center content-center"><UserRound size={21} /><small className="sr-only">حساب کاربری</small></Link>
    </nav>
  </>;
}
