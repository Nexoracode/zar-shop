"use client";

import { useState, type FormEvent } from "react";
import { toast } from "@heroui/react";
import type { WalletSettings } from "@/modules/settings/wallet-settings";
import { BpButton, BpCheckbox, BpKicker, BpNumberInput } from "./ui";

function OptionCheckbox({ title, description, isSelected, onChange }: { title: string; description: string; isSelected: boolean; onChange: (value: boolean) => void }) {
  return (
    <BpCheckbox isSelected={isSelected} onChange={() => onChange(!isSelected)} className="w-full items-center gap-3 border border-[var(--bp-divider)] bg-[var(--bp-bg)] p-3">
      <span><strong className="block text-[13px] font-bold">{title}</strong><span className="bp-muted mt-0.5 block text-[11px] leading-5">{description}</span></span>
    </BpCheckbox>
  );
}

export function BlueprintWalletSettings({ initialSettings }: { initialSettings: WalletSettings }) {
  const [settings, setSettings] = useState(initialSettings);
  const [saving, setSaving] = useState(false);
  const set = <Key extends keyof WalletSettings>(key: Key, value: WalletSettings[Key]) => setSettings((current) => ({ ...current, [key]: value }));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await fetch("/api/admin/settings/wallet", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(settings) });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.message ?? "ذخیره تنظیمات کیف پول انجام نشد.");
      setSettings(result as WalletSettings);
      toast.success("تنظیمات کیف پول ذخیره شد", { description: "قواعد جدید روی خریدها و پاداش‌های بعدی اعمال می‌شوند." });
    } catch (reason) {
      toast.danger("ذخیره تنظیمات کیف پول انجام نشد", { description: reason instanceof Error ? reason.message : "خطای ناشناخته" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-2">
      <section className="bp-frame relative p-[16px]">
        <BpKicker>کیف پول مشتریان</BpKicker>
        <p className="bp-muted m-0 mt-1 text-[12px] leading-6">اعتبار داخل فروشگاه برای هر مشتری؛ قابل خرج در تسویه‌حساب و غیرقابل برداشت به حساب بانکی</p>
        <div className="mt-3 grid gap-2.5 md:grid-cols-2">
          <OptionCheckbox title="فعال‌بودن کیف پول" description="نمایش کیف پول در حساب کاربری و امکان شارژ آن." isSelected={settings.walletEnabled} onChange={(value) => set("walletEnabled", value)} />
          <OptionCheckbox title="پرداخت با کیف پول در تسویه‌حساب" description="مشتری می‌تواند بخشی یا کل مبلغ سفارش را از اعتبار کیف پول بپردازد." isSelected={settings.walletCheckoutEnabled} onChange={(value) => set("walletCheckoutEnabled", value)} />
        </div>
      </section>

      <section className="bp-frame relative p-[16px]">
        <BpKicker>افزایش اعتبار توسط مشتری</BpKicker>
        <p className="bp-muted m-0 mt-1 text-[12px] leading-6">مشتری می‌تواند از صفحهٔ کیف پول با پرداخت به درگاه، اعتبار خود را افزایش دهد</p>
        <div className="mt-3 grid gap-3">
          <OptionCheckbox title="فعال‌بودن افزایش اعتبار" description="دکمهٔ «افزایش اعتبار» در صفحهٔ کیف پول مشتری نمایش داده شود." isSelected={settings.walletTopupEnabled} onChange={(value) => set("walletTopupEnabled", value)} />
          <div className="grid gap-3 sm:grid-cols-2">
            <BpNumberInput label="حداقل مبلغ هر افزایش اعتبار (ریال)" isPrice value={String(settings.walletMinTopup)} onValueChange={(value) => set("walletMinTopup", Number(value || 0))} />
            <BpNumberInput label="حداکثر مبلغ هر افزایش اعتبار (ریال)" isPrice value={String(settings.walletMaxTopup)} onValueChange={(value) => set("walletMaxTopup", Number(value || 0))} />
          </div>
        </div>
      </section>

      <section className="bp-frame relative p-[16px]">
        <BpKicker>دعوت دوستان</BpKicker>
        <p className="bp-muted m-0 mt-1 text-[12px] leading-6">اگر کاربر جدید با کد معرف ثبت‌نام کند، پس از اولین خرید موفقِ او هر دو طرف پاداش می‌گیرند</p>
        <div className="mt-3 grid gap-3">
          <OptionCheckbox title="فعال‌بودن سیستم دعوت" description="نمایش کد معرف در حساب کاربری و فیلد «کد معرف» هنگام ثبت‌نام." isSelected={settings.referralEnabled} onChange={(value) => set("referralEnabled", value)} />
          <div className="grid gap-3 sm:grid-cols-2">
            <BpNumberInput label="پاداش معرف (ریال)" isPrice value={String(settings.referralReferrerReward)} onValueChange={(value) => set("referralReferrerReward", Number(value || 0))} />
            <BpNumberInput label="پاداش دعوت‌شده (ریال)" isPrice value={String(settings.referralRefereeReward)} onValueChange={(value) => set("referralRefereeReward", Number(value || 0))} />
          </div>
          <BpNumberInput label="حداقل مبلغ اولین خرید برای دریافت پاداش (ریال)" isPrice value={String(settings.referralRewardMinOrderAmount)} onValueChange={(value) => set("referralRewardMinOrderAmount", Number(value || 0))} hint="صفر یعنی هر خریدی واجد شرایط است." />
        </div>
      </section>

      <section className="bp-frame relative flex flex-col gap-3 p-[16px] sm:flex-row sm:items-center sm:justify-between">
        <p className="bp-muted m-0 text-[12px]">تغییر مبالغ فقط روی پاداش‌ها و خریدهای بعدی اثر می‌گذارد.</p>
        <BpButton type="submit" variant="primary" isPending={saving}>ذخیره تنظیمات</BpButton>
      </section>
    </form>
  );
}
