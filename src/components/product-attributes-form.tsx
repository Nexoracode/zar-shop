"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Card, toast } from "@heroui/react";
import { CheckCircle2, ListChecks } from "lucide-react";
import { AdminSaveButton } from "@/components/admin-save-button";
import { ProductAttributesFields } from "@/components/product-attributes-fields";
import type { CategoryAttributeGroup, ProductAttributeValue } from "@/modules/products/attributes";

type Props = {
  productId: string;
  categoryId: string | null;
  categoryName: string | null;
  groups: CategoryAttributeGroup[];
  initialAttributes: ProductAttributeValue[];
};

export function ProductAttributesForm({ productId, categoryId, categoryName, groups, initialAttributes }: Props) {
  const [values, setValues] = useState(initialAttributes);
  const [saving, setSaving] = useState(false);
  const definitions = groups.flatMap((group) => group.attributes);
  const completedIds = new Set(values.filter((item) => item.values.some((value) => value.trim())).map((item) => item.attributeId));
  const completedCount = definitions.filter((attribute) => completedIds.has(attribute.id)).length;
  const importantCount = definitions.filter((attribute) => attribute.important && completedIds.has(attribute.id)).length;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/products/${productId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ attributes: values }) });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.message ?? "ذخیره ویژگی‌های محصول انجام نشد.");
      setValues(Array.isArray(result?.attributes) ? result.attributes : values);
      toast.success("ویژگی‌های محصول ذخیره شدند", { description: "مقادیر جدید در صفحه محصول قابل نمایش هستند." });
    } catch (reason) {
      toast.danger("ذخیره ویژگی‌ها انجام نشد", { description: reason instanceof Error ? reason.message : "خطای ناشناخته" });
    } finally {
      setSaving(false);
    }
  }

  if (!categoryId) return <Card variant="secondary" className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center"><ListChecks className="mx-auto mb-3 text-amber-500" size={30} /><strong className="block text-sm text-amber-900">محصول دسته‌بندی ندارد</strong><p className="mt-2 text-xs text-amber-700">ابتدا از فرم محصول یک دسته‌بندی انتخاب و ذخیره کنید.</p><Link href={`/admin/products/${productId}/edit`} className="mt-4 inline-flex min-h-10 items-center justify-center rounded-xl bg-white px-5 text-xs font-bold text-amber-800">ویرایش محصول</Link></Card>;

  if (!definitions.length) return <Card variant="secondary" className="rounded-2xl border border-slate-200 bg-white p-6 text-center"><ListChecks className="mx-auto mb-3 text-slate-300" size={30} /><strong className="block text-sm text-slate-700">برای دسته «{categoryName}» ویژگی تعریف نشده است</strong><p className="mt-2 text-xs text-slate-500">ابتدا ساختار ویژگی‌های این دسته را تعریف کنید.</p><Link href={`/admin/categories/${categoryId}/attributes`} className="mt-4 inline-flex min-h-10 items-center justify-center rounded-xl bg-violet-700 px-5 text-xs font-bold text-white">تعریف ویژگی‌های دسته</Link></Card>;

  return <form onSubmit={submit} className="admin-sticky-save-form grid gap-4">
    <div className="grid grid-cols-3 gap-2 sm:gap-3">
      {[{ label: "کل ویژگی‌ها", value: definitions.length }, { label: "تکمیل‌شده", value: completedCount }, { label: "مهم و تکمیل‌شده", value: importantCount }].map((item) => <Card key={item.label} variant="secondary" className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"><strong className="block text-lg font-bold text-slate-800">{item.value.toLocaleString("fa-IR")}</strong><span className="mt-1 block text-[10px] text-slate-500 sm:text-xs">{item.label}</span></Card>)}
    </div>
    <ProductAttributesFields groups={groups} values={values} onChange={setValues} />
    <Card variant="secondary" className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"><div className="flex min-h-12 items-center justify-between gap-4"><div className="min-w-0"><strong className="block text-[13px] font-bold text-slate-800">ذخیره ویژگی‌های محصول</strong><span className="mt-1 hidden text-[11px] text-slate-500 sm:block">{completedCount.toLocaleString("fa-IR")} ویژگی از {definitions.length.toLocaleString("fa-IR")} ویژگی تکمیل شده است.</span></div><AdminSaveButton isSaving={saving} label="ذخیره ویژگی‌ها" icon={completedCount === definitions.length ? <CheckCircle2 className="!size-[15px]" /> : undefined} /></div></Card>
  </form>;
}
