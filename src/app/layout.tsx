import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "زر گالری", template: "%s | زر گالری" },
  description: "فروشگاه آنلاین طلا با قیمت لحظه‌ای",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fa" dir="rtl">
      <body>
        <SiteHeader />
        {children}
        <footer className="footer">
          <div className="container footer-grid">
            <div className="footer-about"><span className="brand-emblem footer-emblem">زر</span><h3>زر گالری</h3><p>تجربه‌ای شفاف و امن برای انتخاب طلای ماندگار؛ همراه با قیمت روز، تضمین اصالت و فاکتور رسمی.</p></div>
            <div><h4>زر گالری</h4><Link href="/#about">درباره ما</Link><Link href="/products">محصولات</Link><Link href="/#guide">خدمات فروشگاه</Link></div>
            <div><h4>راهنمای خرید</h4><Link href="/account">پیگیری سفارش</Link><Link href="/cart">سبد خرید</Link><Link href="/login">حساب کاربری</Link></div>
            <div><h4>تماس با ما</h4><a href="tel:+982100000000">۰۲۱-۰۰۰۰۰۰۰۰</a><a href="mailto:info@zargallery.ir">info@zargallery.ir</a><span>شنبه تا پنجشنبه، ۹ تا ۱۸</span></div>
          </div>
          <div className="container footer-bottom">© ۱۴۰۵ زر گالری — تمامی حقوق محفوظ است.</div>
        </footer>
      </body>
    </html>
  );
}
