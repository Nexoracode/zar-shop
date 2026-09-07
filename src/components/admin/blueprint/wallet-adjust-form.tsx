"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@heroui/react";
import { requestErrorMessage, requestJson } from "@/lib/api-request";
import { walletAdjustmentSchema } from "@/modules/wallet/schemas";
import { walletFieldLimits } from "@/modules/settings/settings-limits";
import { BpButton, BpKicker, BpNumberInput, BpSelect, BpTextarea } from "./ui";

export function WalletAdjustForm({ userId }: { userId: string }) {
  const router = useRouter();
  const [direction, setDirection] = useState<"credit" | "debit">("credit");
  const [amount, setAmount] = useState("0");
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = walletAdjustmentSchema.safeParse({ direction, amount, reason });
    if (!parsed.success) {
      const found: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const field = String(issue.path[0] ?? "form");
        if (!found[field]) found[field] = issue.message;
      }
      setErrors(found);
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      await requestJson(`/api/admin/users/${userId}/wallet`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      }, { fallbackMessage: "تعدیل کیف پول انجام نشد." });
      toast.success(direction === "credit" ? "اعتبار کیف پول افزایش یافت" : "اعتبار کیف پول کاهش یافت");
      setAmount("0");
      setReason("");
      router.refresh();
    } catch (reason) {
      toast.danger("تعدیل کیف پول انجام نشد", { description: requestErrorMessage(reason, "ارتباط با سرور برقرار نشد.") });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="bp-frame relative p-[18px]">
      <BpKicker>تعدیل دستی اعتبار</BpKicker>
      <p className="bp-muted m-0 mt-1 text-[12px] leading-6">افزایش یا کاهش اعتبار کیف پول این کاربر با ثبت دلیل؛ در Audit Log ثبت می‌شود.</p>
      <div className="mt-3 grid gap-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <BpSelect
            label="نوع تعدیل"
            value={direction}
            onChange={(event) => setDirection(event.target.value as "credit" | "debit")}
            options={[{ value: "credit", label: "افزایش اعتبار" }, { value: "debit", label: "کاهش اعتبار" }]}
          />
          <BpNumberInput label="مبلغ (ریال)" isPrice value={amount} onValueChange={setAmount} error={errors.amount} />
        </div>
        <BpTextarea label="دلیل تعدیل" required rows={2} maxLength={walletFieldLimits.adjustmentReason} value={reason} error={errors.reason} onChange={(event) => setReason(event.target.value)} placeholder="مثلاً جبران خسارت سفارش مرجوعی" />
      </div>
      <div className="mt-4">
        <BpButton type="submit" variant="primary" isPending={saving}>ثبت تعدیل</BpButton>
      </div>
    </form>
  );
}
