"use client";

import { useState, type FormEvent } from "react";
import { toast } from "@heroui/react";
import { ArrowLeftRight, Info, ShieldAlert } from "lucide-react";
import { detectBankName, formatCardNumber, normalizeCardNumber, normalizeSheba, SHEBA_DIGITS_LENGTH } from "@/modules/account/bank-card";
import { cardToCardLimits, cardToCardSettingsSchema, type CardToCardSettings } from "@/modules/payments/card-to-card-shared";
import { BpButton, BpCheckbox, BpInput, BpKicker } from "./ui";

type FieldErrors = Partial<Record<keyof CardToCardSettings, string>>;

/** The field ids, in the order the form shows them — the first one in error is the one that gets focus. */
const fieldOrder: Array<keyof CardToCardSettings> = ["cardToCardHolderName", "cardToCardCardNumber", "cardToCardBankName", "cardToCardSheba"];

/** The first message for each field, in the shape the form keeps its errors in. */
function firstErrors(fields: Record<string, string[] | undefined>): FieldErrors {
  const next: FieldErrors = {};
  for (const field of fieldOrder) {
    const message = fields[field]?.[0];
    if (message) next[field] = message;
  }
  return next;
}

/** Card grouped by four (`6037 9911 …`): sixteen digits plus three spaces. */
const CARD_INPUT_MAX_LENGTH = 19;
/** `IR`, the 24 digits and room for the six spaces a pasted شبا is usually grouped with. */
const SHEBA_INPUT_MAX_LENGTH = SHEBA_DIGITS_LENGTH + 2 + 6;

