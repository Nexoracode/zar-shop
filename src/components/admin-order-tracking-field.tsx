"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@heroui/react";
import { Truck } from "lucide-react";
import { trackingNumberMaxLength } from "@/modules/orders/tracking";
import { BpButton } from "@/components/admin/blueprint/ui/button";
import { BpInput } from "@/components/admin/blueprint/ui/input";

export function AdminOrderTrackingField({ orderId, initialTrackingNumber }: { orderId: string; initialTrackingNumber: string | null }) {
  const router = useRouter();
  const initial = initialTrackingNumber ?? "";
  const [value, setValue] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const trimmed = value.trim();
  const canSubmit = trimmed.length > 0 && trimmed !== initial;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!trimmed) { setError("کد رهگیری را وارد کنید."); return; }
    if (trimmed === initial) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/orders/${orderId}/tracking`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ trackingNumber: trimmed }) });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.message ?? "ثبت کد رهگیری انجام نشد.");
      toast.success("کد رهگیری ذخیره شد", { description: "پیامک اطلاع‌رسانی برای مشتری ارسال شد." });
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "ارتباط با سرور برقرار نشد.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="bp-frame overflow-hidden">
      <div className="flex items-center gap-2 border-b border-[var(--bp-divider)] px-4 py-3">
        <span className="text-[var(--bp-muted)]"><Truck size={16} aria-hidden /></span>
        <h2 className="m-0 text-[14px] font-bold">کد رهگیری مرسوله</h2>
      </div>
      <div className="grid gap-3 p-4">
        <BpInput aria-label="کد رهگیری مرسوله" value={value} maxLength={trackingNumberMaxLength} error={error || undefined} onChange={(event) => { setValue(event.target.value); setError(""); }} dir={value ? "ltr" : "rtl"} placeholder="کد رهگیری را وارد کنید" disabled={saving} />
        {/* The note is its own paragraph rather than the input's hint: that slot is clipped to one 11px line, which cut this sentence short in the narrow side column. */}
        <p className="bp-muted m-0 text-[10.5px] leading-5">با ثبت کد، پیامک اطلاع‌رسانی برای مشتری ارسال می‌شود.</p>
        <BpButton type="submit" variant="primary" fullWidth isPending={saving} disabled={!canSubmit}>{initial ? "به‌روزرسانی کد رهگیری" : "ثبت کد رهگیری"}</BpButton>
      </div>
    </form>
  );
}
