import Image from "next/image";
import Link from "next/link";
import { Bell } from "lucide-react";
import type { User } from "@generated/prisma/client";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/format";
import type { BrandSettings } from "@/modules/settings/brand-settings";
import type { GeneralStoreSettingsInput } from "@/modules/settings/general-settings";
import type { HomepageMenuItem } from "@/modules/settings/homepage-settings";
import { GeneralHeaderMenuRow } from "@/storefront/general/header-menu-row";
import { StorefrontSearch } from "@/components/storefront-search";
import { StorefrontBottomNav } from "@/components/storefront-bottom-nav";
import { StorefrontCartLink } from "@/components/storefront-cart-link";
import { DeliveryAddressPicker } from "@/components/delivery-address-picker";
import { serializeAddress } from "@/modules/account/addresses";
import { StorefrontAccountMenu } from "@/components/storefront-account-menu";
import { StorefrontNotificationBell } from "@/components/storefront-notification-bell";
import { getCartProductCount } from "@/modules/cart/cart-summary";
import { getCategoryTree } from "@/modules/products/category-tree";
import { unreadCount } from "@/modules/notifications/service";
import { getWalletSettings } from "@/modules/settings/wallet-settings";
import { ensureWallet } from "@/modules/wallet/wallet";
import { builderSectionProps } from "@/modules/page-builder/sections";

type Props = { settings: GeneralStoreSettingsInput; brand: BrandSettings; user: User | null; menuItems: HomepageMenuItem[] };

export async function GeneralHeader({ settings, brand, user, menuItems }: Props) {
  const [categories, cartCount, addresses, notifUnread, walletSettings] = await Promise.all([
    getCategoryTree(),
    user ? getCartProductCount(user.id, settings.industry) : Promise.resolve(0),
    user ? db.address.findMany({ where: { userId: user.id, type: "SHIPPING" }, include: { provinceRef: true, cityRef: true }, orderBy: [{ isDefault: "desc" }, { lastUsedAt: "desc" }, { createdAt: "desc" }] }).then((items) => items.map(serializeAddress)) : Promise.resolve([]),
    user && !user.isGuest ? unreadCount(db, user.id, user.createdAt) : Promise.resolve(0),
    user && !user.isGuest ? getWalletSettings() : Promise.resolve(null),
  ]);
  const walletBalance = user && !user.isGuest && walletSettings?.walletEnabled
    ? formatMoney((await ensureWallet(db, user.id)).balance.toString(), settings.currency)
    : null;
  // A guest account is an implementation detail (created lazily on add-to-cart while signed
  // out, see api/cart/route.ts) — it should not change where the bottom nav's own account tab
  // points; only a real account has an "/account" to show.
  const accountHref = user && !user.isGuest ? "/account" : "/login";
  const ticketsHref = user && !user.isGuest ? "/account/tickets" : `/login?redirect=${encodeURIComponent("/account/tickets")}`;
  const logo = brand.mainLogoMedia
    ? <span className="relative block h-10 w-28"><Image src={brand.mainLogoMedia.url} alt={brand.mainLogoMedia.alt ?? settings.storeName} fill sizes="112px" className="object-contain" /></span>
    : <strong className="text-base font-bold text-[var(--brand-primary)]">{settings.storeName}</strong>;

  return <>
    <header {...builderSectionProps("HEADER")} className={`relative z-50 border-b border-[#e7e9ed] bg-white shadow-[0_2px_10px_rgba(0,0,0,.035)] ${brand.stickyStoreHeader ? "sticky top-0" : ""}`}>
      {/* Below lg: no logo/hamburger row — Digikala's own mobile home has none either (category
          browsing lives in the bottom nav's "دسته‌بندی" tab, see /categories), just a bell next
          to a full-width search field, then the delivery-address row. */}
      <div className="flex items-center gap-3 px-4 py-3 lg:hidden">
        {user && !user.isGuest
          ? <StorefrontNotificationBell initialUnread={notifUnread} />
          : <Link href="/login" aria-label="اعلان‌ها" className="grid size-10 shrink-0 place-items-center rounded-lg text-[#323741] transition hover:bg-slate-100"><Bell size={20} strokeWidth={1.7} /></Link>}
        <StorefrontSearch variant="field" className="flex-1" />
      </div>
      <div className="flex min-h-10 items-center border-t border-slate-100 px-4 lg:hidden"><DeliveryAddressPicker initialAddresses={addresses} authenticated={Boolean(user)} user={{ firstName: user?.firstName ?? null, lastName: user?.lastName ?? null, phone: user?.phone ?? null }} compact /></div>
      <div className="hidden h-[72px] grid-cols-[auto_minmax(320px,500px)_1fr] items-center gap-8 px-10 lg:grid">
        <Link href="/" aria-label={`${settings.storeName}، صفحه اصلی`}>{logo}</Link>
        <StorefrontSearch variant="field" />
        <div className="mr-auto flex items-center gap-1 text-[#323741]">
          {user && !user.isGuest
            ? <StorefrontNotificationBell initialUnread={notifUnread} />
            : <Link href="/login" aria-label="اعلان‌ها" className="grid size-10 place-items-center rounded-lg transition hover:bg-slate-100"><Bell size={20} strokeWidth={1.7} /></Link>}
          <StorefrontAccountMenu user={user ? { firstName: user.firstName, lastName: user.lastName, email: user.email, phone: user.phone, isGuest: user.isGuest } : null} walletBalance={walletBalance} />
          <span className="mx-2 h-6 w-px bg-slate-200" />
          <StorefrontCartLink initialCount={cartCount} className="grid size-10 place-items-center rounded-lg transition hover:bg-[var(--brand-primary)]/8" />
        </div>
      </div>
      <GeneralHeaderMenuRow categories={categories} menuItems={menuItems} deliveryPicker={<DeliveryAddressPicker initialAddresses={addresses} authenticated={Boolean(user)} user={{ firstName: user?.firstName ?? null, lastName: user?.lastName ?? null, phone: user?.phone ?? null }} compact />} />
    </header>
    <StorefrontBottomNav cartCount={cartCount} accountHref={accountHref} ticketsHref={ticketsHref} />
  </>;
}
