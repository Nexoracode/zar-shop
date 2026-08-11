"use client";

import { useState } from "react";
import { Button, Input, Tooltip } from "@heroui/react";
import { Check, ListChecks, Plus, X } from "lucide-react";
import { adminFieldClass } from "@/components/admin-ui";
import { TruncatedTextTooltip } from "@/components/hero";
import type { CategoryAttributeGroup, ProductAttributeValue } from "@/modules/products/attributes";

type Props = { groups: CategoryAttributeGroup[]; values: ProductAttributeValue[]; onChange: (values: ProductAttributeValue[]) => void };

export function ProductAttributesFields({ groups, values, onChange }: Props) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const valuesById = new Map(values.map((item) => [item.attributeId, item.values]));

  function setSingleValue(attributeId: string, value: string) {
    const next = values.filter((item) => item.attributeId !== attributeId);
    if (value.trim()) next.push({ attributeId, values: [value] });
    onChange(next);
  }

  function addMultipleValue(attributeId: string) {
    const draft = drafts[attributeId]?.trim() ?? "";
    if (!draft) return;
    addMultipleValues(attributeId, draft.split(/[,،]/).map((item) => item.trim()).filter(Boolean));
    setDrafts((current) => ({ ...current, [attributeId]: "" }));
  }

  function addMultipleValues(attributeId: string, candidates: string[]) {
    const currentValues = valuesById.get(attributeId) ?? [];
    const merged = [...new Set([...currentValues, ...candidates])].slice(0, 20);
    onChange([...values.filter((item) => item.attributeId !== attributeId), { attributeId, values: merged }]);
  }

  function removeValue(attributeId: string, value: string) {
    const remaining = (valuesById.get(attributeId) ?? []).filter((item) => item !== value);
    onChange([...values.filter((item) => item.attributeId !== attributeId), ...(remaining.length ? [{ attributeId, values: remaining }] : [])]);
  }

  return <div className="grid gap-4">
    {groups.map((group) => <section key={group.id} className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-50/60">
      <header className="flex items-center gap-2 border-b border-slate-200 bg-white px-4 py-3"><ListChecks size={16} className="shrink-0 text-violet-600" /><strong className="min-w-0 truncate text-sm text-slate-800">{group.name}</strong><span className="mr-auto shrink-0 text-[10px] text-slate-400">{group.attributes.length.toLocaleString("fa-IR")} ویژگی</span></header>
      <div className="grid min-w-0 gap-3 p-3 sm:p-4 lg:grid-cols-2">
        {group.attributes.map((attribute) => {
          const currentValues = valuesById.get(attribute.id) ?? [];
          const availableSuggestions = attribute.suggestedValues.filter((value) => attribute.allowsMultiple ? !currentValues.includes(value) : true);
          return <article key={attribute.id} className="flex min-h-[230px] min-w-0 flex-col rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="flex min-w-0 items-start justify-between gap-2 border-b border-slate-100 pb-3"><div className="min-w-0"><TruncatedTextTooltip text={attribute.name} className="max-w-full text-xs font-black text-slate-700" /></div><span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[9px] font-bold text-slate-500">{attribute.allowsMultiple ? "چندمقداری" : "تک‌مقداری"}</span></div>

            <div className="mt-3 min-w-0"><span className="mb-2 block text-[10px] font-bold text-slate-400">مقادیر پیشنهادی</span>{availableSuggestions.length ? <div className="flex min-w-0 flex-wrap gap-1.5">{availableSuggestions.map((value) => <SuggestedValueButton key={value} value={value} selected={!attribute.allowsMultiple && currentValues[0] === value} onPress={() => attribute.allowsMultiple ? addMultipleValues(attribute.id, [value]) : setSingleValue(attribute.id, value)} />)}</div> : <span className="block text-[10px] leading-5 text-slate-400">مقدار پیشنهادی دیگری وجود ندارد.</span>}</div>

            <div className="mt-3 min-w-0">{attribute.allowsMultiple ? <div className="grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_auto]"><Input value={drafts[attribute.id] ?? ""} onChange={(event) => setDrafts((current) => ({ ...current, [attribute.id]: event.target.value }))} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addMultipleValue(attribute.id); } }} placeholder="مقدار جدید؛ چند مقدار با کاما" fullWidth variant="secondary" className={`${adminFieldClass} min-w-0`} /><Button type="button" variant="secondary" onPress={() => addMultipleValue(attribute.id)} className="min-h-11 shrink-0 gap-1 px-3 text-xs font-bold"><Plus size={14} />افزودن</Button></div> : <Input value={currentValues[0] ?? ""} onChange={(event) => setSingleValue(attribute.id, event.target.value)} placeholder="یک گزینه انتخاب یا مقدار جدید وارد کنید" fullWidth variant="secondary" className={`${adminFieldClass} min-w-0`} />}</div>

            <div className="mt-auto min-w-0 border-t border-slate-100 pt-3"><span className="mb-2 block text-[10px] font-bold text-slate-400">مقدار ثبت‌شده</span>{currentValues.length ? <div className="flex min-w-0 flex-wrap gap-1.5">{currentValues.map((value) => <SelectedValue key={value} value={value} removable={attribute.allowsMultiple} onRemove={() => removeValue(attribute.id, value)} />)}</div> : <span className="block text-[10px] text-slate-400">هنوز مقداری ثبت نشده است.</span>}</div>
          </article>;
        })}
      </div>
    </section>)}
  </div>;
}

function SuggestedValueButton({ value, selected, onPress }: { value: string; selected: boolean; onPress: () => void }) {
  return <Tooltip delay={200} closeDelay={100}><Tooltip.Trigger><Button type="button" size="sm" variant={selected ? "primary" : "secondary"} onPress={onPress} className="h-8 min-h-8 max-w-full gap-1 rounded-md px-2 text-[10px] font-bold"><span className="max-w-[180px] truncate">{value}</span>{selected && <Check size={11} className="shrink-0" />}</Button></Tooltip.Trigger><Tooltip.Content showArrow dir="rtl" className="z-50 max-w-sm border border-[var(--border)] bg-[var(--overlay)] px-3 py-2 text-right text-xs leading-6 text-[var(--overlay-foreground)] shadow-lg">{value}</Tooltip.Content></Tooltip>;
}

function SelectedValue({ value, removable, onRemove }: { value: string; removable: boolean; onRemove: () => void }) {
  return <span className="flex min-h-8 max-w-full min-w-0 items-center gap-1 rounded-md bg-violet-50 px-2 text-[11px] font-bold text-violet-700"><span className="min-w-0 flex-1"><TruncatedTextTooltip text={value} className="max-w-[220px]" /></span>{removable && <Button type="button" isIconOnly size="sm" variant="ghost" aria-label={`حذف ${value}`} onPress={onRemove} className="size-5 min-h-5 min-w-5 shrink-0 rounded text-violet-500"><X size={11} /></Button>}</span>;
}
