"use client";

import { Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/confirm-dialog";

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
 * Confirmation before a destructive admin action: `ConfirmDialog` with the trash icon and the red
 * tone. Every delete in the panel goes through this so they all look and behave alike.
 */
export function DeleteConfirmDialog({
  open,
  title = "تأیید حذف",
  itemName,
  itemLabel,
  confirmLabel = "حذف",
  description,
  error,
  loading = false,
  onClose,
  onConfirm,
}: Props) {
  return (
    <ConfirmDialog
      open={open}
      title={title}
      subtitle="این عملیات قابل بازگشت نیست."
      itemName={itemName}
      itemLabel={itemLabel}
      description={description}
      error={error}
      loading={loading}
      confirmLabel={confirmLabel}
      loadingLabel="در حال حذف..."
      icon={<Trash2 size={24} strokeWidth={1.7} />}
      confirmIcon={<Trash2 size={15} strokeWidth={1.7} />}
      onClose={onClose}
      onConfirm={onConfirm}
    />
  );
}
