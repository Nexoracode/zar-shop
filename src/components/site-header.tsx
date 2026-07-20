import Link from "next/link";
import { getCurrentUser } from "@/modules/auth/session";

export async function SiteHeader() {
  const user = await getCurrentUser();
  return <header className="site-header"><div className="container header-inner">
    <Link href="/" className="brand"><span className="brand-mark">Z</span><span>زر گالری</span></Link>
    <nav className="nav"><Link href="/products">محصولات</Link><Link href="/#about">درباره ما</Link><Link href="/#guide">راهنمای خرید</Link></nav>
    <div className="actions">
      {user ? <>
        {user.role !== "CUSTOMER" && <Link href="/admin" className="btn hide-mobile">مدیریت</Link>}
        <Link href="/cart" className="btn hide-mobile">سبد خرید</Link><Link href="/account" className="btn btn-primary">حساب من</Link>
      </> : <><Link href="/login" className="btn hide-mobile">ورود</Link><Link href="/register" className="btn btn-primary">ساخت حساب</Link></>}
    </div>
  </div></header>;
}
