"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { Button, Card, Chip, Input, toast } from "@heroui/react";
import { BadgePercent, CalendarDays, Check, Gift, Save, ShoppingBag, Sparkles, Truck } from "lucide-react";
import { AdminCheckbox } from "@/components/admin-checkbox";
import { HeroDateRangeField } from "@/components/hero-date-range-field";
import { HeroNumberInput } from "@/components/hero-number-input";
import { HeroSelectField } from "@/components/hero-select-field";
import { adminFieldClass, adminLabelClass } from "@/components/admin-ui";

type PromotionType = "COUPON" | "FREE_SHIPPING" | "NEXT_PURCHASE" | "FIRST_PURCHASE";

const promotionTypes: Array<{
  id: PromotionType;
  title: string;
  description: string;
  icon: ReactNode;
  color: string;
}> = [
  { id: "COUPON", title: "تعریف کد تخفیف", description: "کد عمومی یا اختصاصی با محدودیت مبلغ و تعداد استفاده", icon: <BadgePercent size={20} />, color: "bg-violet-50 text-violet-700" },
  { id: "FREE_SHIPPING", title: "ارسال رایگان", description: "حذف هزینه ارسال برای سفارش‌های واجد شرایط", icon: <Truck size={20} />, color: "bg-sky-50 text-sky-700" },
  { id: "NEXT_PURCHASE", title: "تخفیف خرید بعدی", description: "پاداش بازگشت مشتری پس از تکمیل سفارش", icon: <Gift size={20} />, color: "bg-amber-50 text-amber-700" },
  { id: "FIRST_PURCHASE", title: "خرید اول", description: "پیشنهاد خوش‌آمدگویی برای اولین سفارش مشتری", icon: <ShoppingBag size={20} />, color: "bg-emerald-50 text-emerald-700" },
];

export function AdminPromotions() {
  const [selectedType, setSelectedType] = useState<PromotionType>("COUPON");
  const [dateRange, setDateRange] = useState<{ start: string; end: string } | null>(null);
  const selected = promotionTypes.find((item) => item.id === selectedType) ?? promotionTypes[0];

  function selectType(type: PromotionType) {
    setSelectedType(type);
    setDateRange(null);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    toast.info("نسخه نمایشی پروموشن", { description: `ظاهر «${selected.title}» آماده است؛ پس از تأیید شما به API و دیتابیس متصل می‌شود.` });
  }

  return (
    <div dir="rtl" className="grid gap-5 text-right">
      <Card variant="secondary" className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
        <Card.Content className="p-4 sm:p-5">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="m-0 text-base font-black text-[var(--foreground)]">نوع پروموشن را انتخاب کنید</h2>
              <p className="mb-0 mt-1 text-xs text-[var(--muted)]">هر پروموشن قواعد و محدودیت‌های مخصوص خودش را دارد.</p>
            </div>
            <Chip size="sm" variant="soft" className="shrink-0 bg-violet-50 text-violet-700"><Chip.Label>۴ نوع</Chip.Label></Chip>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {promotionTypes.map((item) => {
              const active = selectedType === item.id;
              return (
                <Button
                  key={item.id}
                  type="button"
                  variant="secondary"
                  aria-pressed={active}
                  onPress={() => selectType(item.id)}
                  className={`h-auto min-h-32 w-full justify-start rounded-xl border p-3 text-right whitespace-normal ${active ? "border-violet-400 bg-violet-50/60 ring-2 ring-violet-100" : "border-[var(--border)] bg-[var(--surface-secondary)] hover:border-violet-200"}`}
                >
                  <span className="grid w-full gap-2">
                    <span className="flex items-start justify-between gap-3">
                      <span className={`grid h-9 w-9 place-items-center rounded-lg ${item.color}`}>{item.icon}</span>
                      {active ? <span className="grid h-6 w-6 place-items-center rounded-full bg-violet-700 text-white"><Check size={13} /></span> : null}
                    </span>
                    <strong className="block text-xs font-black text-[var(--foreground)]">{item.title}</strong>
                    <span className="block text-[11px] leading-5 text-[var(--muted)]">{item.description}</span>
                  </span>
                </Button>
              );
            })}
          </div>
        </Card.Content>
      </Card>

      <form key={selectedType} onSubmit={submit}>
        <Card variant="secondary" className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
          <Card.Content className="p-4 sm:p-6">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-4">
              <div className="flex items-center gap-3">
                <span className={`grid h-10 w-10 place-items-center rounded-xl ${selected.color}`}>{selected.icon}</span>
                <div><span className="text-[10px] font-bold text-violet-600">پروموشن جدید</span><h2 className="m-0 text-base font-black text-[var(--foreground)]">{selected.title}</h2></div>
              </div>
              <Chip size="sm" variant="soft" className="bg-slate-100 text-slate-600"><Chip.Label>پیش‌نویس</Chip.Label></Chip>
            </div>

            <div className="grid gap-5">
              <div className="grid gap-4 lg:grid-cols-2">
                <label className={adminLabelClass}>عنوان داخلی پروموشن<Input required fullWidth variant="secondary" className={adminFieldClass} placeholder="مثلاً کمپین پایان تابستان" /></label>
                <HeroDateRangeField label="بازه اعتبار (تقویم فارسی)" start={dateRange?.start ?? null} end={dateRange?.end ?? null} onChange={setDateRange} />
              </div>

              <PromotionFields type={selectedType} />

              <div className="grid gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)] p-4 sm:grid-cols-2">
                <AdminCheckbox defaultSelected icon={<CalendarDays size={16} />} description="پروموشن فقط در بازه انتخاب‌شده قابل استفاده باشد.">فعال‌سازی خودکار در بازه</AdminCheckbox>
                <AdminCheckbox icon={<Sparkles size={16} />} description="پایان ظرفیت یا اعتبار به مدیر اطلاع داده شود.">اعلان پایان پروموشن</AdminCheckbox>
              </div>
            </div>

            <div className="mt-5 flex flex-col-reverse gap-2 border-t border-[var(--border)] pt-4 sm:flex-row sm:justify-end">
              <Button type="button" variant="secondary" onPress={() => selectType(selectedType)} className="min-h-10 px-4 text-xs">پاک‌کردن فرم</Button>
              <Button type="submit" variant="primary" className="min-h-10 gap-2 bg-violet-700 px-5 text-xs font-bold text-white"><Save size={15} />ذخیره پروموشن</Button>
            </div>
          </Card.Content>
        </Card>
      </form>
    </div>
  );
}

