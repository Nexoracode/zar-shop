"use client";

import { useState } from "react";
import { toast } from "@heroui/react";
import { BpButton, BpCheckbox, BpInput, BpKicker, BpTextarea } from "./ui";

function OptionCheckbox({ title, description, isSelected, onChange }: { title: string; description: string; isSelected: boolean; onChange: (value: boolean) => void }) {
  return (
    <BpCheckbox isSelected={isSelected} onChange={() => onChange(!isSelected)} className="w-full items-center gap-3 border border-[var(--bp-divider)] bg-[var(--bp-bg)] p-3">
      <span><strong className="block text-[13px] font-bold">{title}</strong><span className="bp-muted mt-0.5 block text-[11px] leading-5">{description}</span></span>
    </BpCheckbox>
  );
}

/**
 * A demo section, same as its Classic counterpart: no props, no submit endpoint — the button
 * just says the section connects to the API and database once approved. The two checkboxes keep
 * local state only so they still feel interactive, exactly like Classic's uncontrolled ones.
 */
export function BlueprintSeoSettings() {
  const [allowIndexing, setAllowIndexing] = useState(true);
  const [structuredData, setStructuredData] = useState(true);
  const onDemo = () => toast.info("نسخه نمایشی تنظیمات", { description: "بخش «SEO حرفه‌ای» پس از تأیید شما به API و دیتابیس متصل می‌شود." });
  return (
    <div className="grid gap-2">
      <section className="bp-frame relative p-[16px]">
        <BpKicker>SEO حرفه‌ای</BpKicker>
        <p className="bp-muted m-0 mt-1 text-[12px] leading-6">اطلاعات پیش‌فرض موتورهای جستجو و شبکه‌های اجتماعی</p>
        <div className="mt-3 grid gap-3">
          <BpInput label="عنوان پیش‌فرض سایت" defaultValue="زر گالری | خرید آنلاین طلا با قیمت روز" />
          <BpTextarea label="توضیحات متا" rows={3} defaultValue="خرید آنلاین زیورآلات طلای ۱۸ عیار با قیمت لحظه‌ای، تضمین اصالت و فاکتور رسمی." />
          <div className="grid gap-3 sm:grid-cols-2">
            <BpInput label="دامنه اصلی" dir="ltr" defaultValue="https://zargallery.ir" />
            <BpInput label="نشانی Sitemap" dir="ltr" defaultValue="/sitemap.xml" />
          </div>
          <div className="grid gap-2.5 sm:grid-cols-2">
            <OptionCheckbox title="اجازه ایندکس موتورهای جستجو" description="صفحات منتشرشده امکان ایندکس‌شدن داشته باشند" isSelected={allowIndexing} onChange={setAllowIndexing} />
            <OptionCheckbox title="Structured Data محصولات" description="اطلاعات محصول، قیمت و موجودی برای موتور جستجو" isSelected={structuredData} onChange={setStructuredData} />
          </div>
        </div>
      </section>

      <section className="bp-frame relative flex justify-end p-[16px]">
        <BpButton type="button" variant="primary" onClick={onDemo}>ذخیره تنظیمات</BpButton>
      </section>
    </div>
  );
}
