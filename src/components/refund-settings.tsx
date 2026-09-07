"use client";

import { useMemo, useState } from "react";
import { Button, Card, toast } from "@heroui/react";
import { CreditCard, Trash2, Wallet } from "lucide-react";
import { TextField } from "@/components/form-field";
import {
  detectBankName,
  formatCardNumber,
  isValidCardNumber,
  isValidSheba,
  normalizeCardNumber,
  normalizeSheba,
} from "@/modules/account/bank-card";

type RefundMethod = "WALLET" | "BANK_CARD";

export type RefundSettingsValue = {
  refundMethod: RefundMethod;
  bankCardNumber: string | null;
  bankCardHolder: string | null;
  bankCardSheba: string | null;
};

type Errors = { number?: string; holder?: string; sheba?: string };

export function RefundSettings({ initial }: { initial: RefundSettingsValue }) {
  const [method, setMethod] = useState<RefundMethod>(initial.refundMethod);
  const [cardDigits, setCardDigits] = useState(initial.bankCardNumber ?? "");
  const [holder, setHolder] = useState(initial.bankCardHolder ?? "");
  const [shebaDigits, setShebaDigits] = useState(initial.bankCardSheba ?? "");
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);
  const [savedCard, setSavedCard] = useState(initial.bankCardNumber);

  const bankName = useMemo(() => detectBankName(cardDigits), [cardDigits]);

  function clear(field: keyof Errors) {
    setErrors((current) => (current[field] ? { ...current, [field]: undefined } : current));
  }

  async function save() {
    const next: Errors = {};
    const hasCardInput = cardDigits.length > 0;
    if (method === "BANK_CARD") {
      if (hasCardInput) {
        if (!isValidCardNumber(cardDigits)) next.number = "شماره کارت باید ۱۶ رقم و معتبر باشد.";
        if (holder.trim().length < 2) next.holder = "نام صاحب کارت را وارد کنید.";
      } else if (!savedCard) {
        next.number = "برای انتخاب کارت بانکی، شمارهٔ کارت را وارد کنید.";
      }
    }
    if (shebaDigits && !isValidSheba(shebaDigits)) next.sheba = "شمارهٔ شبا معتبر نیست.";
    if (Object.values(next).some(Boolean)) { setErrors(next); return; }

    setSaving(true);
    try {
      const response = await fetch("/api/account/refund-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          refundMethod: method,
          card: hasCardInput ? { number: cardDigits, holder: holder.trim(), sheba: shebaDigits } : null,
        }),
      });
      const data = (await response.json().catch(() => null)) as { message?: string } | null;
      if (!response.ok) throw new Error(data?.message ?? "ذخیرهٔ تنظیمات انجام نشد.");
      if (hasCardInput) setSavedCard(cardDigits);
      toast.success("روش بازگرداندن وجه ذخیره شد");
    } catch (error) {
      toast.danger("ذخیرهٔ تنظیمات انجام نشد", { description: error instanceof Error ? error.message : "خطای ناشناخته" });
    } finally {
      setSaving(false);
    }
  }

  async function removeCard() {
    setSaving(true);
    try {
      const response = await fetch("/api/account/refund-settings", { method: "DELETE" });
      if (!response.ok) throw new Error();
      setSavedCard(null);
      setCardDigits("");
      setHolder("");
      setShebaDigits("");
      setMethod("WALLET");
      setErrors({});
      toast.success("کارت بانکی حذف شد");
    } catch {
      toast.danger("حذف کارت انجام نشد");
    } finally {
      setSaving(false);
    }
  }

  const options: { value: RefundMethod; label: string; hint: string; icon: typeof Wallet }[] = [
    { value: "WALLET", label: "کیف پول", hint: "بلافاصله پس از تأیید مرجوعی به کیف پول شما اضافه می‌شود.", icon: Wallet },
    { value: "BANK_CARD", label: "کارت بانکی", hint: "به کارتی که ثبت می‌کنید واریز می‌شود؛ چند روز کاری زمان می‌برد.", icon: CreditCard },
  ];

  return (
    <Card variant="secondary" className="mt-3 rounded-2xl border border-[#e7e6e2] bg-white p-5" dir="rtl">
      <h2 className="m-0 text-sm font-bold">روش بازگرداندن وجه</h2>
      <p className="mb-0 mt-1 text-xs leading-6 text-[var(--muted)]">وقتی درخواست مرجوعی شما تأیید شود، مبلغ کالاهای بازگشتی از این طریق به شما برگردانده می‌شود.</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {options.map((option) => {
          const active = method === option.value;
          const Icon = option.icon;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={active}
              onClick={() => setMethod(option.value)}
              className={`flex items-start gap-3 rounded-xl border p-4 text-right transition ${active ? "border-[var(--brand-primary)] bg-[var(--brand-primary)]/5 ring-1 ring-[var(--brand-primary)]" : "border-[var(--border)] hover:border-[var(--brand-primary)]"}`}
            >
              <span className={`grid size-9 shrink-0 place-items-center rounded-lg ${active ? "bg-[var(--brand-primary)] text-[var(--brand-primary-foreground)]" : "bg-[var(--surface-secondary)] text-[var(--brand-primary)]"}`}><Icon size={18} /></span>
              <span className="min-w-0">
                <strong className="block text-xs font-bold">{option.label}</strong>
                <span className="mt-1 block text-[11px] leading-5 text-[var(--muted)]">{option.hint}</span>
              </span>
            </button>
          );
        })}
      </div>

      {method === "BANK_CARD" && (
        <div className="mt-4 grid gap-1 rounded-xl border border-[var(--border)] p-4">
          <div className="grid gap-1 sm:grid-cols-2 sm:gap-4">
            <TextField
              label="شمارهٔ کارت"
              required
              dir="ltr"
              inputMode="numeric"
              placeholder="۱۶ رقم روی کارت"
              maxLength={19}
              value={formatCardNumber(cardDigits)}
              error={errors.number}
              hint={bankName ?? "شماره کارت بانکی که می‌خواهید مبلغ به آن واریز شود"}
              onChange={(event) => { setCardDigits(normalizeCardNumber(event.target.value)); clear("number"); }}
            />
            <TextField
              label="نام صاحب کارت"
              required
              placeholder="مطابق کارت بانکی"
              maxLength={120}
              value={holder}
              error={errors.holder}
              onChange={(event) => { setHolder(event.target.value); clear("holder"); }}
            />
          </div>
          <TextField
            label="شمارهٔ شبا (اختیاری)"
            dir="ltr"
            inputMode="numeric"
            placeholder="IR و ۲۴ رقم"
            maxLength={30}
            value={shebaDigits ? `IR${shebaDigits}` : ""}
            error={errors.sheba}
            hint="اگر واریز کارت‌به‌کارت ممکن نبود، از شبا استفاده می‌شود"
            onChange={(event) => { setShebaDigits(normalizeSheba(event.target.value)); clear("sheba"); }}
          />
          {savedCard && (
            <button type="button" onClick={() => void removeCard()} disabled={saving} className="mt-1 inline-flex w-fit items-center gap-1.5 text-[11px] font-bold text-[var(--danger)] transition hover:underline">
              <Trash2 size={13} />حذف کارت ثبت‌شده
            </button>
          )}
        </div>
      )}

      <div className="mt-4 flex justify-end">
        <Button type="button" variant="primary" isPending={saving} onPress={() => void save()} className="bg-[var(--brand-primary)] text-[var(--brand-primary-foreground)]">
          ذخیرهٔ تنظیمات
        </Button>
      </div>
    </Card>
  );
}
