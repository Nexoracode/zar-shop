import Link from "next/link";
import { Headphones, LayoutDashboard, Search, ShoppingBag, UserRound } from "lucide-react";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/format";
import { getGoldPriceForDisplay } from "@/modules/gold/gold-price.service";
import type { User } from "@generated/prisma/client";
import type { GeneralStoreSettingsInput } from "@/modules/settings/general-settings";
import { normalizeNumericValue } from "@/lib/persian-numbers";

export async function SiteHeader({ settings, user }: { settings: GeneralStoreSettingsInput; user: User | null }) {
  const [gold, categories] = await Promise.all([
    getGoldPriceForDisplay(),
    db.category.findMany({
      where: { isActive: true, parentId: null },
      include: { children: { where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] } },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      take: 7,
    }),
  ]);

  return (
    <header className="relative z-50 bg-white shadow-[0_5px_24px_rgba(20,35,61,0.06)] lg:sticky lg:top-0">
      {/* Announcement bar */}
      <div className="flex min-h-9 items-center bg-[#1c3155] text-[0.72rem] text-white sm:min-h-10 sm:text-[0.8rem]">
        <div className="relative mx-auto flex w-full max-w-[1240px] items-center justify-center px-4 sm:px-6">
          <span className="hidden sm:inline">ارسال امن و رایگان سفارش‌های ویژه</span>
          <strong className="font-medium sm:absolute sm:left-6">
            {gold ? `طلای ۱۸ عیار: ${formatMoney(Number(gold.pricePerGram18), settings.currency)}` : "نرخ طلا موقتاً در دسترس نیست"}
          </strong>
        </div>
      </div>

      {/* Main header */}
      <div className="border-b border-[#e7e6e2]">
        <div className="mx-auto grid min-h-16 w-full max-w-[1240px] grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 sm:min-h-[72px] sm:gap-6 sm:px-6">
          {/* Account / Cart */}
          <div className="flex items-center gap-3 sm:gap-[22px]">
            <Link
              href={user ? (user.isGuest ? "/cart" : "/account") : "/login"}
              aria-label={user ? (user.isGuest ? "خرید مهمان" : "حساب من") : "ورود و عضویت"}
              className="inline-flex items-center gap-[7px] text-[#39445a] text-[0.82rem] transition-colors hover:text-[#785b27]"
            >
              <UserRound size={21} />
              <span className="hidden lg:inline">{user ? (user.isGuest ? "خرید مهمان" : "حساب من") : "ورود / عضویت"}</span>
            </Link>
            <Link href="/cart" aria-label="سبد خرید" className="text-[#39445a] transition-colors hover:text-[#785b27]">
              <ShoppingBag size={21} />
            </Link>
          </div>

          {/* Brand */}
          <Link href="/" className="flex items-center justify-center gap-3 leading-[1.15]" aria-label={`${settings.storeName}، صفحه اصلی`}>
            <span className="grid h-9 w-9 rotate-45 place-items-center border border-[#1c3155] sm:h-[43px] sm:w-[43px]">
              <span className="-rotate-45 text-[#1c3155] text-sm font-bold">{settings.storeName.slice(0, 2)}</span>
            </span>
            <span className="hidden gap-[2px] md:grid">
              <strong className="text-[1.15rem]">{settings.storeName}</strong>
              <small className="text-[#747982] text-[0.62rem]">{settings.tagline}</small>
            </span>
          </Link>

          {/* Tools */}
          <div className="flex items-center justify-end gap-3 sm:gap-[22px]">
            <Link
              href="/products"
              aria-label="جستجوی محصولات"
              className="inline-flex items-center gap-[7px] text-[#39445a] text-[0.82rem] transition-colors hover:text-[#785b27]"
            >
              <Search size={20} />
              <span className="hidden lg:inline">جستجو</span>
            </Link>
            {settings.supportPhone ? <a
              href={`tel:${normalizeNumericValue(settings.supportPhone, false)}`}
              className="hidden items-center gap-[7px] text-[#39445a] text-[0.82rem] transition-colors hover:text-[#785b27] sm:inline-flex"
            >
              <Headphones size={20} />
              <span className="hidden lg:inline">تماس با ما</span>
            </a> : null}
            {user?.role !== "CUSTOMER" && user && (
              <Link href="/admin" aria-label="پنل مدیریت" className="text-[#39445a] transition-colors hover:text-[#785b27]">
                <LayoutDashboard size={20} />
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Category nav */}
      <nav className="overflow-x-auto border-b border-[#e7e6e2] [scrollbar-width:none] lg:overflow-visible [&::-webkit-scrollbar]:hidden" aria-label="دسته‌بندی محصولات">
        <div className="mx-auto flex min-h-11 min-w-max items-center justify-start gap-7 px-4 sm:min-h-12 sm:px-6 lg:max-w-[1240px] lg:justify-center lg:gap-[clamp(22px,3vw,48px)]">
          {categories.map((category) => (
            <div key={category.id} className="group relative flex min-h-11 items-center sm:min-h-12">
              <Link href={`/products?category=${category.slug}`} className="text-[0.88rem] transition-colors hover:text-[#785b27]">
                {category.name}
              </Link>
              {category.children.length > 0 && (
                <div className="invisible absolute right-0 top-full z-50 hidden min-w-52 translate-y-2 border border-[#e7e6e2] bg-white p-2 opacity-0 shadow-[0_16px_40px_rgba(20,35,61,0.12)] transition-all group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100 lg:block">
                  {category.children.map((child) => (
                    <Link key={child.id} href={`/products?category=${child.slug}`} className="block px-3 py-2 text-sm text-[#4b5160] transition-colors hover:bg-[#f8f5ef] hover:text-[#785b27]">
                      {child.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
          <Link href="/products" className="text-[0.88rem] text-[#785b27] transition-colors before:content-['✦'] before:ml-[5px] before:text-[#b5904c]">
            پیشنهاد ویژه
          </Link>
        </div>
      </nav>
    </header>
  );
}
