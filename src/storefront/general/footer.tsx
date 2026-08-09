import Image from "next/image";
import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import type { BrandSettings } from "@/modules/settings/brand-settings";
import { contentPageMeta, getContentSettings } from "@/modules/settings/content-settings";
import type { GeneralStoreSettingsInput } from "@/modules/settings/general-settings";

function phoneHref(phone: string) {
  const persian = "۰۱۲۳۴۵۶۷۸۹";
  const normalized = phone.replace(/[۰-۹]/g, (digit) => String(persian.indexOf(digit)));
  return `tel:${normalized.replace(/[^+\d]/g, "")}`;
}

export async function GeneralFooter({ settings, brand }: { settings: GeneralStoreSettingsInput; brand: BrandSettings }) {
  const content = await getContentSettings();
  const pages = content.pages.filter((page) => page.published);
  const logo = brand.darkLogoMedia ?? brand.mainLogoMedia;
  return <footer className="border-t border-[#e4e7ec] bg-[#20242c] pb-[66px] pt-12 text-[#d9dce2] lg:pb-0">
    <div className="mx-auto grid w-[min(1440px,calc(100%-32px))] gap-10 sm:grid-cols-2 lg:w-[min(1440px,calc(100%-80px))] lg:grid-cols-[1.4fr_1fr_1fr]">
      <div>{logo ? <span className="relative mb-5 block h-12 w-32"><Image src={logo.url} alt={logo.alt ?? settings.storeName} fill sizes="128px" className="object-contain object-right" /></span> : <h3 className="mt-0 text-xl font-black text-white">{settings.storeName}</h3>}<p className="max-w-md text-xs leading-7 text-[#aeb3bd]">{settings.shortDescription}</p></div>
      <div className="flex flex-col items-start gap-3 text-xs"><h4 className="mb-2 mt-0 text-sm font-black text-white">دسترسی سریع</h4><Link href="/products">همه محصولات</Link>{pages.map((page) => <Link key={page.id} href={`/pages/${contentPageMeta[page.id].slug}`}>{page.title}</Link>)}<Link href="/account">پیگیری سفارش</Link></div>
      <div className="flex flex-col items-start gap-3 text-xs"><h4 className="mb-2 mt-0 text-sm font-black text-white">ارتباط با فروشگاه</h4>{settings.supportPhone && <a href={phoneHref(settings.supportPhone)} className="flex items-center gap-2"><Phone size={15} />{settings.supportPhone}</a>}{settings.supportEmail && <a href={`mailto:${settings.supportEmail}`} className="flex items-center gap-2" dir="ltr"><Mail size={15} />{settings.supportEmail}</a>}{settings.storeAddress && <span className="flex items-start gap-2"><MapPin className="mt-1 shrink-0" size={15} />{settings.storeAddress}</span>}</div>
    </div>
    <div className="mx-auto mt-10 w-[min(1440px,calc(100%-32px))] border-t border-white/10 py-5 text-center text-[0.68rem] text-[#9298a3] lg:w-[min(1440px,calc(100%-80px))]">کلیه حقوق این وب‌سایت متعلق به {settings.storeName} است.</div>
  </footer>;
}
