"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Input, toast } from "@heroui/react";
import { Truck } from "lucide-react";
import { AdminSaveButton } from "@/components/admin-save-button";
import { adminFieldClass, adminLabelClass } from "@/components/admin-ui";
import { trackingNumberMaxLength } from "@/modules/orders/tracking";

export function AdminOrderTrackingField({ orderId, initialTrackingNumber }: { orderId: string; initialTrackingNumber: string | null }) {
  const router = useRouter();
  const [value, setValue] = useState(initialTrackingNumber ?? "");
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/orders/${orderId}/tracking`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ trackingNumber: value.trim() || null }) });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.message ?? "ثبت کد رهگیری انجام نشد.");
      toast.success("کد رهگیری ذخیره شد", { description: value.trim() ? "پیامک اطلاع‌رسانی برای مشتری ارسال شد." : undefined });
      router.refresh();
    } catch (error) {
      toast.danger("ثبت کد رهگیری انجام نشد", { description: error instanceof Error ? error.message : "ارتباط با سرور برقرار نشد." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-2 rounded-xl bg-slate-50 px-4 py-3">
      <label className={`${adminLabelClass} flex items-center gap-1.5 text-xs text-slate-400`}><Truck size={14} />کد رهگیری مرسوله</label>
      <div className="flex items-center gap-2">
        <Input value={value} maxLength={trackingNumberMaxLength} onChange={(event) => setValue(event.target.value)} dir="ltr" placeholder="در انتظار ثبت فروشگاه" disabled={saving} fullWidth variant="secondary" className={`${adminFieldClass} !min-h-9 h-9 text-xs`} />
        <AdminSaveButton isSaving={saving} label="ثبت" className="min-h-9 !h-9 px-3 text-xs" />
      </div>
    </form>
  );
}
