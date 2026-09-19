"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@heroui/react";
import { Power, ToggleLeft, ToggleRight } from "lucide-react";
import type { AdminBulkEntity } from "@/components/admin-bulk-editor";
import { BpButton } from "@/components/admin/blueprint/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { requestErrorMessage, requestJson } from "@/lib/api-request";

/** What to ask before switching something OFF — for an entity where that has consequences worth a second look. */
export type AdminActiveConfirmOff = { title: string; description: string; subtitle?: string; confirmLabel?: string };

/**
 * The per-row "فعال/غیرفعال" action for an admin table's عملیات cell. It PATCHes the same
 * `/api/admin/bulk` endpoint the bulk editor uses (one id), so the permission checks live in one
 * place. The row's own list re-syncs from the server via `router.refresh()`; the button keeps its
 * spinner until that refresh lands so the icon never flips back to the stale state.
 *
 * Entities whose "active" state is not a plain `isActive` flag (e.g. a user's ACTIVE/SUSPENDED
 * status) override the bulk actions and wording through the optional props. `confirmOff` makes
 * switching it off go through the confirmation card first; switching on never asks.
 */
export function AdminActiveToggle({
  entity,
  entityLabel,
  id,
  name,
  isActive,
  disabled,
  disabledTitle,
  confirmOff,
  actionOn = "active:on",
  actionOff = "active:off",
  labelOn = "فعال‌کردن",
  labelOff = "غیرفعال‌کردن",
  doneOn = `${entityLabel} فعال شد.`,
  doneOff = `${entityLabel} غیرفعال شد.`,
}: {
  entity: AdminBulkEntity;
  entityLabel: string;
  id: string;
  name: string;
  isActive: boolean;
  disabled?: boolean;
  /** Shown as the tooltip while `disabled`, so a locked row still explains itself. */
  disabledTitle?: string;
  confirmOff?: AdminActiveConfirmOff;
  actionOn?: string;
  actionOff?: string;
  labelOn?: string;
  labelOff?: string;
  doneOn?: string;
  doneOff?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [refreshing, startRefresh] = useTransition();
  const label = isActive ? labelOff : labelOn;

  async function toggle() {
    setBusy(true);
    try {
      await requestJson("/api/admin/bulk", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entity, action: isActive ? actionOff : actionOn, ids: [id] }),
      }, { fallbackMessage: "تغییر وضعیت انجام نشد." });
      toast.success(isActive ? doneOff : doneOn);
      startRefresh(() => router.refresh());
    } catch (reason) {
      toast.danger("تغییر وضعیت انجام نشد", { description: requestErrorMessage(reason, "ارتباط با سرور برقرار نشد.") });
    } finally {
      setBusy(false);
    }
  }

  const pending = busy || refreshing;

  return (
    <>
      <BpButton isIconOnly size="sm" variant="ghost" disabled={disabled} isPending={pending} title={disabled && disabledTitle ? disabledTitle : label} aria-label={`${label} ${name}`} onClick={() => { if (isActive && confirmOff) setConfirming(true); else void toggle(); }}>
        {isActive ? <ToggleRight size={15} strokeWidth={1.5} className="text-[var(--bp-success)]" /> : <ToggleLeft size={15} strokeWidth={1.5} className="bp-muted" />}
      </BpButton>
      {confirmOff && (
        <ConfirmDialog
          open={confirming}
          tone="warning"
          title={confirmOff.title}
          subtitle={confirmOff.subtitle ?? "هر زمان بخواهید می‌توانید دوباره فعالش کنید."}
          itemName={name}
          description={confirmOff.description}
          confirmLabel={confirmOff.confirmLabel ?? labelOff}
          loadingLabel="در حال غیرفعال‌سازی..."
          icon={<Power size={24} strokeWidth={1.7} />}
          confirmIcon={<Power size={15} strokeWidth={1.7} />}
          loading={pending}
          onClose={() => setConfirming(false)}
          onConfirm={() => { void toggle().then(() => setConfirming(false)); }}
        />
      )}
    </>
  );
}
