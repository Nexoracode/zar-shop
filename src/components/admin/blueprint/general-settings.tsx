"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { toast } from "@heroui/react";
import { Globe2, ShieldCheck, Users } from "lucide-react";
import type { GeneralStoreSettingsInput } from "@/modules/settings/general-settings";
import { generalSettingsFieldLimits } from "@/modules/settings/settings-limits";
import { BpButton, BpCheckbox, BpInput, BpKicker, BpSelect, BpTextarea } from "./ui";

function OptionCheckbox({ icon, title, description, isSelected, onChange }: { icon: ReactNode; title: string; description: string; isSelected: boolean; onChange: (value: boolean) => void }) {
  return (
    <BpCheckbox
      isSelected={isSelected}
      onChange={() => onChange(!isSelected)}
      className={`w-full items-center gap-3 border p-3 transition hover:border-[var(--bp-accent)] ${isSelected ? "border-[var(--bp-accent)] bg-[var(--bp-accent-100)]/20" : "border-[var(--bp-divider)] bg-[var(--bp-card)]"}`}
    >
      <span className="flex min-w-0 flex-1 items-center gap-2">
        <span className="shrink-0 text-[var(--bp-warning)]">{icon}</span>
        <span className="min-w-0">
          <strong className="block text-[13px] font-bold">{title}</strong>
          <span className="bp-muted mt-0.5 block text-[11px] leading-5">{description}</span>
        </span>
      </span>
    </BpCheckbox>
  );
}

export function BlueprintGeneralSettings({ initialSettings }: { initialSettings: GeneralStoreSettingsInput }) {
  const [saving, setSaving] = useState(false);
  const [isStoreActive, setIsStoreActive] = useState(initialSettings.isStoreActive);
  const [guestCheckout, setGuestCheckout] = useState(initialSettings.guestCheckout);
  const [maintenanceMode, setMaintenanceMode] = useState(initialSettings.maintenanceMode);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      const values = Object.fromEntries(new FormData(event.currentTarget));
      const response = await fetch("/api/admin/settings/general", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, isStoreActive, guestCheckout, maintenanceMode }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.message ?? "ذخیره تنظیمات عمومی انجام نشد.");
      toast.success("تنظیمات عمومی ذخیره شد", { description: "تغییرات در سایت و سفارش‌های جدید اعمال شدند." });
    } catch (reason) {
      toast.danger("ذخیره تنظیمات عمومی انجام نشد", { description: reason instanceof Error ? reason.message : "خطای ناشناخته" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-2">
      <div className="grid gap-2 lg:grid-cols-2">
        <section className="bp-frame relative p-[16px]">
          <BpKicker>هویت فروشگاه</BpKicker>
          <p className="bp-muted m-0 mt-1 text-[12px] leading-6">اطلاعات اصلی نمایش‌داده‌شده در سایت و فاکتور</p>
          <div className="mt-3 grid gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <BpInput name="storeName" label="نام فروشگاه" required maxLength={generalSettingsFieldLimits.storeName} defaultValue={initialSettings.storeName} />
              <BpInput name="tagline" label="شعار کوتاه" required maxLength={generalSettingsFieldLimits.tagline} defaultValue={initialSettings.tagline} />
            </div>
            <BpTextarea name="shortDescription" label="توضیح کوتاه فروشگاه" required maxLength={generalSettingsFieldLimits.shortDescription} defaultValue={initialSettings.shortDescription} rows={3} />
            <div className="grid gap-3 sm:grid-cols-2">
              <BpSelect name="currency" label="واحد پول" defaultValue={initialSettings.currency} options={[{ value: "IRR", label: "ریال" }, { value: "IRT", label: "تومان" }]} />
              <BpSelect name="timezone" label="منطقه زمانی" defaultValue={initialSettings.timezone} options={[{ value: "Asia/Tehran", label: "تهران (UTC+3:30)" }]} />
            </div>
          </div>
        </section>

        <section className="bp-frame relative p-[16px]">
          <BpKicker>اطلاعات تماس و حقوقی</BpKicker>
          <p className="bp-muted m-0 mt-1 text-[12px] leading-6">برای فوتر، فاکتور و صفحات اعتماد</p>
          <div className="mt-3 grid gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <BpInput name="supportPhone" label="شماره تماس" dir="ltr" maxLength={generalSettingsFieldLimits.supportPhone} defaultValue={initialSettings.supportPhone ?? ""} />
              <BpInput name="supportEmail" type="email" label="ایمیل پشتیبانی" dir="ltr" maxLength={generalSettingsFieldLimits.supportEmail} defaultValue={initialSettings.supportEmail ?? ""} />
            </div>
            <BpTextarea name="storeAddress" label="نشانی فروشگاه" maxLength={generalSettingsFieldLimits.storeAddress} defaultValue={initialSettings.storeAddress ?? ""} placeholder="نشانی کامل فروشگاه" rows={2} />
            <div className="grid gap-3 sm:grid-cols-2">
              <BpInput name="legalIdentifier" label="شناسه ملی / کد اقتصادی" maxLength={generalSettingsFieldLimits.legalIdentifier} defaultValue={initialSettings.legalIdentifier ?? ""} placeholder="برای فاکتور رسمی" />
              <BpInput name="supportHours" label="ساعات پاسخ‌گویی" maxLength={generalSettingsFieldLimits.supportHours} defaultValue={initialSettings.supportHours ?? ""} />
            </div>
          </div>
        </section>
      </div>

      <section className="bp-frame relative p-[16px]">
        <BpKicker>وضعیت و دسترسی فروشگاه</BpKicker>
        <p className="bp-muted m-0 mt-1 text-[12px] leading-6">کنترل نمایش عمومی و تجربه حساب کاربری</p>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <OptionCheckbox icon={<Globe2 size={17} />} title="فروشگاه فعال" description="فروشگاه برای کاربران قابل مشاهده باشد." isSelected={isStoreActive} onChange={setIsStoreActive} />
          <OptionCheckbox icon={<Users size={17} />} title="خرید مهمان" description="خرید بدون ساخت حساب امکان‌پذیر باشد." isSelected={guestCheckout} onChange={setGuestCheckout} />
          <OptionCheckbox icon={<ShieldCheck size={17} />} title="حالت تعمیر و نگهداری" description="نمایش صفحه در حال بروزرسانی به بازدیدکنندگان." isSelected={maintenanceMode} onChange={setMaintenanceMode} />
        </div>
      </section>

      <section className="bp-frame relative flex flex-col gap-3 p-[16px] sm:flex-row sm:items-center sm:justify-between">
        <p className="bp-muted m-0 text-[12px]">اطلاعات و وضعیت عمومی فروشگاه با هم ذخیره می‌شوند.</p>
        <BpButton type="submit" variant="primary" isPending={saving}>ذخیره تنظیمات</BpButton>
      </section>
    </form>
  );
}
