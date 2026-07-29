import Link from "next/link";
import type { GeneralStoreSettingsInput } from "@/modules/settings/general-settings";

function phoneHref(phone: string) {
  const persian = "۰۱۲۳۴۵۶۷۸۹";
  const arabic = "٠١٢٣٤٥٦٧٨٩";
  const normalized = phone.replace(/[۰-۹]/g, (digit) => String(persian.indexOf(digit))).replace(/[٠-٩]/g, (digit) => String(arabic.indexOf(digit)));
  return `tel:${normalized.replace(/[^+\d]/g, "")}`;
}

export function SiteFooter({ settings }: { settings: GeneralStoreSettingsInput }) {
  return <footer className="bg-[#101d33] pt-14 text-white/75 sm:pt-16">
    <div className="mx-auto grid w-full max-w-[1240px] grid-cols-1 gap-10 px-5 sm:grid-cols-2 sm:px-6 lg:grid-cols-[1.5fr_repeat(3,1fr)] lg:gap-[54px]">
      <div><span className="mb-5 inline-grid h-11 w-11 rotate-45 place-items-center border border-[#d8bd83] text-[#d8bd83]"><span className="-rotate-45 text-sm font-bold">{settings.storeName.slice(0, 2)}</span></span><h3 className="mb-3 mt-0 text-base text-white">{settings.storeName}</h3><p className="max-w-[350px] text-[0.82rem]">{settings.shortDescription}</p></div>
      <div className="flex flex-col items-start gap-2 text-[0.8rem]"><h4 className="mb-3 mt-0 text-sm text-white">{settings.storeName}</h4><Link href="/#about" className="transition-colors hover:text-white">درباره ما</Link><Link href="/products" className="transition-colors hover:text-white">محصولات</Link><Link href="/#guide" className="transition-colors hover:text-white">خدمات فروشگاه</Link></div>
      <div className="flex flex-col items-start gap-2 text-[0.8rem]"><h4 className="mb-3 mt-0 text-sm text-white">راهنمای خرید</h4><Link href="/account" className="transition-colors hover:text-white">پیگیری سفارش</Link><Link href="/cart" className="transition-colors hover:text-white">سبد خرید</Link><Link href="/login" className="transition-colors hover:text-white">حساب کاربری</Link></div>
      <div className="flex flex-col items-start gap-2 text-[0.8rem]"><h4 className="mb-3 mt-0 text-sm text-white">تماس با ما</h4>{settings.supportPhone ? <a href={phoneHref(settings.supportPhone)} className="transition-colors hover:text-white">{settings.supportPhone}</a> : null}{settings.supportEmail ? <a href={`mailto:${settings.supportEmail}`} className="transition-colors hover:text-white">{settings.supportEmail}</a> : null}{settings.storeAddress ? <span>{settings.storeAddress}</span> : null}{settings.supportHours ? <span>{settings.supportHours}</span> : null}</div>
    </div>
    <div className="mx-auto mt-12 w-[calc(100%-40px)] max-w-[1240px] border-t border-white/10 py-4 text-center text-[0.72rem]">© ۱۴۰۵ {settings.storeName} — تمامی حقوق محفوظ است.</div>
  </footer>;
}