function PromotionFields({ type }: { type: PromotionType }) {
  if (type === "COUPON") return <div className="grid gap-4 rounded-xl border border-violet-100 bg-violet-50/35 p-4 md:grid-cols-2 xl:grid-cols-4">
    <label className={adminLabelClass}>کد تخفیف<Input required dir="ltr" fullWidth variant="secondary" className={`${adminFieldClass} uppercase`} placeholder="WELCOME20" /></label>
    <HeroSelectField name="discountType" label="نوع تخفیف" value="PERCENT" includeEmptyOption={false} options={[{ value: "PERCENT", label: "درصدی" }, { value: "FIXED", label: "مبلغ ثابت" }]} />
    <label className={adminLabelClass}>مقدار تخفیف<HeroNumberInput required min="1" fullWidth variant="secondary" className={adminFieldClass} placeholder="مثلاً ۲۰" /></label>
    <label className={adminLabelClass}>حداکثر تعداد استفاده<HeroNumberInput required min="1" fullWidth variant="secondary" className={adminFieldClass} placeholder="مثلاً ۱۰۰" /></label>
    <label className={adminLabelClass}>حداقل مبلغ سفارش<HeroNumberInput min="0" isPrice fullWidth variant="secondary" className={adminFieldClass} placeholder="بدون محدودیت" /></label>
    <label className={adminLabelClass}>سقف تخفیف<HeroNumberInput min="0" isPrice fullWidth variant="secondary" className={adminFieldClass} placeholder="بدون سقف" /></label>
  </div>;

  if (type === "FREE_SHIPPING") return <div className="grid gap-4 rounded-xl border border-sky-100 bg-sky-50/35 p-4 md:grid-cols-2 xl:grid-cols-3">
    <label className={adminLabelClass}>حداقل مبلغ سفارش<HeroNumberInput min="0" isPrice fullWidth variant="secondary" className={adminFieldClass} placeholder="مثلاً ۵,۰۰۰,۰۰۰" /></label>
    <HeroSelectField name="shippingScope" label="محدوده ارسال" value="ALL" includeEmptyOption={false} options={[{ value: "ALL", label: "تمام شهرها" }, { value: "TEHRAN", label: "فقط تهران" }, { value: "SELECTED", label: "شهرهای منتخب" }]} />
    <label className={adminLabelClass}>حداکثر تعداد سفارش<HeroNumberInput min="1" fullWidth variant="secondary" className={adminFieldClass} placeholder="بدون محدودیت" /></label>
  </div>;

  if (type === "NEXT_PURCHASE") return <div className="grid gap-4 rounded-xl border border-amber-100 bg-amber-50/35 p-4 md:grid-cols-2 xl:grid-cols-4">
    <HeroSelectField name="rewardType" label="نوع پاداش" value="PERCENT" includeEmptyOption={false} options={[{ value: "PERCENT", label: "درصدی" }, { value: "FIXED", label: "اعتبار مبلغی" }]} />
    <label className={adminLabelClass}>مقدار پاداش<HeroNumberInput required min="1" fullWidth variant="secondary" className={adminFieldClass} placeholder="مثلاً ۱۰" /></label>
    <label className={adminLabelClass}>مهلت استفاده (روز)<HeroNumberInput required min="1" fullWidth variant="secondary" className={adminFieldClass} placeholder="مثلاً ۳۰" /></label>
    <label className={adminLabelClass}>حداقل مبلغ خرید فعلی<HeroNumberInput min="0" isPrice fullWidth variant="secondary" className={adminFieldClass} placeholder="بدون محدودیت" /></label>
  </div>;

  return <div className="grid gap-4 rounded-xl border border-emerald-100 bg-emerald-50/35 p-4 md:grid-cols-2 xl:grid-cols-4">
    <HeroSelectField name="firstOrderDiscountType" label="نوع تخفیف" value="PERCENT" includeEmptyOption={false} options={[{ value: "PERCENT", label: "درصدی" }, { value: "FIXED", label: "مبلغ ثابت" }]} />
    <label className={adminLabelClass}>مقدار تخفیف<HeroNumberInput required min="1" fullWidth variant="secondary" className={adminFieldClass} placeholder="مثلاً ۱۵" /></label>
    <label className={adminLabelClass}>حداقل مبلغ سفارش<HeroNumberInput min="0" isPrice fullWidth variant="secondary" className={adminFieldClass} placeholder="بدون محدودیت" /></label>
    <label className={adminLabelClass}>سقف تخفیف<HeroNumberInput min="0" isPrice fullWidth variant="secondary" className={adminFieldClass} placeholder="بدون سقف" /></label>
  </div>;
}
