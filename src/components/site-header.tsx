import Link from "next/link";
import { Headphones, LayoutDashboard, Search, ShoppingBag, UserRound } from "lucide-react";
import { formatMoney } from "@/lib/format";
import { getCurrentUser } from "@/modules/auth/session";
import { getGoldPrice } from "@/modules/gold/gold-price.service";

export async function SiteHeader() {
  const [user, gold] = await Promise.all([getCurrentUser(), getGoldPrice().catch(() => null)]);

  return (
    <header className="sticky top-0 z-50 bg-white/97 shadow-[0_5px_24px_rgba(20,35,61,0.06)]">
      {/* Announcement bar */}
      <div className="min-h-[42px] flex items-center text-white bg-[#1c3155] text-[0.82rem]">
        <div className="w-[min(1240px,calc(100%-40px))] mx-auto flex justify-center items-center gap-14 relative">
          <span className="max-[760px]:hidden">ارسال امن و رایگان سفارش‌های ویژه</span>
          {gold && (
            <strong className="absolute left-0 text-[0.78rem] font-medium max-[760px]:static max-[760px]:mx-auto">
              طلای ۱۸ عیار: {formatMoney(Number(gold.pricePerGram18))}
            </strong>
          )}
        </div>
      </div>

      {/* Main header */}
      <div className="border-b border-[#e7e6e2]">
        <div className="w-[min(1240px,calc(100%-40px))] mx-auto min-h-[72px] grid grid-cols-[1fr_auto_1fr] items-center gap-6 max-[760px]:min-h-[66px]">
          {/* Account / Cart */}
          <div className="flex items-center gap-[22px] max-[760px]:gap-[13px]">
            <Link
              href={user ? "/account" : "/login"}
              aria-label={user ? "حساب من" : "ورود و عضویت"}
              className="inline-flex items-center gap-[7px] text-[#39445a] text-[0.82rem] transition-colors hover:text-[#785b27]"
            >
              <UserRound size={21} />
              <span className="max-[1000px]:hidden">{user ? "حساب من" : "ورود / عضویت"}</span>
            </Link>
            <Link href="/cart" aria-label="سبد خرید" className="text-[#39445a] transition-colors hover:text-[#785b27]">
              <ShoppingBag size={21} />
            </Link>
          </div>

          {/* Brand */}
          <Link href="/" className="flex items-center justify-center gap-[10px] leading-[1.15]" aria-label="زر گالری، صفحه اصلی">
            <span className="w-[43px] h-[43px] grid place-items-center border border-[#1c3155] rotate-45 text-xl">
              <span className="-rotate-45 text-[#1c3155] text-sm font-bold">زر</span>
            </span>
            <span className="grid gap-[2px] max-[760px]:hidden">
              <strong className="text-[1.15rem]">زر گالری</strong>
              <small className="text-[#747982] font-[Georgia,serif] text-[0.62rem] tracking-[0.19em] ltr">ZAR GALLERY</small>
            </span>
          </Link>

          {/* Tools */}
          <div className="flex items-center justify-end gap-[22px] max-[760px]:gap-[13px]">
            <Link
              href="/products"
              aria-label="جستجوی محصولات"
              className="inline-flex items-center gap-[7px] text-[#39445a] text-[0.82rem] transition-colors hover:text-[#785b27]"
            >
              <Search size={20} />
              <span className="max-[1000px]:hidden">جستجو</span>
            </Link>
            <a
              href="tel:+982100000000"
              className="inline-flex items-center gap-[7px] text-[#39445a] text-[0.82rem] transition-colors hover:text-[#785b27]"
            >
              <Headphones size={20} />
              <span className="max-[1000px]:hidden">تماس با ما</span>
            </a>
            {user?.role !== "CUSTOMER" && user && (
              <Link href="/admin" aria-label="پنل مدیریت" className="text-[#39445a] transition-colors hover:text-[#785b27]">
                <LayoutDashboard size={20} />
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Category nav */}
      <nav className="border-b border-[#e7e6e2]" aria-label="دسته‌بندی محصولات">
        <div className="w-[min(1240px,calc(100%-40px))] mx-auto min-h-12 flex justify-center items-center gap-[clamp(22px,3vw,48px)] whitespace-nowrap max-[1000px]:overflow-x-auto max-[1000px]:justify-start max-[1000px]:w-max max-[1000px]:min-w-full max-[1000px]:px-5">
          {["زنانه", "مردانه", "انگشتر", "گردنبند", "دستبند", "گوشواره", "کالکشن‌ها"].map((item) => (
            <Link key={item} href="/products" className="text-[0.88rem] transition-colors hover:text-[#785b27]">
              {item}
            </Link>
          ))}
          <Link href="/products" className="text-[0.88rem] text-[#785b27] transition-colors before:content-['✦'] before:ml-[5px] before:text-[#b5904c]">
            پیشنهاد ویژه
          </Link>
        </div>
      </nav>
    </header>
  );
}
