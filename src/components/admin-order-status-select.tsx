"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Spinner, toast } from "@heroui/react";
import type { OrderStatus } from "@generated/prisma/enums";
import { HeroSelectField } from "@/components/hero-select-field";
import { OrderExpiryCountdown } from "@/components/order-expiry-countdown";
import { orderStatusLabels } from "@/modules/admin/labels";

const statuses: OrderStatus[] = ["PENDING_PAYMENT", "EXPIRED", "PAID", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"];
const options = statuses.map((status) => ({ value: status, label: orderStatusLabels[status] }));

export function AdminOrderStatusSelect({ orderId, initialStatus, expiresAt, warningMinutes }: { orderId: string; initialStatus: OrderStatus; expiresAt: string | null; warningMinutes: number }) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [saving, setSaving] = useState(false);

  async function update(nextStatus: string) {
    if (!nextStatus || nextStatus === status || saving) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/orders/${orderId}/status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: nextStatus }) });
      const result = await response.json().catch(() => null) as { status?: OrderStatus; message?: string } | null;
      if (!response.ok || !result?.status) throw new Error(result?.message ?? "تغییر وضعیت سفارش انجام نشد.");
      setStatus(result.status);
      toast.success("وضعیت سفارش تغییر کرد", { description: result.message });
      router.refresh();
    } catch (error) {
      toast.danger("تغییر وضعیت انجام نشد", { description: error instanceof Error ? error.message : "ارتباط با سرور برقرار نشد." });
    } finally {
      setSaving(false);
    }
  }

  return <div className="relative min-w-48">
    <HeroSelectField name={`order-status-${orderId}`} ariaLabel="تغییر وضعیت سفارش" value={status} disabled={saving} includeEmptyOption={false} options={options} onValueChange={(value) => void update(value)} controlClassName="!min-h-9 h-9 rounded-lg pr-3 pl-8 text-xs" />
    {saving ? <Spinner size="sm" className="absolute left-2 top-2.5" aria-label="در حال تغییر وضعیت" /> : null}
    {status === "PENDING_PAYMENT" && expiresAt ? <OrderExpiryCountdown expiresAt={expiresAt} warningMinutes={warningMinutes} className="mt-1.5" /> : null}
  </div>;
}
