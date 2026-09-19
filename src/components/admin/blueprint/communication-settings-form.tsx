"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { toast } from "@heroui/react";
import { Bell, ChevronLeft, MessageSquareText } from "lucide-react";
import type { CommunicationSettingsData } from "@/modules/communications/communication-settings";
import { communicationFieldLimits } from "@/modules/communications/limits";
import { BpButton, BpCheckbox, BpInput, BpKicker } from "./ui";

function OptionCheckbox({ title, isSelected, onChange }: { title: string; isSelected: boolean; onChange: (value: boolean) => void }) {
  return (
    <BpCheckbox isSelected={isSelected} onChange={() => onChange(!isSelected)} className="w-full items-center gap-3 border border-[var(--bp-divider)] bg-[var(--bp-bg)] p-3">
      <strong className="text-[13px] font-bold">{title}</strong>
    </BpCheckbox>
  );
}

/** The channel switches only. What each event sends, and how, lives on the events page. */
export function BlueprintCommunicationSettingsForm({ initialSettings }: { initialSettings: CommunicationSettingsData }) {
  const [settings, setSettings] = useState(initialSettings);
  const [saving, setSaving] = useState(false);
  const set = <Key extends keyof CommunicationSettingsData>(key: Key, value: CommunicationSettingsData[Key]) => setSettings((current) => ({ ...current, [key]: value }));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      // Only this form's own fields: the events page saves the rest, and neither overwrites the other.
      const response = await fetch("/api/admin/sms/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ smsEnabled: settings.smsEnabled, inAppEnabled: settings.inAppEnabled, adminPhone: settings.adminPhone }) });
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
      <section className="bp-frame relative p-[16px]">
        <div className="flex items-center gap-2"><Bell size={16} className="text-[var(--bp-accent)]" /><BpKicker>کانال‌ها</BpKicker></div>
        <div className="mt-3 grid gap-2.5 md:grid-cols-2">
          <OptionCheckbox title="ارسال پیامک فعال باشد" isSelected={settings.smsEnabled} onChange={(value) => set("smsEnabled", value)} />
          <OptionCheckbox title="اعلان داخل پنل فعال باشد" isSelected={settings.inAppEnabled} onChange={(value) => set("inAppEnabled", value)} />
          <BpInput label="شماره مدیر" hint="پیامک‌های ویژه‌ی مدیر، مثل هشدار موجودی کم، به این شماره می‌رود" dir="ltr" maxLength={communicationFieldLimits.adminPhone} value={settings.adminPhone ?? ""} onChange={(event) => set("adminPhone", event.target.value || null)} placeholder="0912..." />
        </div>
        <div className="mt-3 flex justify-start"><BpButton type="submit" variant="primary" isPending={saving}>ذخیره تنظیمات</BpButton></div>
      </section>

      <Link href="/admin/settings/notifications/events" className="bp-frame group relative flex items-center gap-3 p-[14px] transition hover:border-[var(--bp-accent)]">
        <span className="grid size-9 shrink-0 place-items-center border border-[var(--bp-divider)] text-[var(--bp-accent)]"><MessageSquareText size={17} /></span>
        <div className="min-w-0 flex-1"><strong className="block text-[13px]">پیامک‌های رویدادها</strong><span className="bp-muted mt-0.5 block text-[11px]">برای هر مرحله‌ی سفارش مشخص کنید پیامک بره یا نه، و با کدام پترن یا متن</span></div>
        <ChevronLeft size={16} className="bp-muted shrink-0 transition group-hover:-translate-x-0.5 group-hover:text-[var(--bp-accent)]" />
      </Link>
    </form>
  );
}
