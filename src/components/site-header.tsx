import Link from "next/link";
import { Headphones, LayoutDashboard, Search, ShoppingBag, UserRound } from "lucide-react";
import { formatMoney } from "@/lib/format";
import { getCurrentUser } from "@/modules/auth/session";
import { getGoldPrice } from "@/modules/gold/gold-price.service";

export async function SiteHeader() {
  const [user, gold] = await Promise.all([getCurrentUser(), getGoldPrice().catch(() => null)]);

  return (
    <header className="site-header">
      <div className="announcement-bar">
        <div className="container announcement-inner">
          <span>ارسال امن و رایگان سفارش‌های ویژه</span>
          {gold && <strong>طلای ۱۸ عیار: {formatMoney(Number(gold.pricePerGram18))}</strong>}
        </div>
      </div>
      <div className="header-main">
        <div className="container header-inner">
          <div className="header-account">
            <Link href={user ? "/account" : "/login"} aria-label={user ? "حساب من" : "ورود و عضویت"}>
              <UserRound size={21} />
              <span>{user ? "حساب من" : "ورود / عضویت"}</span>
            </Link>
            <Link href="/cart" aria-label="سبد خرید"><ShoppingBag size={21} /></Link>
          </div>

          <Link href="/" className="brand" aria-label="زر گالری، صفحه اصلی">
            <span className="brand-emblem">زر</span>
            <span className="brand-copy"><strong>زر گالری</strong><small>ZAR GALLERY</small></span>
          </Link>

          <div className="header-tools">
            <Link href="/products" aria-label="جستجوی محصولات"><Search size={20} /><span>جستجو</span></Link>
            <a href="tel:+982100000000"><Headphones size={20} /><span>تماس با ما</span></a>
            {user?.role !== "CUSTOMER" && user && <Link href="/admin" aria-label="پنل مدیریت"><LayoutDashboard size={20} /></Link>}
          </div>
        </div>
      </div>
      <nav className="category-nav" aria-label="دسته‌بندی محصولات">
        <div className="container">
          <Link href="/products">زنانه</Link>
          <Link href="/products">مردانه</Link>
          <Link href="/products">انگشتر</Link>
          <Link href="/products">گردنبند</Link>
          <Link href="/products">دستبند</Link>
          <Link href="/products">گوشواره</Link>
          <Link href="/products">کالکشن‌ها</Link>
          <Link className="nav-special" href="/products">پیشنهاد ویژه</Link>
        </div>
      </nav>
    </header>
  );
}
