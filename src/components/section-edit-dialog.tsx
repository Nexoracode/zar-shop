"use client";

import type { ReactNode } from "react";
import { Button, Modal } from "@heroui/react";
import { ChevronLeft, ImageIcon, LayoutList, Menu, Plus, Store, X } from "lucide-react";
import type { EditItem, EditItemIcon } from "@/modules/page-builder/edit-items";

const itemIcons: Record<EditItemIcon, typeof Store> = { identity: Store, menu: Menu, image: ImageIcon, list: LayoutList };

type Props = {
  title: string;
  items: EditItem[];
  /** Shown instead of the list while there are no items. */
  emptyMessage?: ReactNode;
  /** An action under the list (e.g. "add a banner"). */
  footerAction?: { label: string; disabled?: boolean; onPress: () => void };
  onSelect: (item: EditItem) => void;
  onClose: () => void;
};

/**
 * The page builder's "edit section" dialog: one row per thing the section has to edit (name/logo, menu, each
 * banner…), plus an optional action under the list. Mount it when it should open; picking a row hands the item to
 * `onSelect`.
 */
export function SectionEditDialog({ title, items, emptyMessage, footerAction, onSelect, onClose }: Props) {
  return (
    // The dialog is portaled to <body>, so `data-page-builder-ui` on it keeps it clickable while the page is in edit mode.
    <Modal.Backdrop isOpen onOpenChange={(next) => { if (!next) onClose(); }} variant="blur" className="z-[150]">
      <Modal.Container size="sm" placement="center">
        <Modal.Dialog data-page-builder-ui aria-label={title} dir="rtl" className="p-0 mx-4 max-w-[440px] bg-[var(--surface)] text-right">
          <Modal.Header className="flex-row items-center justify-between border-b border-[var(--border)] p-5">
            <Modal.Heading className="text-base font-bold">{title}</Modal.Heading>
            <Modal.CloseTrigger aria-label="بستن" className="static grid size-9 place-items-center rounded-lg text-[var(--muted)]"><X size={20} /></Modal.CloseTrigger>
          </Modal.Header>
          <Modal.Body className="m-0 grid max-h-[60vh] gap-1 overflow-y-auto p-3">
            {items.length === 0 && emptyMessage && <p className="m-0 p-5 text-center text-sm leading-7 text-[var(--muted)]">{emptyMessage}</p>}
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
          {footerAction && (
            <Modal.Footer className="m-0 justify-start border-t border-[var(--border)] p-3">
              <Button type="button" variant="ghost" isDisabled={footerAction.disabled} onPress={footerAction.onPress} className="min-h-11 gap-2 rounded-xl px-4 text-sm font-bold text-[var(--brand-primary)]"><Plus size={18} />{footerAction.label}</Button>
            </Modal.Footer>
          )}
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
