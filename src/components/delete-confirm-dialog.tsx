"use client";

import { AlertTriangle, CircleAlert, Trash2 } from "lucide-react";
import { AdminDialog, AdminDialogButton } from "@/components/admin/admin-dialog";

type Props = {
  open: boolean;
  title?: string;
  itemName?: string;
  /** The small caption above `itemName`; "موارد انتخاب‌شده" reads better for a bulk delete. */
  itemLabel?: string;
  /** The delete button's text — "حذف فایل", "حذف درگاه"… */
  confirmLabel?: string;
  description: string;
  error?: string;
  loading?: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

/**
 * Confirmation before a destructive admin action. A centred card: a soft red medallion with the
 * trash icon, the title, the item being deleted, what will be lost, and two equal buttons — delete
 * (on the reading side) and cancel. Its look lives in `.bp-dialog-confirm` (admin-blueprint.css); the
 * shared dialog itself is unchanged.
 */
export function DeleteConfirmDialog({
  open,
  title = "تأیید حذف",
  itemName,
  itemLabel = "مورد انتخاب‌شده",
  confirmLabel = "حذف",
  description,
  error,
  loading = false,
  onClose,
  onConfirm,
}: Props) {
  return (
    <AdminDialog
      open={open}
      ariaLabel={title}
      isBusy={loading}
      onClose={onClose}
      className="bp-dialog-confirm"
      title={<><span className="bp-confirm-icon" aria-hidden><Trash2 size={24} strokeWidth={1.7} /></span><span>{title}</span></>}
      description="این عملیات قابل بازگشت نیست."
      actions={<>
        <AdminDialogButton variant="danger" isPending={loading} onPress={onConfirm} className="bp-btn-block gap-2">{!loading && <Trash2 size={15} strokeWidth={1.7} />}{loading ? "در حال حذف..." : confirmLabel}</AdminDialogButton>
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
