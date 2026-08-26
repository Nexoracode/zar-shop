"use client";

import { useState, type DragEvent } from "react";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import { productFieldLimits } from "@/modules/products/schemas";
import { BpButton } from "./ui/button";
import { BpCheckbox } from "./ui/checkbox";
import { BpInput } from "./ui/input";
import { BpNumberInput } from "./ui/number-input";
import { BpSelect } from "./ui/select";
import { BpTabs } from "./ui/tabs";

/**
 * Variant groups and their values, edited in place instead of on a page of their own.
 *
 * Unlike the attributes panel next to it, none of this belongs to the category: an option group
 * and every value in it are the product's own, and they travel in the same payload as the rest
 * of the form.
 *
 * What a value may carry depends on the shop. A gold product prices each variant from its
 * weight, so it takes grams and no price; a general one takes a price and no weight. The schema
 * refuses the other combination, so the panel only ever offers the one that applies.
 */
export type OptionValueDraft = {
  value: string;
  colorId: string | null;
  isActive: boolean;
  stock: number | null;
  weightGrams: string | null;
  price: string | null;
};

export type OptionDraft = { name: string; type: "SELECT" | "COLOR"; values: OptionValueDraft[] };

type Props = {
  storeIndustry: "GOLD" | "GENERAL";
  colors: Array<{ id: string; name: string }>;
  options: OptionDraft[];
  onChange: (options: OptionDraft[]) => void;
};

function emptyValue(): OptionValueDraft {
  return { value: "", colorId: null, isActive: true, stock: null, weightGrams: null, price: null };
}

