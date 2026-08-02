"use client";

import { Tabs } from "@heroui/react";
import { BadgeCheck, Landmark, ShieldCheck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import type { HomepageSettings } from "@/modules/settings/homepage-settings";

const licenses = [
  {
    id: "SALES",
    title: "پروانه فروشندگی طلا",
    documentTitle: "پروانه کسب فروشندگی طلا",
    description: "پروانه کسب فروشندگی طلا نشان‌دهنده رعایت الزامات قانونی و نظارتی این حوزه است و پشتوانه‌ای برای خرید شفاف، امن و قابل اعتماد از فروشگاه به شمار می‌رود.",
    icon: Landmark,
  },
  {
    id: "ONLINE",
    title: "پروانه معاملات آنلاین طلا",
    documentTitle: "پروانه معاملات آنلاین طلا و جواهر",
    description: "مجوز معاملات آنلاین طلا و مصنوعات طلا، امنیت و سلامت فرایند خرید اینترنتی را تأیید می‌کند و نشان می‌دهد فعالیت فروشگاه در چهارچوب ضوابط رسمی انجام می‌شود.",
    icon: ShieldCheck,
  },
  {
    id: "ENAMAD",
    title: "اینماد",
    documentTitle: "نماد اعتماد الکترونیکی",
    description: "نماد اعتماد الکترونیکی، هویت و صلاحیت فروشگاه اینترنتی را برای ارائه خدمات آنلاین مشخص می‌کند و امکان پیگیری مطمئن‌تر خرید را در اختیار مشتری قرار می‌دهد.",
    icon: BadgeCheck,
  },
] as const;

export function StorefrontLicenses({ storeName, settings }: { storeName: string; settings: HomepageSettings["licenses"] }) {
  const [selectedKey, setSelectedKey] = useState<string>("ONLINE");
  const selectedLicense = licenses.find((license) => license.id === selectedKey) ?? licenses[1];
  const selectedSettings = settings.find((license) => license.id === selectedLicense.id);
  const DocumentIcon = selectedLicense.icon;

  const preview = selectedSettings?.media
    ? <span className="relative block h-full w-full"><Image src={selectedSettings.media.url} alt={selectedSettings.media.alt || selectedSettings.media.title || selectedLicense.documentTitle} fill sizes="(max-width: 1024px) 100vw, 470px" className="object-contain" /></span>
    : <div className="flex h-full flex-col items-center justify-between border-[3px] border-double border-[#b9a886] px-6 py-5 text-center">
      <div className="grid size-14 place-items-center rounded-full border border-[#b9a886] bg-[#efe7d7] text-[#8a7448]"><DocumentIcon size={27} strokeWidth={1.5} /></div>
      <div>
        <p className="m-0 text-[10px] font-bold tracking-[0.18em] text-[#887d69]">جمهوری اسلامی ایران</p>
        <h3 className="mb-2 mt-3 text-base font-black text-[#38342d] sm:text-lg">{selectedLicense.documentTitle}</h3>
        <p className="m-0 text-[10px] text-[#8c8374]">پیش‌نمایش محل درج تصویر مجوز رسمی فروشگاه</p>
      </div>
      <div className="grid w-full grid-cols-3 gap-4" aria-hidden="true"><span className="h-px bg-[#cfc5b4]" /><span className="h-px bg-[#cfc5b4]" /><span className="h-px bg-[#cfc5b4]" /></div>
    </div>;

  return <section dir="rtl" className="mt-[90px] bg-[#fbf7f1] py-14 sm:py-16">
    <div className="mx-auto w-[min(1440px,calc(100%-32px))] lg:w-[min(1440px,calc(100%-80px))]">
      <Tabs selectedKey={selectedKey} onSelectionChange={(key) => setSelectedKey(String(key))} className="w-full">
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(360px,470px)] lg:gap-16">
          <div className="text-right">
            <h2 className="mb-7 mt-0 text-2xl font-black text-[#242321] sm:text-3xl">مجوزهای {storeName}</h2>
            <Tabs.List aria-label="مجوزهای فروشگاه" className="grid w-full grid-cols-[1fr_1.55fr_0.55fr] gap-2 bg-transparent p-0">
              {licenses.map((license) => <Tabs.Tab key={license.id} id={license.id} className="min-h-11 min-w-0 rounded-[6px] border border-[#ded9d1] bg-white px-2 text-xs font-bold text-[#55514b] outline-none transition-colors hover:bg-[#f8f5ef] data-[selected]:border-[#a9c9bd] data-[selected]:bg-[#edf5f1] data-[selected]:text-[#276655] sm:px-4 sm:text-sm">{license.title}</Tabs.Tab>)}
            </Tabs.List>
            <Tabs.Panel id={selectedKey} className="pt-7 text-sm leading-9 text-[#595750] sm:text-base">
              {selectedLicense.description}
            </Tabs.Panel>
          </div>

          <div aria-live="polite" className="order-first lg:order-none">
            <div className="relative mx-auto aspect-[1.42/1] w-full max-w-[470px] overflow-hidden border border-[#d8d0c3] bg-[#f7f3eb] p-3 shadow-[0_10px_35px_rgba(72,58,38,0.08)]">
              {selectedSettings?.href ? <Link href={selectedSettings.href} target={selectedSettings.href.startsWith("https://") ? "_blank" : undefined} rel={selectedSettings.href.startsWith("https://") ? "noreferrer" : undefined} aria-label={`مشاهده ${selectedLicense.title}`} className="absolute inset-3 block">{preview}</Link> : preview}
            </div>
          </div>
        </div>
      </Tabs>
    </div>
  </section>;
}
