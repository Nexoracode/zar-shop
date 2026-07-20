import type { Metadata } from "next";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = { title: { default: "زر گالری", template: "%s | زر گالری" }, description: "فروشگاه آنلاین طلا با قیمت لحظه‌ای" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="fa" dir="rtl"><body><SiteHeader />{children}<footer className="footer"><div className="container">© ۱۴۰۵ زر گالری — خرید شفاف، امن و اصیل</div></footer></body></html>;
}
