"use client";

import { Button, Modal } from "@heroui/react";
import { ChevronLeft, Menu, Store, X } from "lucide-react";
import type { EditItem, EditItemIcon } from "@/modules/page-builder/edit-items";

const itemIcons: Record<EditItemIcon, typeof Store> = { identity: Store, menu: Menu };

type Props = {
  sectionLabel: string;
  items: EditItem[];
  onSelect: (item: EditItem) => void;
  onClose: () => void;
};

/**
 * The page builder's "edit section" dialog: one row per group of settings the section has (name/logo, menu…).
 * Mount it when it should open; picking a row hands the item to `onSelect`.
 */
export function SectionEditDialog({ sectionLabel, items, onSelect, onClose }: Props) {
  return (
    // The dialog is portaled to <body>, so `data-page-builder-ui` on it keeps it clickable while the page is in edit mode.
    <Modal.Backdrop isOpen onOpenChange={(next) => { if (!next) onClose(); }} variant="blur" className="z-[150]">
      <Modal.Container size="sm" placement="center">
        <Modal.Dialog data-page-builder-ui aria-label={`ویرایش ${sectionLabel}`} dir="rtl" className="mx-4 max-w-[440px] bg-[var(--surface)] text-right">
          <Modal.Header className="flex-row items-center justify-between border-b border-[var(--border)] p-5">
            <Modal.Heading className="text-base font-bold">ویرایش {sectionLabel}</Modal.Heading>
            <Modal.CloseTrigger aria-label="بستن" className="grid size-9 place-items-center rounded-lg text-[var(--muted)]"><X size={20} /></Modal.CloseTrigger>
          </Modal.Header>
          <Modal.Body className="grid gap-1 p-3">
            {items.map((item, index) => {
              const Icon = itemIcons[item.icon];
              return (
                <div key={item.id} className={index > 0 ? "border-t border-[var(--border)] pt-1" : undefined}>
                  <Button type="button" variant="ghost" onPress={() => onSelect(item)} className="h-auto min-h-0 w-full justify-between gap-4 rounded-xl px-3 py-3 text-right font-normal hover:bg-[var(--surface-secondary)]">
                    <span className="grid size-12 shrink-0 place-items-center rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]"><Icon size={22} strokeWidth={1.6} /></span>
                    <span className="min-w-0 flex-1">
                      <strong className="block text-sm font-bold text-[var(--foreground)]">{item.title}</strong>
                      <small className="m-0 mt-1 block text-xs leading-5 text-[var(--muted)]">{item.description}</small>
                    </span>
                    <ChevronLeft size={18} className="shrink-0 text-[var(--muted)]" />
                  </Button>
                </div>
              );
            })}
          </Modal.Body>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
