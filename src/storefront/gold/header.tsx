import Image from "next/image";
import Link from "next/link";
import {
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
import { normalizeNumericValue } from "@/lib/persian-numbers";
import { getGoldPriceForDisplay } from "@/modules/gold/gold-price.service";
import type { BrandSettings } from "@/modules/settings/brand-settings";
import { getCatalogSettings } from "@/modules/settings/catalog-settings";
import type { GeneralStoreSettingsInput } from "@/modules/settings/general-settings";
import type { HomepageMenuItem } from "@/modules/settings/homepage-settings";

export async function GoldHeader({ settings, brand, user, menuItems }: { settings: GeneralStoreSettingsInput; brand: BrandSettings; user: User | null; menuItems: HomepageMenuItem[] }) {
  const [gold, catalogSettings] = await Promise.all([
    settings.industry === "GOLD" ? getGoldPriceForDisplay() : Promise.resolve(null),
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
        <nav className="mr-10 flex h-full min-w-0 items-center gap-9 overflow-hidden text-sm" aria-label="منوی اصلی فروشگاه">
          {menuItems.map((item) => <Link key={item.id} href={item.href} className="flex h-full shrink-0 items-center border-b-2 border-transparent transition hover:border-[var(--success)] hover:text-[var(--success)]">{item.label}</Link>)}
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
