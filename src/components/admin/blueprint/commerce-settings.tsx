"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { toast } from "@heroui/react";
import { CheckCircle2, CreditCard, MapPin, Plus, Truck } from "lucide-react";
import type { CommerceSettings as CommerceSettingsData } from "@/modules/settings/commerce-settings";
import { BpButton, BpCheckbox, BpKicker, BpNumberInput, BpTag } from "./ui";
import { BlueprintShippingOriginPicker } from "./shipping-origin-picker";

function OptionCheckbox({ icon, title, description, isSelected, onChange }: { icon: React.ReactNode; title: string; description: string; isSelected: boolean; onChange: (value: boolean) => void }) {
  return (
    <BpCheckbox isSelected={isSelected} onChange={() => onChange(!isSelected)} className="w-full items-center gap-3 border border-[var(--bp-divider)] bg-[var(--bp-bg)] p-3">
      <span className="flex min-w-0 flex-1 items-center gap-2">
        <span className="shrink-0 text-[var(--bp-warning)]">{icon}</span>
        <span className="min-w-0"><strong className="block text-[13px] font-bold">{title}</strong><span className="bp-muted mt-0.5 block text-[11px] leading-5">{description}</span></span>
      </span>
    </BpCheckbox>
  );
}

export function BlueprintCommerceSettings({ initialSettings, configuredGatewayCount }: { initialSettings: CommerceSettingsData; configuredGatewayCount: number }) {
  const [settings, setSettings] = useState(initialSettings);
  const [saving, setSaving] = useState(false);
  const set = <Key extends keyof CommerceSettingsData>(key: Key, value: CommerceSettingsData[Key]) => setSettings((current) => ({ ...current, [key]: value }));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await fetch("/api/admin/settings/commerce", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(settings) });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.message ?? "ذخیره تنظیمات ارسال و پرداخت انجام نشد.");
      setSettings(result as CommerceSettingsData);
      toast.success("تنظیمات ارسال و پرداخت ذخیره شد", { description: "روش‌های تحویل و محاسبه هزینه روی checkout اعمال شدند." });
    } catch (reason) {
      toast.danger("ذخیره تنظیمات ارسال و پرداخت انجام نشد", { description: reason instanceof Error ? reason.message : "خطای ناشناخته" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-2">
      <div className="grid items-start gap-2 lg:grid-cols-[minmax(260px,0.82fr)_minmax(0,1.18fr)]">
        <section className="bp-frame relative p-[16px]">
          <BpKicker>روش‌های پرداخت</BpKicker>
          <p className="bp-muted m-0 mt-1 text-[12px] leading-6">درگاه‌ها و ترتیب نمایش در تسویه حساب</p>
          <div className="mt-3 grid gap-2.5">
            <OptionCheckbox icon={<CreditCard size={17} />} title="پرداخت آنلاین" description="در صورت غیرفعال‌شدن، ایجاد سفارش و انتقال به درگاه متوقف می‌شود." isSelected={settings.onlinePaymentEnabled} onChange={(value) => set("onlinePaymentEnabled", value)} />
            <div className={`flex items-center justify-between gap-3 border p-3 ${configuredGatewayCount ? "border-[var(--bp-success)] bg-[var(--bp-success-bg)] text-[var(--bp-success)]" : "border-[var(--bp-warning)] bg-[var(--bp-warning-bg)] text-[var(--bp-warning)]"}`}>
              <span className="flex items-center gap-2 text-[13px] font-bold">{configuredGatewayCount ? <CheckCircle2 size={16} /> : <CreditCard size={16} />}درگاه‌های ثبت‌شده</span>
              <BpTag>{configuredGatewayCount.toLocaleString("fa-IR")} درگاه</BpTag>
            </div>
            <Link href="/admin/settings/payment-gateways" className="bp-btn bp-btn-secondary w-full gap-2"><Plus size={16} />افزودن و مدیریت درگاه</Link>
            <p className="bp-muted m-0 border border-[var(--bp-divider)] bg-[var(--bp-bg)] p-3 text-[12px] leading-6">کارت‌به‌کارت و پرداخت حضوری تا زمان پیاده‌سازی تأیید دستی و رسید پرداخت، به مشتری نمایش داده نمی‌شوند.</p>
          </div>
        </section>

        <section className="bp-frame relative p-[16px]">
          <BpKicker>ارسال و تحویل</BpKicker>
          <p className="bp-muted m-0 mt-1 text-[12px] leading-6">فعال‌سازی روش‌های قابل انتخاب برای مشتری</p>
          <div className="mt-3 grid gap-3">
            <div className="border border-[var(--bp-divider)] bg-[var(--bp-bg)] p-3">
              <strong className="block text-[13px]">روش‌های تحویل</strong>
              <p className="bp-muted m-0 mt-1 text-[11px] leading-5">حداقل یک روش فعال برای ثبت سفارش لازم است.</p>
              <div className="mt-2.5 grid gap-2.5 2xl:grid-cols-2">
                <OptionCheckbox icon={<Truck size={17} />} title="ارسال بیمه‌شده" description="هزینه پس از دریافت نشانی و بر اساس وزن مرسوله محاسبه می‌شود." isSelected={settings.insuredShippingEnabled} onChange={(value) => set("insuredShippingEnabled", value)} />
                <OptionCheckbox icon={<MapPin size={17} />} title="تحویل حضوری" description="مشتری سفارش پرداخت‌شده را بدون هزینه ارسال از فروشگاه تحویل می‌گیرد." isSelected={settings.inStorePickupEnabled} onChange={(value) => set("inStorePickupEnabled", value)} />
              </div>
            </div>
            <div className="border border-[var(--bp-divider)] bg-[var(--bp-bg)] p-3">
              <strong className="block text-[13px]">مبدأ ارسال و وزن پیش‌فرض</strong>
              <p className="bp-muted m-0 mt-1 text-[11px] leading-5">برای گرفتن نرخ از شرکت حمل، مبدأ لازم است. وزن پیش‌فرض روی محصولاتی اعمال می‌شود که هنوز وزن بسته ندارند.</p>
              <div className="mt-2.5 grid gap-2.5">
                <BlueprintShippingOriginPicker
                  provinceId={settings.originProvinceId}
                  cityId={settings.originCityId}
                  onChange={(next) => setSettings((current) => ({ ...current, originProvinceId: next.provinceId, originCityId: next.cityId }))}
                />
                <BpNumberInput label="وزن پیش‌فرض بسته (گرم)" value={String(settings.defaultParcelWeightGrams)} onValueChange={(value) => set("defaultParcelWeightGrams", Number(value || 0))} wrapperClassName="sm:max-w-[240px]" />
                <Link href="/admin/shipping-methods" className="bp-btn bp-btn-secondary w-full gap-2 sm:w-fit"><Truck size={16} />مدیریت روش‌های ارسال</Link>
              </div>
            </div>
          </div>
        </section>
      </div>

      <section className="bp-frame relative flex flex-col gap-3 p-[16px] sm:flex-row sm:items-center sm:justify-between">
        <p className="bp-muted m-0 text-[12px]">وضعیت درگاه و روش‌های تحویل با هم ذخیره می‌شوند.</p>
        <BpButton type="submit" variant="primary" isPending={saving}>ذخیره تنظیمات</BpButton>
      </section>
    </form>
  );
}
