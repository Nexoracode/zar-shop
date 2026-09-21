import Image from "next/image";
import Link from "next/link";
import {
  Bell,
  WalletCards,
} from "lucide-react";
import type { User } from "@generated/prisma/client";
import { StorefrontGoldPrice } from "@/components/storefront-gold-price";
import { formatMoney } from "@/lib/format";
import { getGoldPriceForDisplay } from "@/modules/gold/gold-price.service";
import type { BrandSettings } from "@/modules/settings/brand-settings";
import { getCatalogSettings } from "@/modules/settings/catalog-settings";
import type { GeneralStoreSettingsInput } from "@/modules/settings/general-settings";
import type { HomepageMenuItem } from "@/modules/settings/homepage-settings";
import { StorefrontSearch } from "@/components/storefront-search";
import { StorefrontBottomNav } from "@/components/storefront-bottom-nav";
import { StorefrontCartLink } from "@/components/storefront-cart-link";
import { db } from "@/lib/db";
import { DeliveryAddressPicker } from "@/components/delivery-address-picker";
import { serializeAddress } from "@/modules/account/addresses";
import { StorefrontAccountMenu } from "@/components/storefront-account-menu";
import { StorefrontNotificationBell } from "@/components/storefront-notification-bell";
import { getCartProductCount } from "@/modules/cart/cart-summary";
import { unreadCount } from "@/modules/notifications/service";
import { getWalletSettings } from "@/modules/settings/wallet-settings";
import { ensureWallet } from "@/modules/wallet/wallet";
import { builderSectionProps } from "@/modules/page-builder/sections";
import { BuilderPart } from "@/components/builder-part";
import { hasPermission } from "@/modules/auth/permissions";
import { isPartHidden, isSectionEnabled, type PageDisplay } from "@/modules/page-builder/display-parts";