function move<T>(items: T[], from: number, to: number) {
  if (from === to || from < 0 || to < 0 || to >= items.length) return items;
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

export function BlueprintProductOptions({ storeIndustry, colors, options, onChange }: Props) {
  const [newGroupName, setNewGroupName] = useState("");
  const [groupError, setGroupError] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [draggedValue, setDraggedValue] = useState<string | null>(null);

  const active = options[activeIndex] ?? options[0] ?? null;
  const activeAt = options.indexOf(active as OptionDraft);

  function addGroup() {
    const name = newGroupName.trim();
    if (!name) return setGroupError("نام تنوع را وارد کنید.");
    if (options.some((option) => option.name === name)) return setGroupError("تنوعی با این نام از قبل هست.");
    if (options.length >= 10) return setGroupError("حداکثر ۱۰ گروه تنوع برای هر محصول مجاز است.");
    onChange([...options, { name, type: "SELECT", values: [emptyValue()] }]);
    setActiveIndex(options.length);
    setNewGroupName("");
    setGroupError("");
  }

  function updateActive(next: OptionDraft) {
    onChange(options.map((option, index) => (index === activeAt ? next : option)));
  }

  function updateValue(index: number, patch: Partial<OptionValueDraft>) {
    if (!active) return;
    updateActive({ ...active, values: active.values.map((item, position) => (position === index ? { ...item, ...patch } : item)) });
  }

  function removeGroup(index: number) {
    onChange(options.filter((_, position) => position !== index));
    setActiveIndex(0);
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-end gap-2">
        <BpInput
          label="نام تنوع"
          value={newGroupName}
          maxLength={productFieldLimits.optionName}
          error={groupError || undefined}
          placeholder="مثلاً سایز"
          wrapperClassName="w-[min(100%,220px)]"
          onChange={(event) => { setNewGroupName(event.target.value); setGroupError(""); }}
          onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addGroup(); } }}
        />
        <BpButton variant="primary" className="field-action gap-1.5" onClick={addGroup}><Plus size={15} />افزودن تنوع</BpButton>
      </div>

      {options.length === 0 ? (
        <p className="bp-muted m-0 rounded-[var(--bp-radius)] border border-dashed border-[var(--bp-divider)] p-4 text-center text-[12px]">
          این محصول تنوعی ندارد. اگر در چند سایز یا رنگ عرضه می‌شود، اولین تنوع را از بالا اضافه کنید.
        </p>
      ) : (
        <>
          <BpTabs label="گروه‌های تنوع">
            {options.map((option, index) => (
              <button key={`${option.name}-${index}`} type="button" role="tab" aria-selected={index === activeAt} className="bp-tab" onClick={() => setActiveIndex(index)}>
                {option.name || "بدون نام"}
                <span className="bp-muted text-[11px]">({option.values.length.toLocaleString("fa-IR")})</span>
              </button>
            ))}
          </BpTabs>

          {active && (
            <>
              <div className="flex flex-wrap items-end gap-2">
                <BpInput
                  label="نام تنوع"
                  value={active.name}
                  maxLength={productFieldLimits.optionName}
                  wrapperClassName="w-[min(100%,220px)]"
                  onChange={(event) => updateActive({ ...active, name: event.target.value })}
                />
                <BpSelect
                  label="نوع"
                  value={active.type}
                  options={[{ value: "SELECT", label: "فهرست ساده" }, { value: "COLOR", label: "رنگ" }]}
                  wrapperClassName="w-[min(100%,180px)]"
                  onChange={(event) => updateActive({ ...active, type: event.target.value as OptionDraft["type"] })}
                />
                <BpButton isIconOnly variant="ghost" aria-label={`حذف تنوع ${active.name || "بدون نام"}`} className="field-action ms-auto text-[var(--bp-danger)]" onClick={() => removeGroup(activeAt)}>
                  <Trash2 size={15} />
                </BpButton>
              </div>

              <div className="grid gap-2">
                {active.values.map((item, index) => (
                  <div
                    key={index}
                    draggable
                    onDragStart={(event: DragEvent<HTMLDivElement>) => { event.dataTransfer.effectAllowed = "move"; setDraggedValue(String(index)); }}
                    onDragOver={(event) => {
                      event.preventDefault();
                      if (draggedValue === null || draggedValue === String(index)) return;
                      updateActive({ ...active, values: move(active.values, Number(draggedValue), index) });
                      setDraggedValue(String(index));
                    }}
                    onDrop={(event) => { event.preventDefault(); setDraggedValue(null); }}
                    onDragEnd={() => setDraggedValue(null)}
                    className={`flex flex-wrap items-end gap-2 rounded-[var(--bp-radius)] border px-3 py-1.5 ${draggedValue === String(index) ? "border-[var(--bp-accent)] opacity-60" : "border-[var(--bp-divider)]"}`}
                  >
                    <span className="cursor-grab self-center text-[var(--bp-muted)] active:cursor-grabbing" aria-hidden="true"><GripVertical size={16} /></span>
                    <BpInput
                      label="مقدار"
                      value={item.value}
                      maxLength={productFieldLimits.optionValue}
                      placeholder="مثلاً ۱۶"
                      wrapperClassName="w-[min(100%,160px)]"
                      onChange={(event) => updateValue(index, { value: event.target.value })}
                    />
                    {active.type === "COLOR" && (
                      <BpSelect
                        label="رنگ"
                        value={item.colorId ?? ""}
                        placeholder="انتخاب رنگ"
                        options={colors.map((color) => ({ value: color.id, label: color.name }))}
                        wrapperClassName="w-[min(100%,160px)]"
                        onChange={(event) => updateValue(index, { colorId: event.target.value || null })}
                      />
                    )}
                    <BpNumberInput
                      label="موجودی"
                      value={item.stock === null ? "" : String(item.stock)}
                      hint="خالی = موجودی کل محصول"
                      wrapperClassName="w-[min(100%,130px)]"
                      onValueChange={(next) => updateValue(index, { stock: next === "" ? null : Number(next) })}
                    />
                    {storeIndustry === "GOLD" ? (
                      <BpNumberInput
                        label="وزن (گرم)"
                        allowDecimal
                        value={item.weightGrams ?? ""}
                        wrapperClassName="w-[min(100%,140px)]"
                        onValueChange={(next) => updateValue(index, { weightGrams: next || null })}
                      />
                    ) : (
                      <BpNumberInput
                        label="قیمت (ریال)"
                        isPrice
                        value={item.price ?? ""}
                        wrapperClassName="w-[min(100%,190px)]"
                        onValueChange={(next) => updateValue(index, { price: next || null })}
                      />
                    )}
                    <span className="field-action"><BpCheckbox isSelected={item.isActive} label="فعال" onChange={(next) => updateValue(index, { isActive: next })} /></span>
                    <BpButton isIconOnly variant="ghost" aria-label={`حذف مقدار ${item.value || "بدون نام"}`} className="field-action ms-auto text-[var(--bp-danger)]" onClick={() => updateActive({ ...active, values: active.values.filter((_, position) => position !== index) })}>
                      <Trash2 size={15} />
                    </BpButton>
                  </div>
                ))}
              </div>

              <div className="flex justify-start">
                <BpButton variant="primary" className="gap-1.5" disabled={active.values.length >= 50} onClick={() => updateActive({ ...active, values: [...active.values, emptyValue()] })}>
                  <Plus size={15} />افزودن مقدار
                </BpButton>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
