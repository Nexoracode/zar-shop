"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@heroui/react";
import { ToggleLeft, ToggleRight } from "lucide-react";
import type { AdminBulkEntity } from "@/components/admin-bulk-editor";
import { BpButton } from "@/components/admin/blueprint/ui/button";
import { requestErrorMessage, requestJson } from "@/lib/api-request";

/**
 * The per-row "فعال/غیرفعال" action for an admin table's عملیات cell. It PATCHes the same
 * `/api/admin/bulk` endpoint the bulk editor uses (`active:on` / `active:off` for one id), so the
 * permission checks live in one place. The row's own list re-syncs from the server via
 * `router.refresh()`; the button keeps its spinner until that refresh lands so the icon never
 * flips back to the stale state.
 */
export function AdminActiveToggle({ entity, entityLabel, id, name, isActive }: {
  entity: AdminBulkEntity;
  entityLabel: string;
  id: string;
  name: string;
  isActive: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [refreshing, startRefresh] = useTransition();
  const label = isActive ? "غیرفعال‌کردن" : "فعال‌کردن";

  async function toggle() {
    setBusy(true);
    try {
      await requestJson("/api/admin/bulk", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entity, action: isActive ? "active:off" : "active:on", ids: [id] }),
      }, { fallbackMessage: "تغییر وضعیت انجام نشد." });
      toast.success(isActive ? `${entityLabel} غیرفعال شد.` : `${entityLabel} فعال شد.`);
      startRefresh(() => router.refresh());
    } catch (reason) {
      toast.danger("تغییر وضعیت انجام نشد", { description: requestErrorMessage(reason, "ارتباط با سرور برقرار نشد.") });
    } finally {
      setBusy(false);
    }
  }

  return (
    <BpButton isIconOnly size="sm" variant="ghost" isPending={busy || refreshing} title={label} aria-label={`${label} ${name}`} onClick={() => void toggle()}>
      {isActive ? <ToggleRight size={15} strokeWidth={1.5} className="text-[var(--bp-success)]" /> : <ToggleLeft size={15} strokeWidth={1.5} className="bp-muted" />}
    </BpButton>
  );
}
