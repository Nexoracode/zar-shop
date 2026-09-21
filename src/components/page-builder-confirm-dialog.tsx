"use client";

import type { ReactNode } from "react";
import { Button, Modal } from "@heroui/react";
import { TriangleAlert, X } from "lucide-react";

/**
 * The page builder's confirmation before something that cannot be undone once saved (removing a section, deleting
 * a banner). Mount it when it should open; the confirm button leads, on the reading side.
 */
export function PageBuilderConfirmDialog({ title, confirmLabel, onConfirm, onClose, children }: { title: string; confirmLabel: string; onConfirm: () => void; onClose: () => void; children: ReactNode }) {
  return (
    // The dialog is portaled to <body>, so `data-page-builder-ui` on it keeps it clickable while the page is in edit mode.
    <Modal.Backdrop isOpen onOpenChange={(next) => { if (!next) onClose(); }} variant="blur" className="z-[150]">
      <Modal.Container size="sm" placement="center">
        <Modal.Dialog data-page-builder-ui aria-label={title} dir="rtl" className="p-0 mx-4 max-w-md bg-[var(--surface)] text-right">
          <Modal.Header className="flex-row items-center justify-between border-b border-[var(--border)] p-5">
            <Modal.Heading className="flex items-center gap-2 text-base font-bold"><TriangleAlert size={20} className="text-[var(--danger)]" />{title}</Modal.Heading>
            <Modal.CloseTrigger aria-label="بستن" className="static grid size-9 place-items-center rounded-lg"><X size={18} /></Modal.CloseTrigger>
          </Modal.Header>
          <Modal.Body className="m-0 p-5 text-sm leading-7 text-[var(--muted)]">{children}</Modal.Body>
          <Modal.Footer className="m-0 justify-start gap-2 border-t border-[var(--border)] p-4">
            <Button type="button" variant="danger" onPress={onConfirm}>{confirmLabel}</Button>
            <Button type="button" variant="secondary" onPress={onClose}>انصراف</Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
