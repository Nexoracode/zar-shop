"use client";

import { AlertTriangle, Trash2 } from "lucide-react";
import { AdminDialog, AdminDialogButton } from "@/components/admin/admin-dialog";

type Props = {
  open: boolean;
  title?: string;
  itemName?: string;
  description: string;
  error?: string;
  loading?: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

/**
 * Confirmation before a destructive admin action. The body is written against the theme
 * variables, so the same markup reads correctly in both admin templates.
 */
export function DeleteConfirmDialog({
  open,
  title = "تأیید حذف",
  itemName,
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
      title={<span className="flex items-center gap-2"><Trash2 size={17} className="text-[var(--danger)]" />{title}</span>}
      description="این عملیات قابل بازگشت نیست."
      actions={<>
        <AdminDialogButton variant="danger" isPending={loading} onPress={onConfirm}>{loading ? "در حال حذف..." : "حذف"}</AdminDialogButton>
        <AdminDialogButton variant="secondary" isDisabled={loading} onPress={onClose}>انصراف</AdminDialogButton>
      </>}
    >
      {error && <p className="m-0 border border-[var(--danger)] bg-[var(--danger)]/10 p-3 text-xs leading-6 text-[var(--danger)]">{error}</p>}
      {itemName && (
        <div className="border border-[var(--border)] bg-[var(--surface-secondary)] p-3">
          <span className="block text-[11px] font-bold text-[var(--muted)]">مورد انتخاب‌شده</span>
          <strong className="mt-1 block truncate text-sm">{itemName}</strong>
        </div>
      )}
      <div className="flex items-start gap-2.5 border border-[var(--warning)] bg-[var(--warning)]/10 p-3 text-[var(--warning)]">
        <AlertTriangle size={15} className="mt-0.5 shrink-0" />
        <p className="m-0 text-xs leading-6">{description}</p>
      </div>
    </AdminDialog>
  );
}
