"use client";

import type { ReactNode } from "react";
import { AlertTriangle, CircleAlert } from "lucide-react";
import { AdminDialog, AdminDialogButton } from "@/components/admin/admin-dialog";

export type ConfirmDialogProps = {
  open: boolean;
  title: string;
  /** A short line under the title, e.g. that the action cannot be undone. */
  subtitle?: string;
  /** What the action is applied to; shown in a dashed card under `itemLabel`. */
  itemName?: string;
  itemLabel?: string;
  /** What will happen — the consequences the person should weigh. */
  description: string;
  error?: string;
  loading?: boolean;
  confirmLabel: string;
  loadingLabel?: string;
  /** The large icon in the medallion, and the small one on the confirm button. */
  icon: ReactNode;
  confirmIcon?: ReactNode;
  /** `danger` (red medallion, red button) for something destructive, `warning` (orange, primary button) for a reversible switch-off. */
  tone?: "danger" | "warning";
  onClose: () => void;
  onConfirm: () => void;
};

/**
 * The panel's confirmation card: a soft medallion with an icon, the title, an optional one-line
 * note, the item concerned, what will happen, and two equal buttons — confirm on the reading side,
 * cancel beside it. Its look lives in `.bp-dialog-confirm` (admin-blueprint.css); the shared dialog
 * itself is unchanged. `DeleteConfirmDialog` is this with the trash icon and red tone.
 */
export function ConfirmDialog({
  open,
  title,
  subtitle,
  itemName,
  itemLabel = "مورد انتخاب‌شده",
  description,
  error,
  loading = false,
  confirmLabel,
  loadingLabel,
  icon,
  confirmIcon,
  tone = "danger",
  onClose,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <AdminDialog
      open={open}
      ariaLabel={title}
      isBusy={loading}
      onClose={onClose}
      className={tone === "warning" ? "bp-dialog-confirm bp-dialog-confirm-warning" : "bp-dialog-confirm"}
      title={<><span className="bp-confirm-icon" aria-hidden>{icon}</span><span>{title}</span></>}
      description={subtitle}
      actions={<>
        <AdminDialogButton variant={tone === "warning" ? "primary" : "danger"} isPending={loading} onPress={onConfirm} className="bp-btn-block gap-2">{!loading && confirmIcon}{loading && loadingLabel ? loadingLabel : confirmLabel}</AdminDialogButton>
        <AdminDialogButton variant="secondary" isDisabled={loading} onPress={onClose} className="bp-btn-block">انصراف</AdminDialogButton>
      </>}
    >
      {error && (
        <p role="alert" className="bp-confirm-note bp-confirm-note-danger m-0"><CircleAlert size={15} className="mt-[3px] shrink-0" aria-hidden /><span>{error}</span></p>
      )}
      {itemName && (
        <div className="bp-confirm-item">
          <small>{itemLabel}</small>
          <strong>{itemName}</strong>
        </div>
      )}
      <p className="bp-confirm-note m-0"><AlertTriangle size={15} className="mt-[3px] shrink-0" aria-hidden /><span>{description}</span></p>
    </AdminDialog>
  );
}
