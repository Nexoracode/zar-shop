"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { toast } from "@heroui/react";
import { normalizeNumericValue } from "@/lib/persian-numbers";
import { authFieldLimits, phoneSchema } from "@/modules/auth/schemas";
import type { CommunicationSettingsData } from "@/modules/communications/communication-settings";
import { BpButton, BpInput, BpSpinner, BpSwitch } from "./ui";

async function patchSettings(body: unknown): Promise<CommunicationSettingsData> {
  const response = await fetch("/api/admin/sms/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const result = await response.json().catch(() => null);
  if (!response.ok) throw new Error(result?.message ?? "تنظیمات ذخیره نشد.");
  return result;
}

function Row({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 border-b border-[var(--bp-divider)] px-4 py-3 last:border-b-0 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
      <div className="min-w-0 sm:pt-1">
        <strong className="block text-[13px]">{title}</strong>
        <span className="bp-muted mt-0.5 block text-[11px] leading-5">{description}</span>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

/**
 * The channel switches and the admin's number. Switches save the moment they are flipped; the
 * number has its own small save button. What each event sends lives on the events page.
 */
export function BlueprintCommunicationSettingsForm({ initialSettings }: { initialSettings: CommunicationSettingsData }) {
  const [smsEnabled, setSmsEnabled] = useState(initialSettings.smsEnabled);
  const [inAppEnabled, setInAppEnabled] = useState(initialSettings.inAppEnabled);
  const [savedPhone, setSavedPhone] = useState(initialSettings.adminPhone ?? "");
  const [phone, setPhone] = useState(initialSettings.adminPhone ?? "");
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [pending, setPending] = useState<"smsEnabled" | "inAppEnabled" | "adminPhone" | null>(null);

  async function toggle(key: "smsEnabled" | "inAppEnabled", value: boolean) {
    const set = key === "smsEnabled" ? setSmsEnabled : setInAppEnabled;
    setPending(key);
    set(value);
    try {
      await patchSettings({ [key]: value });
    } catch (error) {
      set(!value);
      toast.danger("ذخیره انجام نشد", { description: error instanceof Error ? error.message : "خطای ناشناخته" });
    } finally {
      setPending(null);
    }
  }

  async function savePhone() {
    const parsed = phone.trim() ? phoneSchema.safeParse(phone) : null;
    if (parsed && !parsed.success) { setPhoneError(parsed.error.issues[0]?.message ?? "شماره موبایل معتبر نیست."); return; }
    setPhoneError(null);
    setPending("adminPhone");
    try {
      const saved = await patchSettings({ adminPhone: parsed?.data ?? null });
      setSavedPhone(saved.adminPhone ?? "");
      setPhone(saved.adminPhone ?? "");
      toast.success("شماره‌ی مدیر ذخیره شد");
    } catch (error) {
      toast.danger("ذخیره انجام نشد", { description: error instanceof Error ? error.message : "خطای ناشناخته" });
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="grid gap-3">
      <section className="bp-frame relative">
        <Row title="ارسال پیامک" description="کلید کلی؛ تا روشن نباشد هیچ پیامکی، حتی کد ورود، ارسال نمی‌شود.">
          <span className="flex items-center gap-1.5">{pending === "smsEnabled" && <BpSpinner size={13} />}<BpSwitch isSelected={smsEnabled} isDisabled={pending === "smsEnabled"} onChange={(value) => void toggle("smsEnabled", value)}><span className="sr-only">ارسال پیامک</span></BpSwitch></span>
        </Row>
        <Row title="اعلان داخل پنل" description="نمایش اعلان‌ها در پنل مدیریت.">
          <span className="flex items-center gap-1.5">{pending === "inAppEnabled" && <BpSpinner size={13} />}<BpSwitch isSelected={inAppEnabled} isDisabled={pending === "inAppEnabled"} onChange={(value) => void toggle("inAppEnabled", value)}><span className="sr-only">اعلان داخل پنل</span></BpSwitch></span>
        </Row>
        <Row title="شماره‌ی مدیر" description="پیامک‌های ویژه‌ی مدیر، مثل هشدار موجودی کم، به این شماره می‌رود.">
          <div className="flex items-start gap-2">
            <BpInput aria-label="شماره‌ی مدیر" dir="ltr" inputMode="numeric" maxLength={authFieldLimits.phone} value={phone} onChange={(event) => { setPhone(normalizeNumericValue(event.target.value, false)); setPhoneError(null); }} error={phoneError} placeholder="09xxxxxxxxx" wrapperClassName="w-44" />
            <BpButton variant="secondary" isPending={pending === "adminPhone"} disabled={phone.trim() === savedPhone} onClick={() => void savePhone()}>ذخیره</BpButton>
          </div>
        </Row>
      </section>

      <p className="bp-muted m-0 text-[11px] leading-5">مشخص‌کردن پترن یا متن هر پیامک: <Link href="/admin/settings/notifications/events" className="font-bold text-[var(--bp-accent)]">پیامک‌های رویدادها ←</Link></p>
    </div>
  );
}
