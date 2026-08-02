"use client";

import { Tabs } from "@heroui/react";
import { BadgeCheck, Landmark, ShieldCheck } from "lucide-react";
import { useState } from "react";

const licenses = [
  {
    id: "sales",
    title: "پروانه فروشندگی طلا",
    documentTitle: "پروانه کسب فروشندگی طلا",
    description: "پروانه کسب فروشندگی طلا نشان‌دهنده رعایت الزامات قانونی و نظارتی این حوزه است و پشتوانه‌ای برای خرید شفاف، امن و قابل اعتماد از فروشگاه به شمار می‌رود.",
    icon: Landmark,
  },
  {
    id: "online",
    title: "پروانه معاملات آنلاین طلا",
    documentTitle: "پروانه معاملات آنلاین طلا و جواهر",
    description: "مجوز معاملات آنلاین طلا و مصنوعات طلا، امنیت و سلامت فرایند خرید اینترنتی را تأیید می‌کند و نشان می‌دهد فعالیت فروشگاه در چهارچوب ضوابط رسمی انجام می‌شود.",
    icon: ShieldCheck,
  },
  {
    id: "enamad",
    title: "اینماد",
    documentTitle: "نماد اعتماد الکترونیکی",
    description: "نماد اعتماد الکترونیکی، هویت و صلاحیت فروشگاه اینترنتی را برای ارائه خدمات آنلاین مشخص می‌کند و امکان پیگیری مطمئن‌تر خرید را در اختیار مشتری قرار می‌دهد.",
    icon: BadgeCheck,
  },
] as const;

export function StorefrontLicenses() {
  const [selectedKey, setSelectedKey] = useState<string>("online");
  const selectedLicense = licenses.find((license) => license.id === selectedKey) ?? licenses[1];
  const DocumentIcon = selectedLicense.icon;

  return <section dir="rtl" className="mt-[90px] bg-[#fbf7f1] py-14 sm:py-16">
    <div className="mx-auto w-[min(1440px,calc(100%-32px))] lg:w-[min(1440px,calc(100%-80px))]">
      <Tabs selectedKey={selectedKey} onSelectionChange={(key) => setSelectedKey(String(key))} className="w-full">
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(360px,470px)] lg:gap-16">
          <div className="text-right">
            <h2 className="mb-7 mt-0 text-2xl font-black text-[#242321] sm:text-3xl">مجوزهای زرگالری</h2>
            <Tabs.List aria-label="مجوزهای فروشگاه" className="flex flex-wrap justify-start gap-2 bg-transparent p-0">
              {licenses.map((license) => <Tabs.Tab key={license.id} id={license.id} className="min-h-11 rounded-[6px] border border-[#ded9d1] bg-white px-4 text-xs font-bold text-[#55514b] outline-none transition-colors hover:bg-[#f8f5ef] data-[selected]:border-[#a9c9bd] data-[selected]:bg-[#edf5f1] data-[selected]:text-[#276655] sm:text-sm">{license.title}</Tabs.Tab>)}
            </Tabs.List>
            <Tabs.Panel id={selectedKey} className="pt-7 text-sm leading-9 text-[#595750] sm:text-base">
              {selectedLicense.description}
            </Tabs.Panel>
          </div>

          <div aria-live="polite" className="order-first lg:order-none">
            <div className="relative mx-auto aspect-[1.42/1] w-full max-w-[470px] overflow-hidden border border-[#d8d0c3] bg-[#f7f3eb] p-3 shadow-[0_10px_35px_rgba(72,58,38,0.08)]">
              <div className="flex h-full flex-col items-center justify-between border-[3px] border-double border-[#b9a886] px-6 py-5 text-center">
                <div className="grid size-14 place-items-center rounded-full border border-[#b9a886] bg-[#efe7d7] text-[#8a7448]"><DocumentIcon size={27} strokeWidth={1.5} /></div>
                <div>
                  <p className="m-0 text-[10px] font-bold tracking-[0.18em] text-[#887d69]">جمهوری اسلامی ایران</p>
                  <h3 className="mb-2 mt-3 text-base font-black text-[#38342d] sm:text-lg">{selectedLicense.documentTitle}</h3>
                  <p className="m-0 text-[10px] text-[#8c8374]">پیش‌نمایش محل درج تصویر مجوز رسمی فروشگاه</p>
                </div>
                <div className="grid w-full grid-cols-3 gap-4" aria-hidden="true">
                  <span className="h-px bg-[#cfc5b4]" /><span className="h-px bg-[#cfc5b4]" /><span className="h-px bg-[#cfc5b4]" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </Tabs>
    </div>
  </section>;
}
