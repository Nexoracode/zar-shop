import Image from "next/image";
import Link from "next/link";
import { Instagram, Mail, MapPin, Phone } from "lucide-react";
import type { BrandSettings } from "@/modules/settings/brand-settings";
import { contentPageMeta, getContentSettings } from "@/modules/settings/content-settings";
import type { GeneralStoreSettingsInput } from "@/modules/settings/general-settings";

function phoneHref(phone: string) {
  const persian = "۰۱۲۳۴۵۶۷۸۹";
  const arabic = "٠١٢٣٤٥٦٧٨٩";
  const normalized = phone.replace(/[۰-۹]/g, (digit) => String(persian.indexOf(digit))).replace(/[٠-٩]/g, (digit) => String(arabic.indexOf(digit)));
  return `tel:${normalized.replace(/[^+\d]/g, "")}`;
}

export async function SiteFooter({ settings, brand }: { settings: GeneralStoreSettingsInput; brand: BrandSettings }) {
  const footerLogo = brand.darkLogoMedia ?? brand.mainLogoMedia;
  const content = await getContentSettings();
  const publishedPages = content.pages.filter((page) => page.published);
  const pageHref = (id: typeof publishedPages[number]["id"]) => `/pages/${contentPageMeta[id].slug}`;

  return <footer className="border-t border-[#e7e1da] bg-[#f7f4f2] pb-[66px] pt-12 text-[#4b4a47] lg:pb-0 lg:pt-[60px]">
    <div className="mx-auto grid w-[min(1184px,calc(100%-32px))] gap-10 sm:grid-cols-2 lg:w-[min(1184px,calc(100%-80px))] lg:grid-cols-[1.4fr_repeat(3,1fr)]">
      <div>
        {footerLogo ? <span className="relative mb-5 block h-12 w-32"><Image src={footerLogo.url} alt={footerLogo.alt ?? settings.storeName} fill sizes="128px" className="object-contain object-right" /></span> : <h3 className="mb-4 mt-0 text-xl font-black text-[var(--brand-primary)]">{settings.storeName}</h3>}
        <p className="max-w-[360px] text-xs leading-7 text-[#6b6965]">{settings.shortDescription}</p>
        <div className="mt-6 flex gap-3"><span className="grid size-9 place-items-center rounded-full border border-[#d7d0c7]"><Instagram size={17} /></span><span className="grid size-9 place-items-center rounded-full border border-[#d7d0c7]"><Mail size={17} /></span></div>
      </div>
      <div className="flex flex-col items-start gap-3 text-xs"><h4 className="mb-2 mt-0 text-sm font-black text-[#202020]">{settings.storeName}</h4>{publishedPages.filter((page) => page.id === "ABOUT" || page.id === "CONTACT").map((page) => <Link key={page.id} href={pageHref(page.id)}>{page.title}</Link>)}<Link href="/products">محصولات</Link><Link href="/#trust">مشتریان ما</Link></div>
      <div className="flex flex-col items-start gap-3 text-xs"><h4 className="mb-2 mt-0 text-sm font-black text-[#202020]">راهنما و قوانین</h4>{publishedPages.filter((page) => page.id !== "ABOUT" && page.id !== "CONTACT").map((page) => <Link key={page.id} href={pageHref(page.id)}>{page.title}</Link>)}<Link href="/account">پیگیری سفارش</Link><Link href="/#faq">سوالات متداول</Link></div>
      <div className="flex flex-col items-start gap-3 text-xs"><h4 className="mb-2 mt-0 text-sm font-black text-[#202020]">با ما در ارتباط باشید</h4>{settings.supportPhone && <a href={phoneHref(settings.supportPhone)} className="flex items-center gap-2"><Phone size={15} />{settings.supportPhone}</a>}{settings.supportEmail && <a href={`mailto:${settings.supportEmail}`} className="flex items-center gap-2" dir="ltr"><Mail size={15} />{settings.supportEmail}</a>}{settings.storeAddress && <span className="flex items-start gap-2"><MapPin className="mt-1 shrink-0" size={15} />{settings.storeAddress}</span>}{settings.supportHours && <span>{settings.supportHours}</span>}</div>
    </div>
    <div className="mx-auto mt-12 w-[min(1184px,calc(100%-32px))] border-t border-[#ddd5cc] py-5 text-center text-[0.68rem] text-[#777] lg:w-[min(1184px,calc(100%-80px))]">کلیه حقوق این وب‌سایت محفوظ و متعلق به {settings.storeName} است.</div>
  </footer>;
}
