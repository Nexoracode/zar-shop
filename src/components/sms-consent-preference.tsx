"use client";

import { useState } from "react";
import { Card, toast } from "@heroui/react";
import { AdminCheckbox } from "@/components/admin-checkbox";

export function SmsConsentPreference({ initialValue }: { initialValue: boolean }) {
  const [value, setValue] = useState(initialValue); const [saving, setSaving] = useState(false);
  async function update(next: boolean) { setValue(next); setSaving(true); try { const response = await fetch("/api/account/communication-preferences", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ smsMarketingConsent: next }) }); if (!response.ok) throw new Error(); toast.success(next ? "دریافت پیامک فعال شد" : "دریافت پیامک لغو شد"); } catch { setValue(!next); toast.danger("تغییر تنظیمات انجام نشد"); } finally { setSaving(false); } }
  return <Card variant="secondary" className="-mx-4 mt-3 bg-white p-4 sm:mx-0 sm:rounded-2xl sm:border sm:border-[#e7e6e2] sm:p-5" dir="rtl"><AdminCheckbox isSelected={value} isDisabled={saving} onChange={(next) => void update(next)} description="این گزینه فقط برای پیام‌های اطلاع‌رسانی و کمپین‌هاست؛ پیام‌های ضروری سفارش جداگانه مدیریت می‌شوند.">دریافت پیامک‌های فروشگاه</AdminCheckbox></Card>;
}