export function BlueprintCardToCardSettings({ initialSettings }: { initialSettings: CardToCardSettings }) {
  const [settings, setSettings] = useState(initialSettings);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const set = <Key extends keyof CardToCardSettings>(key: Key, value: CardToCardSettings[Key]) => {
    setSettings((current) => ({ ...current, [key]: value }));
    setErrors((current) => (current[key] ? { ...current, [key]: undefined } : current));
  };

  const detectedBank = detectBankName(settings.cardToCardCardNumber);

  function showErrors(next: FieldErrors) {
    setErrors(next);
    const first = fieldOrder.find((field) => next[field]);
    if (first) requestAnimationFrame(() => document.getElementById(first)?.focus());
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = cardToCardSettingsSchema.safeParse(settings);
    if (!parsed.success) {
      showErrors(firstErrors(parsed.error.flatten().fieldErrors));
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      const response = await fetch("/api/admin/settings/card-to-card", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(parsed.data) });
      const result = await response.json().catch(() => null) as (CardToCardSettings & { message?: string; issues?: Record<string, string[] | undefined> }) | null;
      if (!response.ok) {
        if (result?.issues) showErrors(firstErrors(result.issues));
        throw new Error(result?.message ?? "ذخیره تنظیمات کارت‌به‌کارت انجام نشد.");
      }
      setSettings(result as CardToCardSettings);
      toast.success("تنظیمات کارت‌به‌کارت ذخیره شد", { description: parsed.data.cardToCardEnabled ? "این روش پرداخت اکنون در تسویه‌حساب به مشتری نمایش داده می‌شود." : "این روش پرداخت در تسویه‌حساب نمایش داده نمی‌شود." });
    } catch (reason) {
      toast.danger("ذخیره تنظیمات کارت‌به‌کارت انجام نشد", { description: reason instanceof Error ? reason.message : "خطای ناشناخته" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-2">
      <section className="bp-frame relative p-[16px]">
        <BpKicker>روش پرداخت کارت‌به‌کارت</BpKicker>
        <p className="bp-muted m-0 mt-1 text-[12px] leading-6">مشتری مبلغ سفارش را به کارت فروشگاه واریز می‌کند، رسید یا اطلاعات پرداخت را می‌فرستد و پس از تأیید شما سفارش «پرداخت‌شده» می‌شود</p>
        <div className="mt-3 grid gap-2.5">
          <BpCheckbox isSelected={settings.cardToCardEnabled} onChange={() => set("cardToCardEnabled", !settings.cardToCardEnabled)} className="w-full items-center gap-3 border border-[var(--bp-divider)] bg-[var(--bp-bg)] p-3">
            <span className="flex min-w-0 flex-1 items-center gap-2">
              <span className="shrink-0 text-[var(--bp-warning)]"><ArrowLeftRight size={17} /></span>
              <span className="min-w-0"><strong className="block text-[13px] font-bold">فعال‌بودن کارت‌به‌کارت</strong><span className="bp-muted mt-0.5 block text-[11px] leading-5">با روشن‌بودن، این روش کنار درگاه‌های پرداخت در تسویه‌حساب دیده می‌شود. مستقل از کلید «پرداخت آنلاین» است.</span></span>
            </span>
          </BpCheckbox>
          <p className="bp-muted m-0 flex items-start gap-2 border border-[var(--bp-divider)] bg-[var(--bp-bg)] p-3 text-[12px] leading-6">
            <Info size={15} className="mt-0.5 shrink-0" aria-hidden />
            تأیید هر پرداخت از صفحهٔ همان سفارش انجام می‌شود: رسید یا اطلاعات مشتری را می‌بینید و پرداخت را تأیید یا رد می‌کنید.
          </p>
        </div>
      </section>

      <section className="bp-frame relative p-[16px]">
        <BpKicker>اطلاعات کارت فروشگاه</BpKicker>
        <p className="bp-muted m-0 mt-1 text-[12px] leading-6">این اطلاعات در بالای صفحهٔ پرداخت به مشتری نشان داده می‌شود</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <BpInput
            id="cardToCardHolderName"
            label="نام صاحب کارت"
            required={settings.cardToCardEnabled}
            maxLength={cardToCardLimits.holderName}
            value={settings.cardToCardHolderName}
            error={errors.cardToCardHolderName}
            hint="دقیقاً مطابق نامی که روی کارت درج شده است"
            onChange={(event) => set("cardToCardHolderName", event.target.value)}
          />
          <BpInput
            id="cardToCardCardNumber"
            label="شماره کارت"
            required={settings.cardToCardEnabled}
            dir="ltr"
            inputMode="numeric"
            autoComplete="off"
            placeholder="6037 9911 2233 4455"
            maxLength={CARD_INPUT_MAX_LENGTH}
            value={formatCardNumber(settings.cardToCardCardNumber)}
            error={errors.cardToCardCardNumber}
            hint={detectedBank ?? "شمارهٔ ۱۶ رقمی روی کارت"}
            onChange={(event) => set("cardToCardCardNumber", normalizeCardNumber(event.target.value))}
          />
          <BpInput
            id="cardToCardBankName"
            label="نام بانک (اختیاری)"
            maxLength={cardToCardLimits.bankName}
            value={settings.cardToCardBankName}
            error={errors.cardToCardBankName}
            placeholder={detectedBank ?? "مثلاً بانک ملت"}
            hint="اگر خالی بماند، نام بانک از روی شمارهٔ کارت تشخیص داده می‌شود"
            onChange={(event) => set("cardToCardBankName", event.target.value)}
          />
          <BpInput
            id="cardToCardSheba"
            label="شمارهٔ شبا (اختیاری)"
            dir="ltr"
            inputMode="numeric"
            autoComplete="off"
            placeholder="IR و ۲۴ رقم"
            maxLength={SHEBA_INPUT_MAX_LENGTH}
            value={settings.cardToCardSheba ? `IR${settings.cardToCardSheba}` : ""}
            error={errors.cardToCardSheba}
            hint="برای مشتری‌هایی که ترجیح می‌دهند با شبا واریز کنند"
            onChange={(event) => set("cardToCardSheba", normalizeSheba(event.target.value))}
          />
        </div>
        <p className="m-0 mt-3 flex items-start gap-2 border border-[var(--bp-warning)] bg-[var(--bp-warning-bg)] p-3 text-[12px] leading-6 text-[var(--bp-warning)]">
          <ShieldAlert size={15} className="mt-0.5 shrink-0" aria-hidden />
          مشتری‌ها پول خود را به همین کارت واریز می‌کنند؛ هر تغییر در این بخش در گزارش رویدادها ثبت می‌شود.
        </p>
      </section>

      <section className="bp-frame relative flex flex-col gap-3 p-[16px] sm:flex-row sm:items-center sm:justify-between">
        <p className="bp-muted m-0 text-[12px]">تغییر کارت فقط روی پرداخت‌های بعدی اثر می‌گذارد.</p>
        <BpButton type="submit" variant="primary" isPending={saving}>ذخیره تنظیمات</BpButton>
      </section>
    </form>
  );
}