export async function GoldHeader({ settings, brand, user, menuItems, display }: { settings: GeneralStoreSettingsInput; brand: BrandSettings; user: User | null; menuItems: HomepageMenuItem[]; display: PageDisplay }) {
  const [gold, catalogSettings, cartCount, addresses, notifUnread, walletSettings] = await Promise.all([
    settings.industry === "GOLD" ? getGoldPriceForDisplay() : Promise.resolve(null),
    getCatalogSettings(),
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
  const goldPrice = settings.industry === "GOLD" ? <StorefrontGoldPrice initialPrice={gold ? Number(gold.pricePerGram18) : null} currency={settings.currency} live={brand.liveGoldPrice} refreshSeconds={catalogSettings.goldPriceRefreshSeconds} showLabel={false} /> : null;

  const logo = brand.mainLogoMedia ? (
    <span className="relative block h-10 w-24 sm:w-28"><Image src={brand.mainLogoMedia.url} alt={brand.mainLogoMedia.alt ?? settings.storeName} fill sizes="112px" className="object-contain" /></span>
  ) : (
    <span className="flex items-center gap-2.5 leading-none">
      <span className="grid size-9 rotate-45 place-items-center border border-[var(--brand-primary)]"><span className="-rotate-45 text-xs font-bold text-[var(--brand-primary)]">{settings.storeName.slice(0, 2)}</span></span>
      <strong className="text-sm font-bold text-[var(--brand-primary)]">{settings.storeName}</strong>
    </span>
  );

  // Viewers who can edit the page get every part rendered (the page builder hides/shows them live); everyone else only the enabled ones.
  const editable = Boolean(user && hasPermission(user.role, "settings:manage"));
  const part = (id: string) => ({ section: "HEADER", id, hidden: isPartHidden(display, "HEADER", id), editable });
  const deliveryPicker = <DeliveryAddressPicker initialAddresses={addresses} authenticated={Boolean(user)} user={{ firstName: user?.firstName ?? null, lastName: user?.lastName ?? null, phone: user?.phone ?? null }} compact />;
  const bellButton = user && !user.isGuest
    ? <StorefrontNotificationBell initialUnread={notifUnread} />
    : <Link href="/login" aria-label="اعلان‌ها" className="grid size-10 shrink-0 place-items-center rounded-lg text-[#4d4b47] transition hover:bg-slate-100"><Bell size={20} strokeWidth={1.7} /></Link>;

  return <>
    {(isSectionEnabled(display, "HEADER") || editable) && <header {...builderSectionProps("HEADER")} className={`relative z-50 bg-white [--success:var(--brand-primary)] shadow-[0_2px_10px_rgba(0,0,0,.04)] ${brand.stickyStoreHeader ? "sticky top-0" : ""}`}>
      <div className="hidden h-10 bg-[#fdf9f2] lg:block">
        <div className="flex h-full w-full items-center justify-between px-10 text-[0.68rem] text-[#4d4b47]">
          <BuilderPart {...part("goldPrice")}><strong className="font-normal">قیمت لحظه‌ای طلای ۱۸ عیار: <span className="font-bold text-[var(--brand-primary)]">{goldPrice}</span></strong></BuilderPart>
          <BuilderPart {...part("delivery")}>{deliveryPicker}</BuilderPart>
          <BuilderPart {...part("infoLinks")}><nav className="flex items-center gap-7" aria-label="دسترسی‌های اطلاعاتی">
            <Link href="/blog">وبلاگ</Link><Link href="/#trust">مشتریان ما</Link><Link href="/pages/about">درباره ما</Link><Link href="/pages/contact">تماس با ما</Link>
          </nav></BuilderPart>
        </div>
      </div>

      {/* Below lg: no logo/hamburger row — Digikala's own mobile home has none either (category
          browsing lives in the bottom nav's "دسته‌بندی" tab, see /categories), just a bell next
          to a full-width search field. */}
      <div className="flex items-center gap-3 px-4 py-3 lg:hidden">
        <BuilderPart {...part("notifications")}>{bellButton}</BuilderPart>
        <BuilderPart {...part("search")}><StorefrontSearch variant="field" className="flex-1" /></BuilderPart>
      </div>

      <div className="hidden h-14 w-full items-center px-10 lg:flex">
        <div className="flex items-center">
          <BuilderPart {...part("logo")}><Link href="/" aria-label={`${settings.storeName}، صفحه اصلی`}>{logo}</Link></BuilderPart>
          <BuilderPart {...part("storeLink")}><span className="mx-8 h-7 w-px bg-[#ddd]" /><Link href="/products" className="inline-flex items-center gap-2 text-sm"><WalletCards size={20} /> فروشگاه زر گالری</Link></BuilderPart>
        </div>
        <BuilderPart {...part("menu")}><nav className="mr-10 flex h-full min-w-0 items-center gap-9 overflow-hidden text-sm" aria-label="منوی اصلی فروشگاه">
          {menuItems.map((item) => <Link key={item.id} href={item.href} className="flex h-full shrink-0 items-center border-b-2 border-transparent transition hover:border-[var(--success)] hover:text-[var(--success)]">{item.label}</Link>)}
        </nav></BuilderPart>
        <div className="mr-auto flex items-center gap-5 text-[#555]">
          <BuilderPart {...part("search")}><StorefrontSearch /></BuilderPart>
          <span className="h-7 w-px bg-[#ddd]" />
          {user && !user.isGuest && <BuilderPart {...part("notifications")}><StorefrontNotificationBell initialUnread={notifUnread} /></BuilderPart>}
          <BuilderPart {...part("account")}><StorefrontAccountMenu user={user ? { firstName: user.firstName, lastName: user.lastName, email: user.email, phone: user.phone, isGuest: user.isGuest } : null} walletBalance={walletBalance} /></BuilderPart>
          <BuilderPart {...part("cart")}><StorefrontCartLink initialCount={cartCount} iconSize={22} /></BuilderPart>
        </div>
      </div>

      <BuilderPart {...part("goldPrice")}><div className="flex h-8 items-center justify-between bg-[#fdf9f2] px-4 text-[0.64rem] lg:hidden">
        <span>قیمت لحظه‌ای طلای ۱۸ عیار:</span><strong className="text-[var(--brand-primary)]">{goldPrice}</strong>
      </div></BuilderPart>
      <BuilderPart {...part("delivery")}><div className="flex min-h-10 items-center border-t border-[#eee9e2] px-4 lg:hidden">{deliveryPicker}</div></BuilderPart>
    </header>}

    <StorefrontBottomNav cartCount={cartCount} accountHref={accountHref} ticketsHref={ticketsHref} />
  </>;
}
