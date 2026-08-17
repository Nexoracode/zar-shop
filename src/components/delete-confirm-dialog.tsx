"use client";

import { Alert, Button, Modal, Spinner } from "@heroui/react";
import { AlertTriangle, Trash2, X } from "lucide-react";

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
    <Modal.Backdrop
      isOpen={open}
      onOpenChange={(isOpen) => {
        if (!isOpen && !loading) onClose();
      }}
      variant="blur"
      className="z-[80]"
    >
      <Modal.Container size="sm" placement="center">
        <Modal.Dialog
          aria-label={title}
          className="mx-4 w-[calc(100%-2rem)] max-w-md overflow-hidden rounded-3xl border border-rose-100 bg-white shadow-2xl"
        >
          <Modal.Header className="flex-row items-start justify-between gap-4 border-b border-slate-100 px-5 py-5 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-rose-50 text-rose-600 ring-4 ring-rose-50/60">
                <Trash2 size={22} />
              </span>
              <div className="min-w-0">
                <Modal.Heading className="text-base font-bold text-slate-900 sm:text-lg">{title}</Modal.Heading>
                <p className="mt-1 text-xs text-slate-500">این عملیات قابل بازگشت نیست.</p>
              </div>
            </div>
            <Button type="button" isIconOnly variant="ghost" isDisabled={loading} aria-label="بستن" onPress={onClose} className="size-9 min-h-9 min-w-9 shrink-0 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700">
              <X size={18} />
            </Button>
          </Modal.Header>

          <Modal.Body className="gap-4 px-5 py-5 sm:px-6">
            {error ? <Alert status="danger" className="mt-2"><Alert.Description>{error}</Alert.Description></Alert> : null}
            {itemName ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <span className="block text-[11px] font-bold text-slate-400">مورد انتخاب‌شده</span>
                <strong className="mt-1 block truncate text-sm font-bold text-slate-800">{itemName}</strong>
              </div>
            ) : null}
            <div className="mt-3 flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <p className="text-xs font-medium leading-6">{description}</p>
            </div>
          </Modal.Body>

          <Modal.Footer className="flex flex-row items-center justify-start gap-2 border-t border-slate-100 bg-slate-50/70 px-5 py-4 sm:px-6">
            <Button type="button" variant="danger" isPending={loading} onPress={onConfirm} className="min-h-11 min-w-28 gap-2 rounded-xl bg-rose-600 px-6 text-sm font-bold text-white shadow-sm hover:bg-rose-700">
              {({ isPending }) => <>{isPending ? <Spinner color="current" size="sm" /> : <Trash2 size={16} />}{isPending ? "در حال حذف..." : "حذف"}</>}
            </Button>
            <Button type="button" variant="secondary" isDisabled={loading} onPress={onClose} className="min-h-11 min-w-28 rounded-xl border border-slate-200 bg-white px-6 text-sm font-bold text-slate-600">
              انصراف
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
