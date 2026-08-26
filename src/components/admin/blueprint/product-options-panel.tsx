"use client";

import { useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import {
  MAX_VARIANTS,
  describeSelection,
  mergeCombinations,
  selectionSignature,
  type VariantDraft,
} from "@/modules/products/variant-combinations";
import { optionFieldLimits } from "@/modules/options/schemas";
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";
import { BpButton } from "./ui/button";
import { BpCheckbox } from "./ui/checkbox";
import { BpCombobox } from "./ui/combobox";
import { BpNumberInput } from "./ui/number-input";
import { BpSelect } from "./ui/select";
import { BpTable, BpTd, BpTh } from "./ui/table";

/**
 * A product's variants, edited in place instead of on a page of their own.
 *
 * Types and values come from the shared library, so «مشکی» on one product is the same «مشکی» on
 * the next; either can also be added from here without leaving a half-written product behind.
 * Choosing رنگ = مشکی، زرد and سایز = XL makes two rows — «مشکی، XL» and «زرد، XL» — and each
 * carries its own price, discount and stock.
 *
 * What a row may carry depends on the shop. A gold product prices a combination from its weight,
 * so it takes grams and no price; a general one takes a price and no weight. The schema refuses
 * the other pairing, so the panel only ever offers the one that applies.
 */
export type LibraryValue = { id: string; label: string; colorId: string | null; hex: string | null };
export type LibraryType = { id: string; name: string; kind: "SELECT" | "COLOR"; values: LibraryValue[] };

/** Which library types the product offers, and which of their values. */
export type ProductTypeDraft = { typeId: string; valueIds: string[] };

export type { VariantDraft };

type Props = {
  storeIndustry: "GOLD" | "GENERAL";
  colors: Array<{ id: string; name: string; hex: string }>;
  library: LibraryType[];
  optionTypes: ProductTypeDraft[];
  variants: VariantDraft[];
  onChange: (next: { optionTypes: ProductTypeDraft[]; variants: VariantDraft[] }) => void;
  onLibraryChange: (library: LibraryType[]) => void;
};

const MAX_TYPES = 5;

export function BlueprintProductOptions({ storeIndustry, colors, library, optionTypes, variants, onChange, onLibraryChange }: Props) {
  const [pickedTypeId, setPickedTypeId] = useState("");
  const [typeError, setTypeError] = useState("");
  const [newValueFor, setNewValueFor] = useState("");
  // Kept apart from `typeError`: a value belongs to a specific type's own row, so its error must
  // land under that row's fields — not on the type picker at the top of the panel.
  const [valueError, setValueError] = useState("");
  const [pending, setPending] = useState(false);

  function resetValueForm() {
    setNewValueFor("");
    setValueError("");
  }

  const [deletingValue, setDeletingValue] = useState<{ typeId: string; id: string; label: string } | null>(null);
  const [deletingValuePending, setDeletingValuePending] = useState(false);
  const [deletingValueError, setDeletingValueError] = useState("");

  const libraryById = new Map(library.map((type) => [type.id, type]));

  /** The chosen types as names and labels, which is the shape combinations are built from. */
  function asSelectedTypes(next: ProductTypeDraft[]) {
    return next.flatMap((chosen) => {
      const type = libraryById.get(chosen.typeId);
      if (!type) return [];
      const labels = new Map(type.values.map((value) => [value.id, value.label]));
      return [{ typeName: type.name, values: chosen.valueIds.flatMap((id) => (labels.has(id) ? [labels.get(id)!] : [])) }];
    });
  }

  /** Every change to the types rebuilds the rows, keeping the figures already entered. */
  function applyTypes(next: ProductTypeDraft[]) {
    onChange({ optionTypes: next, variants: mergeCombinations(variants, asSelectedTypes(next)) });
  }

  function addType() {
    if (!pickedTypeId) return setTypeError("یک نوع تنوع انتخاب کنید.");
    if (optionTypes.some((chosen) => chosen.typeId === pickedTypeId)) return setTypeError("این نوع از قبل به محصول اضافه شده است.");
    if (optionTypes.length >= MAX_TYPES) return setTypeError(`حداکثر ${MAX_TYPES.toLocaleString("fa-IR")} نوع تنوع برای هر محصول مجاز است.`);
    applyTypes([...optionTypes, { typeId: pickedTypeId, valueIds: [] }]);
    setPickedTypeId("");
    setTypeError("");
  }

  function toggleValue(typeId: string, valueId: string) {
    applyTypes(optionTypes.map((chosen) => (chosen.typeId === typeId
      ? { ...chosen, valueIds: chosen.valueIds.includes(valueId) ? chosen.valueIds.filter((id) => id !== valueId) : [...chosen.valueIds, valueId] }
      : chosen)));
  }

  function updateVariant(signature: string, patch: Partial<VariantDraft>) {
    onChange({
      optionTypes,
      variants: variants.map((variant) => (selectionSignature(variant.selection) === signature ? { ...variant, ...patch } : variant)),
    });
  }

  /* A new type is written to the library straight away — a product that is still a draft cannot
   * hold one, and the same word typed on the next product must find it already there. Typed from
   * the type picker itself, so it always starts as a plain list; a colour-linked type still comes
   * from the library page, where its values point at the colour library on creation. */
  async function createTypeFromQuery(query: string) {
    const name = query.trim();
    if (!name || pending) return;
    if (optionTypes.length >= MAX_TYPES) return setTypeError(`حداکثر ${MAX_TYPES.toLocaleString("fa-IR")} نوع تنوع برای هر محصول مجاز است.`);
    setPending(true);
    setTypeError("");
    try {
      const response = await fetch("/api/option-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, kind: "SELECT", values: [] }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.message ?? "ثبت نوع تنوع انجام نشد.");
      const created: LibraryType = { id: result.id, name: result.name, kind: result.kind, values: [] };
      onLibraryChange([...library, created]);
      // Written to the product in the same step, matching the quick-add value flow below.
      onChange({ optionTypes: [...optionTypes, { typeId: created.id, valueIds: [] }], variants });
      setPickedTypeId("");
    } catch (reason) {
      setTypeError(reason instanceof Error ? reason.message : "ثبت نوع تنوع انجام نشد.");
    } finally {
      setPending(false);
    }
  }

  /** A color-kind value takes its label from the color's own name — nothing left for the admin to
   * type — so this is reached either from a picked color or from free-typed text for a plain
   * list, never from both a label and a color entered separately. */
  async function createValueQuick(typeId: string, label: string, colorId: string | null) {
    const trimmed = label.trim();
    if (!trimmed || pending) return;
    setPending(true);
    setValueError("");
    try {
      const response = await fetch("/api/option-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ typeId, label: trimmed, colorId }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.message ?? "ثبت مقدار انجام نشد.");
      const value: LibraryValue = { id: result.id, label: result.label, colorId: result.colorId, hex: result.color?.hex ?? null };
      onLibraryChange(library.map((item) => (item.id === typeId ? { ...item, values: [...item.values, value] } : item)));
      // The value is added to the library and picked in one go, which is what the admin meant.
      const nextTypes = optionTypes.map((chosen) => (chosen.typeId === typeId ? { ...chosen, valueIds: [...chosen.valueIds, value.id] } : chosen));
      const withValue = library.map((item) => (item.id === typeId ? { ...item, values: [...item.values, value] } : item));
      const labelsByType = new Map(withValue.map((item) => [item.id, new Map(item.values.map((entry) => [entry.id, entry.label]))]));
      onChange({
        optionTypes: nextTypes,
        variants: mergeCombinations(variants, nextTypes.flatMap((chosen) => {
          const item = withValue.find((entry) => entry.id === chosen.typeId);
          if (!item) return [];
          const labels = labelsByType.get(chosen.typeId)!;
          return [{ typeName: item.name, values: chosen.valueIds.flatMap((id) => (labels.has(id) ? [labels.get(id)!] : [])) }];
        })),
      });
      resetValueForm();
    } catch (reason) {
      setValueError(reason instanceof Error ? reason.message : "ثبت مقدار انجام نشد.");
    } finally {
      setPending(false);
    }
  }

  /** Removes a value from the shared library — and, by the same cascade the type-edit page relies
   * on, from every product that had it picked, including this one's own selection and rows. */
  async function confirmDeleteValue() {
    if (!deletingValue || deletingValuePending) return;
    setDeletingValuePending(true);
    setDeletingValueError("");
    try {
      const response = await fetch(`/api/option-types/values/${deletingValue.id}`, { method: "DELETE" });
      if (!response.ok) {
        const result = response.status === 204 ? null : await response.json().catch(() => null);
        throw new Error(result?.message ?? "حذف مقدار انجام نشد.");
      }
      const nextLibrary = library.map((item) => (item.id === deletingValue.typeId ? { ...item, values: item.values.filter((entry) => entry.id !== deletingValue.id) } : item));
      onLibraryChange(nextLibrary);
      const nextTypes = optionTypes.map((chosen) => (chosen.typeId === deletingValue.typeId ? { ...chosen, valueIds: chosen.valueIds.filter((id) => id !== deletingValue.id) } : chosen));
      const labelsByType = new Map(nextLibrary.map((item) => [item.id, new Map(item.values.map((entry) => [entry.id, entry.label]))]));
      onChange({
        optionTypes: nextTypes,
        variants: mergeCombinations(variants, nextTypes.flatMap((chosen) => {
          const item = nextLibrary.find((entry) => entry.id === chosen.typeId);
          if (!item) return [];
          const labels = labelsByType.get(chosen.typeId)!;
          return [{ typeName: item.name, values: chosen.valueIds.flatMap((id) => (labels.has(id) ? [labels.get(id)!] : [])) }];
        })),
      });
      setDeletingValue(null);
    } catch (reason) {
      setDeletingValueError(reason instanceof Error ? reason.message : "حذف مقدار انجام نشد.");
    } finally {
      setDeletingValuePending(false);
    }
  }

  const typeOrder = optionTypes.flatMap((chosen) => (libraryById.has(chosen.typeId) ? [libraryById.get(chosen.typeId)!.name] : []));
  const availableTypes = library.filter((type) => !optionTypes.some((chosen) => chosen.typeId === type.id));

  return (
    <>
    <div className="grid gap-3">
      <div className="flex flex-wrap items-end gap-2">
        <BpCombobox
          label="نوع تنوع"
          value={pickedTypeId}
          error={typeError || undefined}
          placeholder="از فهرست انتخاب کنید یا نام نوع جدید را بنویسید"
          emptyLabel="نوعی با این نام پیدا نشد"
          options={availableTypes.map((type) => ({ value: type.id, label: type.name }))}
          className="bp-input-sm"
          wrapperClassName="w-[min(100%,340px)]"
          onChange={(value) => { setPickedTypeId(value); setTypeError(""); }}
          onCreate={(query) => void createTypeFromQuery(query)}
          pending={pending}
        />
        <BpButton variant="primary" className="field-action gap-1.5" onClick={addType}><Plus size={15} />افزودن به محصول</BpButton>
      </div>

      {optionTypes.length === 0 ? (
        <p className="bp-muted m-0 rounded-[var(--bp-radius)] border border-dashed border-[var(--bp-divider)] p-4 text-center text-[12px]">
          این محصول تنوعی ندارد. اگر در چند سایز یا رنگ عرضه می‌شود، نوع آن را از بالا اضافه کنید.
        </p>
      ) : (
        <div className="grid gap-2">
          {optionTypes.map((chosen) => {
            const type = libraryById.get(chosen.typeId);
            if (!type) return null;
            return (
              <div key={chosen.typeId} className="grid gap-2 rounded-[var(--bp-radius)] border border-[var(--bp-divider)] px-3 py-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <strong className="text-[13px]">{type.name}</strong>
                  <span className="bp-tag bp-tag-neutral">{type.kind === "COLOR" ? "رنگ" : "فهرست ساده"}</span>
                  <span className="bp-muted text-[11px]">{chosen.valueIds.length.toLocaleString("fa-IR")} مقدار انتخاب‌شده</span>
                  <BpButton isIconOnly variant="ghost" aria-label={`حذف نوع ${type.name}`} className="ms-auto text-[var(--bp-danger)]" onClick={() => applyTypes(optionTypes.filter((item) => item.typeId !== chosen.typeId))}>
                    <Trash2 size={15} />
                  </BpButton>
                </div>

                <div className="flex flex-wrap items-start gap-1.5">
                  {type.values.map((value) => {
                    const picked = chosen.valueIds.includes(value.id);
                    return (
                      <span
                        key={value.id}
                        className={`inline-flex items-center gap-1 rounded-[var(--bp-radius)] border ps-2.5 pe-1 py-1 text-[12px] ${picked ? "border-[var(--bp-accent)] text-[var(--bp-accent)]" : "border-[var(--bp-divider)] text-[var(--bp-muted)]"}`}
                      >
                        <button type="button" aria-pressed={picked} onClick={() => toggleValue(chosen.typeId, value.id)} className="inline-flex items-center gap-1.5">
                          {value.hex ? <span aria-hidden className="h-3 w-3 rounded-full border border-[var(--bp-divider)]" style={{ background: value.hex }} /> : null}
                          {value.label}
                        </button>
                        <button
                          type="button"
                          aria-label={`حذف مقدار ${value.label} از کتابخانه تنوع‌ها`}
                          title="حذف از کتابخانه"
                          onClick={() => { setDeletingValueError(""); setDeletingValue({ typeId: chosen.typeId, id: value.id, label: value.label }); }}
                          className="grid h-4 w-4 place-items-center rounded-full text-[var(--bp-muted)] hover:text-[var(--bp-danger)]"
                        >
                          <X size={11} />
                        </button>
                      </span>
                    );
                  })}
                  {type.values.length === 0 && newValueFor !== chosen.typeId ? <span className="bp-muted text-[12px]">این نوع هنوز مقداری ندارد.</span> : null}

                  {newValueFor === chosen.typeId ? (
                    <div className="flex items-start gap-1">
                      {type.kind === "COLOR" ? (
                        <BpCombobox
                          aria-label="جستجو یا انتخاب رنگ برای مقدار جدید"
                          value=""
                          error={valueError || undefined}
                          placeholder="جستجو یا انتخاب رنگ"
                          emptyLabel="رنگی با این نام پیدا نشد"
                          options={colors.filter((color) => !type.values.some((value) => value.colorId === color.id)).map((color) => ({ value: color.id, label: color.name, color: color.hex }))}
                          className="bp-input-sm"
                          wrapperClassName="w-[190px]"
                          pending={pending}
                          onChange={(colorId) => {
                            const color = colors.find((item) => item.id === colorId);
                            if (color) void createValueQuick(chosen.typeId, color.name, color.id);
                          }}
                        />
                      ) : (
                        <BpCombobox
                          aria-label="نام مقدار جدید"
                          value=""
                          error={valueError || undefined}
                          placeholder="نام مقدار را بنویسید"
                          emptyLabel="برای افزودن، نام را تایپ کنید"
                          options={[]}
                          maxLength={optionFieldLimits.valueLabel}
                          className="bp-input-sm"
                          wrapperClassName="w-[190px]"
                          pending={pending}
                          onChange={() => {}}
                          onCreate={(query) => void createValueQuick(chosen.typeId, query, null)}
                        />
                      )}
                      <BpButton isIconOnly size="sm" variant="ghost" aria-label="انصراف از افزودن مقدار" disabled={pending} onClick={resetValueForm}>
                        <X size={14} />
                      </BpButton>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => { setNewValueFor(chosen.typeId); setValueError(""); }}
                      className="inline-flex items-center gap-1.5 rounded-[var(--bp-radius)] border border-dashed border-[var(--bp-accent)] px-2.5 py-1 text-[12px] text-[var(--bp-accent)] hover:bg-[var(--bp-hover)]"
                    >
                      <Plus size={13} />اضافه کردن
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {variants.length > 0 && (
        <div className="grid gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <strong className="text-[13px]">ترکیب‌های این محصول</strong>
            <span className="bp-muted text-[11px]">{variants.length.toLocaleString("fa-IR")} از {MAX_VARIANTS.toLocaleString("fa-IR")}</span>
          </div>
          <BpTable ariaLabel="ترکیب‌های تنوع محصول" minWidth={760}>
            <thead>
              <tr>
                <BpTh>ترکیب</BpTh>
                <BpTh>{storeIndustry === "GOLD" ? "وزن (گرم)" : "قیمت (ریال)"}</BpTh>
                <BpTh>تخفیف</BpTh>
                <BpTh>موجودی</BpTh>
                <BpTh>فعال</BpTh>
                <BpTh>حذف</BpTh>
              </tr>
            </thead>
            <tbody>
              {variants.map((variant) => {
                const signature = selectionSignature(variant.selection);
                const label = describeSelection(variant.selection, typeOrder);
                return (
                  <tr key={signature}>
                    <BpTd>{label}</BpTd>
                    <BpTd>
                      {storeIndustry === "GOLD" ? (
                        <BpNumberInput
                          aria-label={`وزن ترکیب ${label}`}
                          allowDecimal
                          value={variant.weightGrams ?? ""}
                          reserveMessage={false}
                          wrapperClassName="w-[min(100%,140px)]"
                          onValueChange={(next) => updateVariant(signature, { weightGrams: next || null })}
                        />
                      ) : (
                        <BpNumberInput
                          aria-label={`قیمت ترکیب ${label}`}
                          isPrice
                          value={variant.price ?? ""}
                          reserveMessage={false}
                          wrapperClassName="w-[min(100%,190px)]"
                          onValueChange={(next) => updateVariant(signature, { price: next || null })}
                        />
                      )}
                    </BpTd>
                    <BpTd>
                      <div className="flex flex-wrap items-end gap-1.5">
                        <BpSelect
                          aria-label={`نوع تخفیف ترکیب ${label}`}
                          value={variant.discountType ?? ""}
                          placeholder="بدون تخفیف"
                          reserveMessage={false}
                          options={[{ value: "PERCENT", label: "درصدی" }, { value: "FIXED", label: "مبلغ ثابت" }]}
                          wrapperClassName="w-[min(100%,130px)]"
                          onChange={(event) => {
                            const next = event.target.value as "PERCENT" | "FIXED" | "";
                            updateVariant(signature, { discountType: next || null, ...(next ? {} : { discountValue: null }) });
                          }}
                        />
                        <BpNumberInput
                          aria-label={`مقدار تخفیف ترکیب ${label}`}
                          isPrice={variant.discountType === "FIXED"}
                          value={variant.discountValue ?? ""}
                          disabled={!variant.discountType}
                          reserveMessage={false}
                          wrapperClassName="w-[min(100%,140px)]"
                          onValueChange={(next) => updateVariant(signature, { discountValue: next || null })}
                        />
                      </div>
                    </BpTd>
                    <BpTd>
                      <BpNumberInput
                        aria-label={`موجودی ترکیب ${label}`}
                        value={String(variant.stock)}
                        reserveMessage={false}
                        wrapperClassName="w-[min(100%,110px)]"
                        onValueChange={(next) => updateVariant(signature, { stock: next === "" ? 0 : Number(next) })}
                      />
                    </BpTd>
                    <BpTd>
                      <BpCheckbox isSelected={variant.isActive} label={`فعال بودن ترکیب ${label}`} onChange={() => updateVariant(signature, { isActive: !variant.isActive })} />
                    </BpTd>
                    <BpTd>
                      <BpButton
                        isIconOnly
                        variant="ghost"
                        aria-label={`حذف ترکیب ${label}`}
                        className="text-[var(--bp-danger)]"
                        onClick={() => onChange({ optionTypes, variants: variants.filter((item) => selectionSignature(item.selection) !== signature) })}
                      >
                        <Trash2 size={15} />
                      </BpButton>
                    </BpTd>
                  </tr>
                );
              })}
            </tbody>
          </BpTable>
        </div>
      )}
    </div>

    <DeleteConfirmDialog
      open={deletingValue !== null}
      itemName={deletingValue?.label}
      description="این مقدار از کتابخانه تنوع‌ها حذف می‌شود و از هر محصولی که استفاده‌اش کرده نیز برداشته خواهد شد."
      error={deletingValueError}
      loading={deletingValuePending}
      onClose={() => { if (!deletingValuePending) setDeletingValue(null); }}
      onConfirm={() => void confirmDeleteValue()}
    />
    </>
  );
}
