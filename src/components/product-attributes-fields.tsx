"use client";

import { useState } from "react";
import { Button, Input } from "@heroui/react";
import { ListChecks, Plus, X } from "lucide-react";
import { adminFieldClass, adminLabelClass } from "@/components/admin-ui";
import type { CategoryAttributeGroup, ProductAttributeValue } from "@/modules/products/attributes";

export function ProductAttributesFields({ groups, values, onChange }: { groups: CategoryAttributeGroup[]; values: ProductAttributeValue[]; onChange: (values: ProductAttributeValue[]) => void }) {
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
    const candidates = draft.split(/[,،]/).map((item) => item.trim()).filter(Boolean);
    const currentValues = valuesById.get(attributeId) ?? [];
    const merged = [...new Set([...currentValues, ...candidates])].slice(0, 20);
    onChange([...values.filter((item) => item.attributeId !== attributeId), { attributeId, values: merged }]);
    setDrafts((current) => ({ ...current, [attributeId]: "" }));
  }

  function removeMultipleValue(attributeId: string, value: string) {
    const remaining = (valuesById.get(attributeId) ?? []).filter((item) => item !== value);
    onChange([...values.filter((item) => item.attributeId !== attributeId), ...(remaining.length ? [{ attributeId, values: remaining }] : [])]);
  }

  return <div className="grid gap-4">
    {groups.map((group) => <div key={group.id} className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50/60">
      <div className="flex items-center gap-2 border-b border-slate-200 bg-white px-4 py-3"><ListChecks size={16} className="text-violet-600" /><strong className="text-sm text-slate-800">{group.name}</strong></div>
      <div className="grid gap-3 p-3 sm:p-4 lg:grid-cols-2">
        {group.attributes.map((attribute) => {
          const currentValues = valuesById.get(attribute.id) ?? [];
          return <div key={attribute.id} className="rounded-lg border border-slate-200 bg-white p-3">
            {attribute.allowsMultiple ? <div className={adminLabelClass}>{attribute.name}<div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]"><Input value={drafts[attribute.id] ?? ""} onChange={(event) => setDrafts((current) => ({ ...current, [attribute.id]: event.target.value }))} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addMultipleValue(attribute.id); } }} placeholder="مقدار را وارد کنید؛ چند مقدار با کاما" fullWidth variant="secondary" className={adminFieldClass} /><Button type="button" variant="secondary" onPress={() => addMultipleValue(attribute.id)} className="min-h-11 shrink-0 gap-1 px-3 text-xs font-bold"><Plus size={14} />افزودن</Button></div>{currentValues.length ? <div className="mt-2 flex flex-wrap gap-1.5">{currentValues.map((value) => <span key={value} className="inline-flex min-h-7 items-center gap-1 rounded-md bg-violet-50 px-2 text-[11px] font-bold text-violet-700">{value}<Button type="button" isIconOnly size="sm" variant="ghost" aria-label={`حذف ${value}`} onPress={() => removeMultipleValue(attribute.id, value)} className="h-5 min-h-5 w-5 min-w-5 rounded text-violet-500"><X size={11} /></Button></span>)}</div> : <span className="mt-2 block text-[10px] font-normal text-slate-400">امکان ثبت چند مقدار مثل آقایان و خانم‌ها وجود دارد.</span>}</div> : <label className={adminLabelClass}>{attribute.name}<Input value={currentValues[0] ?? ""} onChange={(event) => setSingleValue(attribute.id, event.target.value)} placeholder="مثلاً ۱۲ گیگابایت" fullWidth variant="secondary" className={adminFieldClass} /></label>}
          </div>;
        })}
      </div>
    </div>)}
  </div>;
}
