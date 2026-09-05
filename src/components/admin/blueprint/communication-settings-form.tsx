"use client";

import { useState, type FormEvent } from "react";
import { toast } from "@heroui/react";
import { Bell, MessageSquareText } from "lucide-react";
import type { CommunicationSettingsData } from "@/modules/communications/communication-settings";
import { communicationFieldLimits } from "@/modules/communications/limits";
import { BpButton, BpCheckbox, BpInput, BpKicker, BpTextarea } from "./ui";

function OptionCheckbox({ title, isSelected, onChange }: { title: string; isSelected: boolean; onChange: (value: boolean) => void }) {
  return (
    <BpCheckbox isSelected={isSelected} onChange={() => onChange(!isSelected)} className="w-full items-center gap-3 border border-[var(--bp-divider)] bg-[var(--bp-bg)] p-3">
      <strong className="text-[13px] font-bold">{title}</strong>
    </BpCheckbox>
  );
}

const events = [
  ["orderCreatedSms", "ثبت سفارش", "orderCreated"],
  ["paymentSuccessSms", "پرداخت موفق", "paymentSuccess"],
  ["orderShippedSms", "ارسال سفارش", "orderShipped"],
  ["orderExpiredSms", "انقضای سفارش", "orderExpired"],
  ["lowStockAdminSms", "هشدار موجودی کم مدیر", "lowStockAdmin"],
] as const;

export function BlueprintCommunicationSettingsForm({ initialSettings }: { initialSettings: CommunicationSettingsData }) {
  const [settings, setSettings] = useState(initialSettings);
  const [saving, setSaving] = useState(false);
  const set = <Key extends keyof CommunicationSettingsData>(key: Key, value: CommunicationSettingsData[Key]) => setSettings((current) => ({ ...current, [key]: value }));
  const template = (key: keyof CommunicationSettingsData["templates"], value: string) => setSettings((current) => ({ ...current, templates: { ...current.templates, [key]: value } }));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await fetch("/api/admin/sms/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(settings) });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.message ?? "تنظیمات ذخیره نشد.");
      setSettings(result);
      toast.success("تنظیمات پیامک و اعلان ذخیره شد");
    } catch (error) {
      toast.danger("ذخیره انجام نشد", { description: error instanceof Error ? error.message : "خطای ناشناخته" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-2">
      <div className="grid items-start gap-2 lg:grid-cols-[minmax(220px,0.7fr)_minmax(0,1.3fr)]">
        <section className="bp-frame relative p-[16px]">
          <div className="flex items-center gap-2"><Bell size={16} className="text-[var(--bp-accent)]" /><BpKicker>کانال‌ها</BpKicker></div>
          <div className="mt-3 grid gap-2.5">
            <OptionCheckbox title="ارسال پیامک فعال باشد" isSelected={settings.smsEnabled} onChange={(value) => set("smsEnabled", value)} />
            <OptionCheckbox title="اعلان داخل پنل فعال باشد" isSelected={settings.inAppEnabled} onChange={(value) => set("inAppEnabled", value)} />
            <BpInput label="شماره مدیر" dir="ltr" maxLength={communicationFieldLimits.adminPhone} value={settings.adminPhone ?? ""} onChange={(event) => set("adminPhone", event.target.value || null)} placeholder="0912..." />
          </div>
        </section>

        <section className="bp-frame relative p-[16px]">
          <div className="flex items-center gap-2"><MessageSquareText size={16} className="text-[var(--bp-accent)]" /><BpKicker>رویدادها و متن پیام‌ها</BpKicker></div>
          <p className="bp-muted m-0 mt-1 text-[12px] leading-6">برای هر رویداد مشخص کنید پیامک ارسال شود و متن با متغیرهایی مثل <code dir="ltr">{"{orderNumber}"}</code> جایگزین می‌شود.</p>
          <div className="mt-3 grid gap-2.5">
            {events.map(([flag, label, key]) => (
              <div key={flag} className="grid gap-2 border border-[var(--bp-divider)] bg-[var(--bp-bg)] p-3">
                <OptionCheckbox title={label} isSelected={settings[flag]} onChange={(value) => set(flag, value)} />
                <BpTextarea label="متن پیام" rows={2} maxLength={communicationFieldLimits.template} value={settings.templates[key]} onChange={(event) => template(key, event.target.value)} />
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="bp-frame relative flex flex-col gap-3 p-[16px] sm:flex-row sm:items-center sm:justify-between">
        <p className="bp-muted m-0 text-[12px]">متغیرهای قابل استفاده: <code dir="ltr">{"{orderNumber}"}</code>، <code dir="ltr">{"{productName}"}</code> و <code dir="ltr">{"{stock}"}</code></p>
        <BpButton type="submit" variant="primary" isPending={saving}>ذخیره تنظیمات</BpButton>
      </section>
    </form>
  );
}
