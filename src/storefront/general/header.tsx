import Image from "next/image";
import Link from "next/link";
import { Bell, Headphones, Home, LayoutDashboard, Menu, UserRound } from "lucide-react";
import type { User } from "@generated/prisma/client";
import { db } from "@/lib/db";
import { normalizeNumericValue } from "@/lib/persian-numbers";
import type { BrandSettings } from "@/modules/settings/brand-settings";
import type { GeneralStoreSettingsInput } from "@/modules/settings/general-settings";
import type { HomepageMenuItem } from "@/modules/settings/homepage-settings";
import { GeneralHeaderMenuRow } from "@/storefront/general/header-menu-row";
import { StorefrontSearch } from "@/components/storefront-search";
import { StorefrontCartLink } from "@/components/storefront-cart-link";
import { DeliveryAddressPicker } from "@/components/delivery-address-picker";
import { serializeAddress } from "@/modules/account/addresses";
import { StorefrontAccountMenu } from "@/components/storefront-account-menu";

type Props = { settings: GeneralStoreSettingsInput; brand: BrandSettings; user: User | null; menuItems: HomepageMenuItem[] };

export async function GeneralHeader({ settings, brand, user, menuItems }: Props) {
  const [categories, cartCount, addresses] = await Promise.all([
    db.category.findMany({
      where: { isActive: true, parentId: null },
      include: {
        image: { select: { url: true, alt: true, type: true } },
        children: {
          where: { isActive: true },
          include: { children: { where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] } },
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        },
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    user ? db.cartItem.aggregate({ where: { cart: { userId: user.id } }, _sum: { quantity: true } }).then((result) => result._sum.quantity ?? 0) : Promise.resolve(0),
    user ? db.address.findMany({ where: { userId: user.id, type: "SHIPPING" }, include: { provinceRef: true, cityRef: true }, orderBy: [{ isDefault: "desc" }, { lastUsedAt: "desc" }, { createdAt: "desc" }] }).then((items) => items.map(serializeAddress)) : Promise.resolve([]),
  ]);
  const accountHref = user ? (user.isGuest ? "/cart" : "/account") : "/login";
  const logo = brand.mainLogoMedia
    ? <span className="relative block h-10 w-28"><Image src={brand.mainLogoMedia.url} alt={brand.mainLogoMedia.alt ?? settings.storeName} fill sizes="112px" className="object-contain" /></span>
    : <strong className="text-base font-bold text-[var(--brand-primary)]">{settings.storeName}</strong>;

  return <>
    <header className={`relative z-50 border-b border-[#e7e9ed] bg-white shadow-[0_2px_10px_rgba(0,0,0,.035)] ${brand.stickyStoreHeader ? "sticky top-0" : ""}`}>
      <div className="relative flex h-14 items-center justify-center px-4 lg:hidden">
        <Link href="/products" className="absolute right-4" aria-label="منوی محصولات"><Menu size={23} /></Link>
        <Link href="/" aria-label={`${settings.storeName}، صفحه اصلی`}>{logo}</Link>
        <StorefrontSearch className="absolute left-4" />
      </div>
      <div className="flex min-h-10 items-center border-t border-slate-100 px-4 lg:hidden"><DeliveryAddressPicker initialAddresses={addresses} authenticated={Boolean(user)} user={{ firstName: user?.firstName ?? null, lastName: user?.lastName ?? null, phone: user?.phone ?? null }} compact /></div>
      <div className="hidden h-[72px] grid-cols-[auto_minmax(320px,500px)_1fr] items-center gap-8 px-10 lg:grid">
        <Link href="/" aria-label={`${settings.storeName}، صفحه اصلی`}>{logo}</Link>
        <StorefrontSearch variant="field" />
        <div className="mr-auto flex items-center gap-1 text-[#323741]">
          <Link href={accountHref} aria-label="اعلان‌ها" className="grid size-10 place-items-center rounded-lg transition hover:bg-slate-100"><Bell size={20} strokeWidth={1.7} /></Link>
          <StorefrontAccountMenu user={user ? { firstName: user.firstName, lastName: user.lastName, email: user.email, phone: user.phone, isGuest: user.isGuest } : null} />
          <span className="mx-2 h-6 w-px bg-slate-200" />
          <StorefrontCartLink initialCount={cartCount} className="grid size-10 place-items-center rounded-lg transition hover:bg-[var(--brand-primary)]/8" />
          {user?.role !== "CUSTOMER" && user && <Link href="/admin" aria-label="پنل مدیریت"><LayoutDashboard size={20} /></Link>}
        </div>
      </div>
      <GeneralHeaderMenuRow categories={categories} menuItems={menuItems} deliveryPicker={<DeliveryAddressPicker initialAddresses={addresses} authenticated={Boolean(user)} user={{ firstName: user?.firstName ?? null, lastName: user?.lastName ?? null, phone: user?.phone ?? null }} compact />} />
    </header>
    <nav className="fixed inset-x-0 bottom-0 z-50 grid h-[66px] grid-cols-4 border-t border-[#e7e9ed] bg-white/95 text-[#6f7480] shadow-[0_-5px_20px_rgba(0,0,0,.05)] backdrop-blur lg:hidden" aria-label="ناوبری موبایل">
      <Link href="/" className="grid place-items-center content-center text-[var(--brand-primary)]"><Home size={21} /><small className="sr-only">خانه</small></Link>
      <StorefrontCartLink initialCount={cartCount} mobile className="grid place-items-center content-center" />
      {settings.supportPhone ? <a href={`tel:${normalizeNumericValue(settings.supportPhone, false)}`} className="grid place-items-center content-center"><Headphones size={21} /><small className="sr-only">پشتیبانی</small></a> : <Link href="/pages/contact" className="grid place-items-center content-center"><Headphones size={21} /><small className="sr-only">پشتیبانی</small></Link>}
      <Link href={accountHref} className="grid place-items-center content-center"><UserRound size={21} /><small className="sr-only">حساب کاربری</small></Link>
    </nav>
  </>;
}
