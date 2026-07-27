import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { AppChrome } from "@/components/app-chrome";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const baseUrl = new URL(`${protocol}://${host}`);
  const description = "زر گالری؛ زیورآلات طلای ۱۸ عیار با قیمت لحظه‌ای، تضمین اصالت و فاکتور رسمی.";
  return {
    metadataBase: baseUrl,
    title: { default: "زر گالری", template: "%s | زر گالری" },
    description,
    openGraph: { title: "زر گالری | طلا، روایت ماندگار شما", description, type: "website", locale: "fa_IR", images: [{ url: new URL("/og.png", baseUrl), width: 1792, height: 1024, alt: "زر گالری؛ طلا، روایت ماندگار شما" }] },
    twitter: { card: "summary_large_image", title: "زر گالری | طلا، روایت ماندگار شما", description, images: [new URL("/og.png", baseUrl)] },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fa" dir="rtl" data-theme="zar" data-scroll-behavior="smooth">
      <body>
        <AppChrome
          header={<SiteHeader />}
          footer={<footer className="bg-[#101d33] pt-14 text-white/75 sm:pt-16">
          <div className="mx-auto grid w-full max-w-[1240px] grid-cols-1 gap-10 px-5 sm:grid-cols-2 sm:px-6 lg:grid-cols-[1.5fr_repeat(3,1fr)] lg:gap-[54px]">
            {/* Brand */}
            <div>
              <span className="inline-grid place-items-center w-11 h-11 border border-[#d8bd83] text-[#d8bd83] rotate-45 text-xl mb-5">
                <span className="-rotate-45 text-sm font-bold">زر</span>
              </span>
              <h3 className="text-white mt-0 mb-3 text-base">زر گالری</h3>
              <p className="text-[0.82rem] max-w-[350px]">
                تجربه‌ای شفاف و امن برای انتخاب طلای ماندگار؛ همراه با قیمت روز، تضمین اصالت و فاکتور رسمی.
              </p>
            </div>

            <div className="flex flex-col items-start gap-2 text-[0.8rem]">
              <h4 className="text-white mt-0 mb-3 text-sm">زر گالری</h4>
              <Link href="/#about" className="hover:text-white transition-colors">درباره ما</Link>
              <Link href="/products" className="hover:text-white transition-colors">محصولات</Link>
              <Link href="/#guide" className="hover:text-white transition-colors">خدمات فروشگاه</Link>
            </div>

            <div className="flex flex-col items-start gap-2 text-[0.8rem]">
              <h4 className="text-white mt-0 mb-3 text-sm">راهنمای خرید</h4>
              <Link href="/account" className="hover:text-white transition-colors">پیگیری سفارش</Link>
              <Link href="/cart" className="hover:text-white transition-colors">سبد خرید</Link>
              <Link href="/login" className="hover:text-white transition-colors">حساب کاربری</Link>
            </div>

            <div className="flex flex-col items-start gap-2 text-[0.8rem]">
              <h4 className="text-white mt-0 mb-3 text-sm">تماس با ما</h4>
              <a href="tel:+982100000000" className="hover:text-white transition-colors">۰۲۱-۰۰۰۰۰۰۰۰</a>
              <a href="mailto:info@zargallery.ir" className="hover:text-white transition-colors">info@zargallery.ir</a>
              <span>شنبه تا پنجشنبه، ۹ تا ۱۸</span>
            </div>
          </div>

          <div className="mx-auto mt-12 w-[calc(100%-40px)] max-w-[1240px] border-t border-white/10 py-4 text-center text-[0.72rem]">
            © ۱۴۰۵ زر گالری — تمامی حقوق محفوظ است.
          </div>
          </footer>}
        >
          {children}
        </AppChrome>
      </body>
    </html>
  );
}
