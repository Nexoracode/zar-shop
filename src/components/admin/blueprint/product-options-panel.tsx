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
import { BpButton } from "./ui/button";
import { BpCheckbox } from "./ui/checkbox";
import { BpCombobox } from "./ui/combobox";
import { BpInput } from "./ui/input";
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
  colors: Array<{ id: string; name: string }>;
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
  const [creatingType, setCreatingType] = useState(false);
  const [newTypeName, setNewTypeName] = useState("");
  const [newTypeKind, setNewTypeKind] = useState<"SELECT" | "COLOR">("SELECT");
  const [newValueFor, setNewValueFor] = useState("");
  const [newValueLabel, setNewValueLabel] = useState("");
  const [newValueColorId, setNewValueColorId] = useState("");
  const [pending, setPending] = useState(false);

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

  /* A new type or value is written to the library straight away — a product that is still a draft
   * cannot hold one, and the same word typed on the next product must find it already there. */
  async function createType() {
    const name = newTypeName.trim();
    if (!name || pending) return;
    setPending(true);
    setTypeError("");
    try {
      const response = await fetch("/api/option-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, kind: newTypeKind, values: [] }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.message ?? "ثبت نوع تنوع انجام نشد.");
      const created: LibraryType = { id: result.id, name: result.name, kind: result.kind, values: [] };
      onLibraryChange([...library, created]);
      onChange({ optionTypes: [...optionTypes, { typeId: created.id, valueIds: [] }], variants });
      setNewTypeName("");
      setNewTypeKind("SELECT");
      setCreatingType(false);
    } catch (reason) {
      setTypeError(reason instanceof Error ? reason.message : "ثبت نوع تنوع انجام نشد.");
    } finally {
      setPending(false);
    }
  }

  async function createValue(typeId: string) {
    const label = newValueLabel.trim();
    const type = libraryById.get(typeId);
    if (!label || !type || pending) return;
    if (type.kind === "COLOR" && !newValueColorId) return setTypeError("برای مقدارِ نوع رنگ، خود رنگ را انتخاب کنید.");
    setPending(true);
    setTypeError("");
    try {
      const response = await fetch("/api/option-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ typeId, label, colorId: type.kind === "COLOR" ? newValueColorId : null }),
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
      setNewValueLabel("");
      setNewValueColorId("");
      setNewValueFor("");
    } catch (reason) {
      setTypeError(reason instanceof Error ? reason.message : "ثبت مقدار انجام نشد.");
    } finally {
      setPending(false);
    }
  }

  const typeOrder = optionTypes.flatMap((chosen) => (libraryById.has(chosen.typeId) ? [libraryById.get(chosen.typeId)!.name] : []));
  const availableTypes = library.filter((type) => !optionTypes.some((chosen) => chosen.typeId === type.id));

  return (
    <div className="grid gap-3">
      {creatingType ? (
        <div className="flex flex-wrap items-end gap-2">
          <BpInput
            label="نام نوع جدید"
            value={newTypeName}
            maxLength={optionFieldLimits.typeName}
            placeholder="مثلاً سایز"
            wrapperClassName="w-[min(100%,220px)]"
            onChange={(event) => { setNewTypeName(event.target.value); setTypeError(""); }}
          />
          <BpSelect
            label="نوع"
            value={newTypeKind}
            disabled={!newTypeName.trim()}
            hint="تا نام وارد نشود قابل انتخاب نیست."
            options={[{ value: "SELECT", label: "فهرست ساده" }, { value: "COLOR", label: "رنگ" }]}
            wrapperClassName="w-[min(100%,180px)]"
            onChange={(event) => setNewTypeKind(event.target.value as "SELECT" | "COLOR")}
          />
          <BpButton variant="primary" className="field-action gap-1.5" isPending={pending} disabled={!newTypeName.trim()} onClick={() => void createType()}>
            <Plus size={15} />ثبت نوع
          </BpButton>
          <BpButton variant="ghost" className="field-action gap-1.5" onClick={() => { setCreatingType(false); setTypeError(""); }}>
            <X size={15} />انصراف
          </BpButton>
        </div>
      ) : (
        <div className="flex flex-wrap items-end gap-2">
          <BpCombobox
            label="نوع تنوع"
            value={pickedTypeId}
            error={typeError || undefined}
            placeholder="از فهرست انتخاب کنید"
            emptyLabel="نوعی برای افزودن نمانده است"
            options={availableTypes.map((type) => ({ value: type.id, label: type.name }))}
            wrapperClassName="w-[min(100%,240px)]"
            onChange={(value) => { setPickedTypeId(value); setTypeError(""); }}
          />
          <BpButton variant="primary" className="field-action gap-1.5" onClick={addType}><Plus size={15} />افزودن به محصول</BpButton>
          <BpButton variant="ghost" className="field-action gap-1.5" onClick={() => { setCreatingType(true); setTypeError(""); }}>
            <Plus size={15} />نوع جدید
          </BpButton>
        </div>
      )}

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

                <div className="flex flex-wrap items-center gap-1.5">
                  {type.values.map((value) => {
                    const picked = chosen.valueIds.includes(value.id);
                    return (
                      <button
                        key={value.id}
                        type="button"
                        aria-pressed={picked}
                        onClick={() => toggleValue(chosen.typeId, value.id)}
                        className={`inline-flex items-center gap-1.5 rounded-[var(--bp-radius)] border px-2.5 py-1 text-[12px] ${picked ? "border-[var(--bp-accent)] text-[var(--bp-accent)]" : "border-[var(--bp-divider)] text-[var(--bp-muted)]"}`}
                      >
                        {value.hex ? <span aria-hidden className="h-3 w-3 rounded-full border border-[var(--bp-divider)]" style={{ background: value.hex }} /> : null}
                        {value.label}
                      </button>
                    );
                  })}
                  {type.values.length === 0 ? <span className="bp-muted text-[12px]">این نوع هنوز مقداری ندارد.</span> : null}
                </div>

                {newValueFor === chosen.typeId ? (
                  <div className="flex flex-wrap items-end gap-2">
                    <BpInput
                      label="مقدار جدید"
                      value={newValueLabel}
                      maxLength={optionFieldLimits.valueLabel}
                      placeholder="مثلاً مشکی"
                      wrapperClassName="w-[min(100%,180px)]"
                      onChange={(event) => { setNewValueLabel(event.target.value); setTypeError(""); }}
                    />
                    {type.kind === "COLOR" && (
                      <BpSelect
                        label="رنگ"
                        value={newValueColorId}
                        placeholder="انتخاب رنگ"
                        options={colors.map((color) => ({ value: color.id, label: color.name }))}
                        wrapperClassName="w-[min(100%,180px)]"
                        onChange={(event) => setNewValueColorId(event.target.value)}
                      />
                    )}
                    <BpButton variant="primary" className="field-action gap-1.5" isPending={pending} disabled={!newValueLabel.trim()} onClick={() => void createValue(chosen.typeId)}>
                      <Plus size={15} />ثبت مقدار
                    </BpButton>
                    <BpButton variant="ghost" className="field-action gap-1.5" onClick={() => { setNewValueFor(""); setNewValueLabel(""); setNewValueColorId(""); }}>
                      <X size={15} />انصراف
                    </BpButton>
                  </div>
                ) : (
                  <BpButton variant="ghost" className="w-fit gap-1.5" onClick={() => { setNewValueFor(chosen.typeId); setNewValueLabel(""); setNewValueColorId(""); }}>
                    <Plus size={15} />مقدار جدید
                  </BpButton>
                )}
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
  );
}
