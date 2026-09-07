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
    <form onSubmit={submit} className="bp-frame grid gap-2 p-3 sm:max-w-sm">
      <span className="bp-muted flex items-center gap-1.5 text-[12px] font-bold"><Truck size={14} />کد رهگیری مرسوله</span>
      <div className="flex items-end gap-2">
        <BpInput aria-label="کد رهگیری مرسوله" value={value} maxLength={trackingNumberMaxLength} error={error || undefined} onChange={(event) => { setValue(event.target.value); setError(""); }} dir="ltr" placeholder="کد رهگیری را وارد کنید" disabled={saving} wrapperClassName="flex-1" />
        <BpButton type="submit" variant="primary" className="field-action" isPending={saving} disabled={!canSubmit}>ثبت</BpButton>
      </div>
    </form>
  );
}
