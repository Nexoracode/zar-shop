"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { Button, Modal } from "@heroui/react";
import { SlidersHorizontal, X } from "lucide-react";

type Props = { activeCount: number; resetHref: string; children: ReactNode };

/** Mobile-only "فیلترها" trigger + bottom sheet, so filters no longer push the product grid
 * below the fold on small screens the way the always-expanded panel used to. */
export function StorefrontCatalogFiltersMobile({ activeCount, resetHref, children }: Props) {
  const [open, setOpen] = useState(false);

  return <>
    <Button type="button" variant="secondary" onPress={() => setOpen(true)} className="min-h-11 w-full justify-center gap-2 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-700">
      <SlidersHorizontal size={17} />فیلترها
      {activeCount > 0 && <span className="grid size-5 place-items-center rounded-full bg-[var(--brand-primary)] text-[10px] font-bold text-[var(--brand-primary-foreground)]">{activeCount.toLocaleString("fa-IR")}</span>}
    </Button>
    <Modal.Backdrop isOpen={open} onOpenChange={setOpen} variant="blur">
      <Modal.Container placement="bottom" size="full">
        <Modal.Dialog aria-label="فیلتر محصولات" dir="rtl" className="mx-0 flex max-h-[88dvh] w-full max-w-none flex-col rounded-b-none rounded-t-2xl border-t border-[var(--border)] bg-[var(--surface)] shadow-2xl">
          <Modal.Header className="flex-row items-center border-b border-[var(--border)] px-4 py-3">
            <Modal.Heading className="text-base font-bold text-[var(--foreground)]">فیلترها</Modal.Heading>
            <div className="mr-auto flex items-center gap-3">
              {activeCount > 0 && <Link href={resetHref} scroll={false} onClick={() => setOpen(false)} className="text-[11px] font-bold text-[var(--brand-primary)]">حذف فیلترها</Link>}
              <Modal.CloseTrigger aria-label="بستن فیلترها" className="grid size-8 place-items-center rounded-lg text-[var(--muted)] transition hover:bg-[var(--surface-secondary)] hover:text-[var(--foreground)]"><X size={18} /></Modal.CloseTrigger>
            </div>
          </Modal.Header>
          <Modal.Body className="overflow-y-auto p-4">{children}</Modal.Body>
          <Modal.Footer className="border-t border-[var(--border)] bg-[var(--surface)] px-4 py-3">
            <Button type="button" variant="primary" fullWidth onPress={() => setOpen(false)} className="min-h-11 justify-center rounded-lg bg-[var(--brand-primary)] text-sm font-bold text-[var(--brand-primary-foreground)]">مشاهده نتایج</Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  </>;
}
