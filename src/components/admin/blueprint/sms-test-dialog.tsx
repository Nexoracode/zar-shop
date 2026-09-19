"use client";

import { useState } from "react";
import { toast } from "@heroui/react";
import { FlaskConical } from "lucide-react";
import { AdminDialog, AdminDialogButton } from "@/components/admin/admin-dialog";
import { authFieldLimits, phoneSchema } from "@/modules/auth/schemas";
import { BpButton, BpInput } from "./ui";

type TestKind = "SAMPLE" | "PATTERN";

/**
 * Sends a real (billed) test message through the *saved* Faraz configuration, so a wrong line,
 * pattern code or variable name shows up here instead of as a customer who never got a code.
 */
export function SmsTestDialog({ open, onClose, hasOtpPattern, ownerMobile }: { open: boolean; onClose: () => void; hasOtpPattern: boolean; ownerMobile: string | null }) {
  const [busy, setBusy] = useState<TestKind | null>(null);
  const [phone, setPhone] = useState(ownerMobile ?? "");
  const [phoneError, setPhoneError] = useState<string | null>(null);

  async function run(body: { kind: "SAMPLE" } | { kind: "PATTERN"; phone: string }) {
    setBusy(body.kind);
    try {
      const response = await fetch("/api/admin/sms/test", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.message ?? "ارسال آزمایشی انجام نشد.");
      toast.success("پیامک آزمایشی به فراز اس‌ام‌اس تحویل داده شد", { description: result?.sendRequestId ? `شناسه ارسال در فراز: ${Number(result.sendRequestId).toLocaleString("fa-IR")}` : undefined });
    } catch (error) {
      toast.danger("ارسال آزمایشی انجام نشد", { description: error instanceof Error ? error.message : "خطای ناشناخته" });
    } finally {
      setBusy(null);
    }
  }

  function runPattern() {
    const parsed = phoneSchema.safeParse(phone);
    if (!parsed.success) { setPhoneError(parsed.error.issues[0]?.message ?? "شماره موبایل معتبر نیست."); return; }
    setPhoneError(null);
    void run({ kind: "PATTERN", phone: parsed.data });
  }

  return (
    <AdminDialog
      open={open}
      size="md"
      ariaLabel="ارسال آزمایشی پیامک"
      isBusy={busy !== null}
      onClose={onClose}
      title={<span className="flex items-center gap-2"><FlaskConical size={17} className="text-[var(--bp-accent)]" />ارسال آزمایشی پیامک</span>}
      actions={<AdminDialogButton variant="secondary" isDisabled={busy !== null} onPress={onClose}>بستن</AdminDialogButton>}
    >
      <p className="m-0 text-xs leading-6 text-[var(--muted)]">پیامک آزمایشی با پیکربندی ذخیره‌شده ارسال می‌شود و از موجودی حساب کسر می‌شود.</p>

      <section className="grid gap-3 border border-[var(--border)] bg-[var(--surface-secondary)] p-3">
        <div>
          <strong className="block text-[13px]">پیامک نمونه</strong>
          <p className="m-0 mt-1 text-xs leading-6 text-[var(--muted)]">یک پیامک کوتاه فقط به شماره‌ی خود صاحب حساب فراز می‌رود؛ درستی کلید و سرشماره را می‌سنجد.</p>
        </div>
        <BpButton type="button" variant="secondary" isPending={busy === "SAMPLE"} disabled={busy !== null} onClick={() => void run({ kind: "SAMPLE" })}>ارسال پیامک نمونه</BpButton>
      </section>

      <section className="grid gap-3 border border-[var(--border)] bg-[var(--surface-secondary)] p-3">
        <div>
          <strong className="block text-[13px]">کد تأیید با پترن</strong>
          <p className="m-0 mt-1 text-xs leading-6 text-[var(--muted)]">پترن کد تأیید ذخیره‌شده را با کد نمونه‌ی ۱۲۳۴۵ برای شماره‌ی زیر می‌فرستد؛ درستی کد پترن و نام متغیرها را می‌سنجد.</p>
        </div>
        {hasOtpPattern ? (
          <>
            <BpInput label="شماره گیرنده" dir="ltr" inputMode="numeric" maxLength={authFieldLimits.phone} value={phone} onChange={(event) => { setPhone(event.target.value); setPhoneError(null); }} error={phoneError} placeholder="09xxxxxxxxx" />
            <BpButton type="button" variant="primary" isPending={busy === "PATTERN"} disabled={busy !== null} onClick={runPattern}>ارسال کد تأیید آزمایشی</BpButton>
          </>
        ) : <p className="m-0 text-xs leading-6 text-[var(--warning)]">پترن کد تأیید هنوز در پیکربندی ثبت نشده است.</p>}
      </section>
    </AdminDialog>
  );
}
