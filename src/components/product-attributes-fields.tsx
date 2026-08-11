"use client";

import { useState } from "react";
import { Button, Input } from "@heroui/react";
import { ListChecks, Plus, X } from "lucide-react";
import { TruncatedTextTooltip } from "@/components/hero";
import type { CategoryAttributeGroup, ProductAttributeValue } from "@/modules/products/attributes";

type Props = { groups: CategoryAttributeGroup[]; values: ProductAttributeValue[]; onChange: (values: ProductAttributeValue[]) => void };

export function ProductAttributesFields({ groups, values, onChange }: Props) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const valuesById = new Map(values.map((item) => [item.attributeId, item.values]));

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

  return <div className="grid gap-3">
    {groups.map((group) => <section key={group.id} className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-50/50">
      <header className="flex min-h-12 items-center gap-2.5 border-b border-slate-200 bg-white px-3.5 py-2.5"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-violet-50 text-violet-600"><ListChecks size={16} /></span><strong className="min-w-0 truncate text-[13px] font-black text-slate-800">{group.name}</strong><span className="mr-auto shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-500">{group.attributes.length.toLocaleString("fa-IR")} ویژگی</span></header>
      <div className="grid min-w-0 gap-3 p-3 md:grid-cols-2">
        {group.attributes.map((attribute) => {
          const currentValues = valuesById.get(attribute.id) ?? [];
          const draft = drafts[attribute.id] ?? "";
          return <article key={attribute.id} className="flex min-h-[150px] min-w-0 flex-col rounded-xl border border-slate-200 bg-white p-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
            <div className="min-w-0"><TruncatedTextTooltip text={attribute.name} className="max-w-full text-[13px] font-black leading-5 text-slate-700" /></div>
            <div className="mt-2.5 flex min-w-0 items-center gap-2"><Input value={draft} onChange={(event) => setDrafts((current) => ({ ...current, [attribute.id]: event.target.value }))} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addMultipleValue(attribute.id); } }} aria-label={`مقدار ${attribute.name}`} placeholder="مقدار؛ چند مورد با کاما" fullWidth variant="secondary" className="!h-[34px] !min-h-[34px] min-w-0 !rounded-lg border border-[var(--field-border)] bg-[var(--field-background)] !px-3 !py-1 !text-xs text-[var(--field-foreground)] outline-none transition placeholder:!text-[10px] placeholder:text-[var(--field-placeholder)] focus:border-[var(--field-border-focus)] focus:ring-2 focus:ring-[var(--focus)]/10" /><Button type="button" isIconOnly size="sm" variant="secondary" isDisabled={!draft.trim()} aria-label={`افزودن مقدار ${attribute.name}`} onPress={() => addMultipleValue(attribute.id)} className="!size-[34px] !min-h-[34px] !min-w-[34px] shrink-0 !rounded-lg !p-0"><Plus className="!size-4" /></Button></div>
            <div className="mt-auto min-w-0 border-t border-slate-100 pt-3">{currentValues.length ? <div className="flex min-w-0 flex-wrap items-center gap-1.5">{currentValues.map((value) => <SelectedValue key={value} value={value} onRemove={() => removeValue(attribute.id, value)} />)}</div> : <span className="block text-[11px] leading-6 text-slate-400">مقداری برای این ویژگی ثبت نشده است.</span>}</div>
          </article>;
        })}
      </div>
    </section>)}
  </div>;
}

function SelectedValue({ value, onRemove }: { value: string; onRemove: () => void }) {
  return <span className="inline-flex h-8 max-w-full min-w-0 items-center gap-1.5 rounded-lg border border-violet-100 bg-violet-50 pr-2.5 pl-1 text-violet-700"><span className="flex min-w-0 items-center"><TruncatedTextTooltip text={value} className="max-w-[220px] text-[11px] font-bold leading-none" /></span><Button type="button" isIconOnly size="sm" variant="ghost" aria-label={`حذف ${value}`} onPress={onRemove} className="grid size-5 min-h-5 min-w-5 shrink-0 place-items-center self-center rounded p-0 text-violet-400 hover:bg-violet-100 hover:text-violet-700"><X size={11} /></Button></span>;
}
