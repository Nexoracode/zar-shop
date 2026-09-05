"use client";

import { useState, type FormEvent } from "react";
import { toast } from "@heroui/react";
import { Clock3 } from "lucide-react";
import type { OrderSettings as OrderSettingsData } from "@/modules/settings/order-settings";
import { BpButton, BpCheckbox, BpInput, BpKicker, BpNumberInput, BpSelect, BpTag } from "./ui";

function OptionCheckbox({ title, description, isSelected, onChange }: { title: string; description: string; isSelected: boolean; onChange: (value: boolean) => void }) {
  return (
    <BpCheckbox isSelected={isSelected} onChange={() => onChange(!isSelected)} className="w-full items-center gap-3 border border-[var(--bp-divider)] bg-[var(--bp-bg)] p-3">
      <span><strong className="block text-[13px] font-bold">{title}</strong><span className="bp-muted mt-0.5 block text-[11px] leading-5">{description}</span></span>
    </BpCheckbox>
  );
}

export function BlueprintOrderSettings({ initialSettings }: { initialSettings: OrderSettingsData }) {
  const [settings, setSettings] = useState(initialSettings);
  const [saving, setSaving] = useState(false);
  const set = <Key extends keyof OrderSettingsData>(key: Key, value: OrderSettingsData[Key]) => setSettings((current) => ({ ...current, [key]: value }));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await fetch("/api/admin/settings/orders", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(settings) });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.message ?? "ذخیره تنظیمات سفارش انجام نشد.");
      setSettings(result as OrderSettingsData);
      toast.success("تنظیمات سفارش ذخیره شد", { description: "قواعد جدید روی سفارش‌های بعدی و فرایند انقضا اعمال می‌شوند." });
    } catch (reason) {
      toast.danger("ذخیره تنظیمات سفارش انجام نشد", { description: reason instanceof Error ? reason.message : "خطای ناشناخته" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-2">
      <section className="bp-frame relative p-[16px]">
        <BpKicker>انقضای سفارش‌های بدون اقدام</BpKicker>
        <p className="bp-muted m-0 mt-1 text-[12px] leading-6">مانند فروشگاه‌های بزرگ، سفارش پرداخت‌نشده پس از مهلت تعیین‌شده منقضی می‌شود</p>
        <div className="mt-3 grid items-start gap-3 lg:grid-cols-[minmax(220px,0.65fr)_minmax(0,1.35fr)]">
          <div className="grid content-start gap-2 border border-[var(--bp-warning)] bg-[var(--bp-warning-bg)] p-3 text-[var(--bp-warning)]">
            <span className="grid size-9 place-items-center border border-[var(--bp-warning)]"><Clock3 size={17} /></span>
            <div><span className="text-[11px]">مهلت فعلی پرداخت</span><strong className="mt-1 block text-[20px] font-bold">{settings.orderExpirationEnabled ? `${settings.orderExpirationMinutes.toLocaleString("fa-IR")} دقیقه` : "غیرفعال"}</strong></div>
            <p className="m-0 text-[11px] leading-6">اگر مشتری در این زمان پرداخت را کامل نکند، سفارش مطابق اقدام انتخاب‌شده پردازش و ظرفیت پروموشن آزاد می‌شود.</p>
            <BpTag tone="warning" className="w-fit">فقط سفارش‌های در انتظار پرداخت</BpTag>
          </div>
          <div className="grid gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <BpNumberInput label="زمان انقضا (دقیقه)" value={String(settings.orderExpirationMinutes)} onValueChange={(value) => set("orderExpirationMinutes", Number(value || 0))} />
              <BpNumberInput label="هشدار قبل از انقضا (دقیقه)" value={String(settings.orderWarningMinutes)} onValueChange={(value) => set("orderWarningMinutes", Number(value || 0))} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <BpSelect label="شروع شمارش زمان از" value={settings.orderExpirationStart} onChange={(event) => set("orderExpirationStart", event.target.value as OrderSettingsData["orderExpirationStart"])} options={[{ value: "CREATED_AT", label: "زمان ایجاد سفارش" }, { value: "PAYMENT_STARTED_AT", label: "زمان ورود به درگاه" }]} />
              <BpSelect label="اقدام پس از پایان مهلت" value={settings.orderExpirationAction} onChange={(event) => set("orderExpirationAction", event.target.value as OrderSettingsData["orderExpirationAction"])} options={[{ value: "EXPIRE", label: "منقضی‌کردن خودکار سفارش" }, { value: "CANCEL", label: "لغو خودکار سفارش" }, { value: "NOTIFY", label: "فقط ثبت هشدار برای مدیر" }]} />
            </div>
            <OptionCheckbox title="نمایش شمارش معکوس به مشتری" description="شمارش معکوس مهلت پرداخت در حساب مشتری دیده شود." isSelected={settings.showOrderCountdown} onChange={(value) => set("showOrderCountdown", value)} />
          </div>
        </div>
        <div className="mt-3 grid gap-2.5 md:grid-cols-2">
          <OptionCheckbox title="انقضای خودکار سفارش" description="فقط سفارش‌های در انتظار پرداخت بررسی می‌شوند." isSelected={settings.orderExpirationEnabled} onChange={(value) => set("orderExpirationEnabled", value)} />
          <OptionCheckbox title="بازگرداندن ظرفیت پروموشن" description="کد تخفیف یا پاداش رزروشده دوباره قابل استفاده شود." isSelected={settings.restorePromotionOnExpiry} onChange={(value) => set("restorePromotionOnExpiry", value)} />
        </div>
      </section>

      <section className="bp-frame relative p-[16px]">
        <BpKicker>قواعد ثبت سفارش</BpKicker>
        <p className="bp-muted m-0 mt-1 text-[12px] leading-6">محدودیت‌ها و شماره‌گذاری سفارش</p>
        <div className="mt-3 grid gap-3">
          <div className="grid items-start gap-3 sm:grid-cols-2">
            <BpNumberInput label="حداقل مبلغ سفارش (ریال)" isPrice value={String(settings.minimumOrderAmount)} onValueChange={(value) => set("minimumOrderAmount", Number(value || 0))} />
            <BpInput label="پیشوند شماره سفارش" dir="ltr" maxLength={10} value={settings.orderNumberPrefix} onChange={(event) => set("orderNumberPrefix", event.target.value.toUpperCase())} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <BpNumberInput label="حداکثر تعداد هر قلم" value={String(settings.maxOrderItemQuantity)} onValueChange={(value) => set("maxOrderItemQuantity", Number(value || 0))} />
            <BpSelect label="وضعیت اولیه" value="PENDING_PAYMENT" disabled options={[{ value: "PENDING_PAYMENT", label: "در انتظار پرداخت (ثابت)" }]} />
          </div>
          <OptionCheckbox title="بازبینی نرخ طلا هنگام ثبت سفارش" description="پیش از ساخت سفارش، نرخ طلا از منبع اصلی دوباره دریافت و مبلغ سمت سرور محاسبه شود." isSelected={settings.revalidateGoldAtCheckout} onChange={(value) => set("revalidateGoldAtCheckout", value)} />
        </div>
      </section>

      <section className="bp-frame relative flex flex-col gap-3 p-[16px] sm:flex-row sm:items-center sm:justify-between">
        <p className="bp-muted m-0 text-[12px]">تمام قواعد این بخش با هم ذخیره و روی سفارش‌های جدید اعمال می‌شوند.</p>
        <BpButton type="submit" variant="primary" isPending={saving}>ذخیره تنظیمات</BpButton>
      </section>
    </form>
  );
}
