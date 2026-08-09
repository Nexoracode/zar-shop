import Image from "next/image";
import Link from "next/link";
import {
  ChevronLeft,
  Headphones,
  Home,
  LayoutDashboard,
  Menu,
  Search,
  ShoppingCart,
  UserRound,
  WalletCards,
} from "lucide-react";
import type { User } from "@generated/prisma/client";
import { StorefrontGoldPrice } from "@/components/storefront-gold-price";
import { db } from "@/lib/db";
import { normalizeNumericValue } from "@/lib/persian-numbers";
import { getGoldPriceForDisplay } from "@/modules/gold/gold-price.service";
import type { BrandSettings } from "@/modules/settings/brand-settings";
import { getCatalogSettings } from "@/modules/settings/catalog-settings";
import type { GeneralStoreSettingsInput } from "@/modules/settings/general-settings";

export async function GoldHeader({ settings, brand, user, menuCategoryIds }: { settings: GeneralStoreSettingsInput; brand: BrandSettings; user: User | null; menuCategoryIds: string[] }) {
  const [gold, categories, catalogSettings] = await Promise.all([
    settings.industry === "GOLD" ? getGoldPriceForDisplay() : Promise.resolve(null),
    db.category.findMany({
      where: { id: { in: menuCategoryIds }, isActive: true, parentId: null },
      include: {
        children: {
          where: { isActive: true },
          include: { children: { where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] } },
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        },
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    getCatalogSettings(),
  ]);
  const accountHref = user ? (user.isGuest ? "/cart" : "/account") : "/login";
  const goldPrice = settings.industry === "GOLD" ? <StorefrontGoldPrice initialPrice={gold ? Number(gold.pricePerGram18) : null} currency={settings.currency} live={brand.liveGoldPrice} refreshSeconds={catalogSettings.goldPriceRefreshSeconds} showLabel={false} /> : null;

  const logo = brand.mainLogoMedia ? (
    <span className="relative block h-10 w-24 sm:w-28"><Image src={brand.mainLogoMedia.url} alt={brand.mainLogoMedia.alt ?? settings.storeName} fill sizes="112px" className="object-contain" /></span>
  ) : (
    <span className="flex items-center gap-2.5 leading-none">
      <span className="grid size-9 rotate-45 place-items-center border border-[var(--brand-primary)]"><span className="-rotate-45 text-xs font-black text-[var(--brand-primary)]">{settings.storeName.slice(0, 2)}</span></span>
      <strong className="text-sm font-black text-[var(--brand-primary)]">{settings.storeName}</strong>
    </span>
  );

  return <>
    <header className={`relative z-50 bg-white [--success:var(--brand-primary)] shadow-[0_2px_10px_rgba(0,0,0,.04)] ${brand.stickyStoreHeader ? "sticky top-0" : ""}`}>
      <div className="hidden h-10 bg-[#fdf9f2] lg:block">
        <div className="flex h-full w-full items-center justify-between px-10 text-[0.68rem] text-[#4d4b47]">
          <strong className="font-normal">قیمت لحظه‌ای طلای ۱۸ عیار: <span className="font-bold text-[var(--brand-primary)]">{goldPrice}</span></strong>
          <nav className="flex items-center gap-7" aria-label="دسترسی‌های اطلاعاتی">
            <Link href="/#trust">مشتریان ما</Link><Link href="/pages/about">درباره ما</Link><Link href="/pages/contact">تماس با ما</Link>
          </nav>
        </div>
      </div>

      <div className="relative flex h-[54px] items-center justify-center px-4 lg:hidden">
        <Link href="/products" className="absolute right-4" aria-label="منوی محصولات"><Menu size={23} /></Link>
        <Link href="/" aria-label={`${settings.storeName}، صفحه اصلی`}>{logo}</Link>
        <Link href="/products" className="absolute left-4" aria-label="جستجوی محصولات"><Search size={22} strokeWidth={1.5} /></Link>
      </div>

      <div className="hidden h-14 w-full items-center px-10 lg:flex">
        <div className="flex items-center">
          <Link href="/" aria-label={`${settings.storeName}، صفحه اصلی`}>{logo}</Link><span className="mx-8 h-7 w-px bg-[#ddd]" /><Link href="/products" className="inline-flex items-center gap-2 text-sm"><WalletCards size={20} /> فروشگاه زر گالری</Link>
        </div>
        <nav className="mr-10 flex h-full items-center gap-9 text-sm" aria-label="دسته‌بندی محصولات">
          {categories.map((category) => {
            const columns = category.children.length ? category.children : [category];
            return <div key={category.id} className="group flex h-full items-center">
              <Link href={`/products?category=${category.slug}`} className="flex h-full items-center border-b-2 border-transparent transition group-hover:border-[var(--success)] group-hover:text-[var(--success)]">{category.name}</Link>
              <div className="invisible pointer-events-none absolute inset-x-0 top-full z-50 min-h-[350px] translate-y-1 border-t border-[#e7e7e7] bg-white opacity-0 shadow-[0_16px_32px_rgba(0,0,0,.08)] transition duration-200 group-hover:visible group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:pointer-events-auto group-focus-within:translate-y-0 group-focus-within:opacity-100" dir="rtl">
                <div className="grid w-full grid-cols-5 gap-x-12 gap-y-10 px-10 py-7">
                  {columns.map((column) => <div key={column.id} className="min-w-0">
                    <Link href={`/products?category=${column.slug}`} className="mb-4 flex items-center gap-2 text-[0.78rem] font-black text-[#222] transition hover:text-[var(--success)]"><span className="h-4 w-1 rounded-full bg-[var(--success)]" />{column.name}<ChevronLeft className="mr-auto" size={14} /></Link>
                    <div className="grid gap-3 pr-3 text-xs text-[#414141]">
                      {column.children.length ? column.children.map((child) => <Link key={child.id} href={`/products?category=${child.slug}`} className="transition hover:text-[var(--success)]">{child.name}</Link>) : <Link href={`/products?category=${column.slug}`} className="transition hover:text-[var(--success)]">مشاهده همه محصولات</Link>}
                    </div>
                  </div>)}
                </div>
              </div>
            </div>;
          })}
          <Link href="/products" className="font-bold transition hover:text-[var(--success)]">کم‌اجرت</Link>
        </nav>
        <div className="mr-auto flex items-center gap-5 text-[#555]"><Link href="/products" aria-label="جستجوی محصولات"><Search size={22} strokeWidth={1.5} /></Link><span className="h-7 w-px bg-[#ddd]" /><Link href={accountHref} aria-label="حساب کاربری"><UserRound size={22} strokeWidth={1.5} /></Link><Link href="/cart" aria-label="سبد خرید"><ShoppingCart size={22} strokeWidth={1.5} /></Link>{user?.role !== "CUSTOMER" && user && <Link href="/admin" aria-label="پنل مدیریت"><LayoutDashboard size={20} /></Link>}</div>
      </div>

      <div className="flex h-8 items-center justify-between bg-[#fdf9f2] px-4 text-[0.64rem] lg:hidden">
        <span>قیمت لحظه‌ای طلای ۱۸ عیار:</span><strong className="text-[var(--brand-primary)]">{goldPrice}</strong>
      </div>
    </header>

    <nav className="fixed inset-x-0 bottom-0 z-50 grid h-[66px] grid-cols-4 border-t border-[#eee9e2] bg-white/95 text-[#6f706f] shadow-[0_-5px_20px_rgba(0,0,0,.05)] backdrop-blur lg:hidden" aria-label="ناوبری موبایل">
      <Link href="/" className="grid place-items-center content-center gap-1 text-[var(--brand-primary)]"><span className="grid size-10 place-items-center rounded-lg bg-[var(--brand-primary)]/8"><Home size={21} /></span><small className="sr-only">خانه</small></Link>
      <Link href="/cart" className="grid place-items-center content-center gap-1"><ShoppingCart size={21} /><small className="sr-only">سبد خرید</small></Link>
      {settings.supportPhone ? <a href={`tel:${normalizeNumericValue(settings.supportPhone, false)}`} className="grid place-items-center content-center gap-1"><Headphones size={21} /><small className="sr-only">پشتیبانی</small></a> : <Link href="/pages/contact" className="grid place-items-center content-center gap-1"><Headphones size={21} /><small className="sr-only">پشتیبانی</small></Link>}
      <Link href={accountHref} className="grid place-items-center content-center gap-1"><UserRound size={21} /><small className="sr-only">حساب کاربری</small></Link>
    </nav>
  </>;
}
