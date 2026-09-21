"use client";

import { useState } from "react";
import { Button, Modal, Spinner } from "@heroui/react";
import { ArrowRight, Check, X } from "lucide-react";
import { ProductListLayoutThumb } from "@/components/product-list-layout-thumbs";
import { brandPrimaryButtonStyle } from "@/components/page-builder-styles";
import { productListLayoutMeta, productListLayouts, type ProductListLayout } from "@/modules/page-builder/product-lists";

/**
 * "Add a product list": the picker of the list's look — eight layouts drawn as small wireframes, one selected. The
 * back arrow returns to the choice of what to add, the X closes the builder's dialogs. Confirming hands the chosen
 * layout to `onConfirm`, which does the (async) adding; `saving` keeps the dialog busy meanwhile.
 */
export function ProductListLayoutPicker({ saving, onConfirm, onBack, onClose }: { saving: boolean; onConfirm: (layout: ProductListLayout) => void; onBack: () => void; onClose: () => void }) {
  const [selected, setSelected] = useState<ProductListLayout>(productListLayouts[0]);

  return (
    <Modal.Backdrop isOpen onOpenChange={(next) => { if (!next && !saving) onClose(); }} variant="blur" className="z-[150]">
      <Modal.Container size="md" placement="center">
        <Modal.Dialog data-page-builder-ui aria-label="افزودن لیست محصولات" dir="rtl" className="mx-4 max-w-[580px] bg-[var(--surface)] text-right">
          <Modal.Header className="flex-row items-center justify-between border-b border-[var(--border)] p-5">
            <div className="flex min-w-0 items-center gap-3">
              <Button type="button" isIconOnly variant="ghost" isDisabled={saving} aria-label="بازگشت" onPress={onBack} className="size-9 min-h-9 min-w-9 text-[var(--muted)]"><ArrowRight size={20} /></Button>
              <Modal.Heading className="text-base font-bold">افزودن لیست محصولات</Modal.Heading>
            </div>
            <Modal.CloseTrigger aria-label="بستن" className="grid size-9 place-items-center rounded-lg text-[var(--muted)]"><X size={20} /></Modal.CloseTrigger>
          </Modal.Header>
          <Modal.Body className="max-h-[62vh] overflow-y-auto p-5">
            <div role="group" aria-label="ظاهر لیست محصولات" className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {productListLayouts.map((layout) => {
                const isSelected = layout === selected;
                return (
                  <Button
                    key={layout}
                    type="button"
                    variant="ghost"
                    aria-pressed={isSelected}
                    aria-label={productListLayoutMeta[layout].label}
                    isDisabled={saving}
                    onPress={() => setSelected(layout)}
                    className={`relative block h-auto min-h-0 w-full rounded-2xl p-3 text-right ${isSelected ? "bg-[#9aa1ac] hover:bg-[#9aa1ac]" : "bg-[#eceef1] hover:bg-[#e2e5ea]"}`}
                  >
                    {isSelected && <span className="absolute right-2 top-2 grid size-6 place-items-center rounded-full bg-[var(--pb-accent)] text-white"><Check size={14} strokeWidth={3} /></span>}
                    <ProductListLayoutThumb layout={layout} />
                  </Button>
                );
              })}
            </div>
          </Modal.Body>
          <Modal.Footer className="justify-start gap-3 border-t border-[var(--border)] p-5">
            <Button type="button" variant="primary" isPending={saving} onPress={() => onConfirm(selected)} className="min-h-11 min-w-24 rounded-xl px-6 text-sm font-bold" style={brandPrimaryButtonStyle}>
              {({ isPending }) => <>{isPending && <Spinner color="current" size="sm" />}تأیید</>}
            </Button>
            <Button type="button" variant="outline" isDisabled={saving} onPress={onClose} className="min-h-11 rounded-xl px-6 text-sm font-bold">انصراف</Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
