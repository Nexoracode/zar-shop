"use client";

import { useState, type FormEvent } from "react";
import { toast } from "@heroui/react";
import type { GeneralStoreSettingsInput } from "@/modules/settings/general-settings";
import { generalSettingsFieldLimits } from "@/modules/settings/settings-limits";
import { BpButton, BpInput, BpKicker, BpSelect, BpSwitch, BpTextarea } from "./ui";

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
          <div>
            <BpSwitch isSelected={isStoreActive} onChange={setIsStoreActive}>فروشگاه فعال</BpSwitch>
            <p className="bp-muted m-0 mt-1.5 text-[12px]">فروشگاه برای کاربران قابل مشاهده باشد.</p>
          </div>
          <div>
            <BpSwitch isSelected={guestCheckout} onChange={setGuestCheckout}>خرید مهمان</BpSwitch>
            <p className="bp-muted m-0 mt-1.5 text-[12px]">خرید بدون ساخت حساب امکان‌پذیر باشد.</p>
          </div>
          <div>
            <BpSwitch isSelected={maintenanceMode} onChange={setMaintenanceMode}>حالت تعمیر و نگهداری</BpSwitch>
            <p className="bp-muted m-0 mt-1.5 text-[12px]">نمایش صفحه در حال بروزرسانی به بازدیدکنندگان.</p>
          </div>
        </div>
      </section>

      <section className="bp-frame relative flex flex-col gap-3 p-[16px] sm:flex-row sm:items-center sm:justify-between">
        <p className="bp-muted m-0 text-[12px]">اطلاعات و وضعیت عمومی فروشگاه با هم ذخیره می‌شوند.</p>
        <BpButton type="submit" variant="primary" isPending={saving}>ذخیره تنظیمات</BpButton>
      </section>
    </form>
  );
}
