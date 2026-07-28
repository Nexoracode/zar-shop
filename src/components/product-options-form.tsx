"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Button, Card, Input, buttonVariants, toast } from "@heroui/react";
import { ChevronRight, GripVertical, ListPlus, Plus, Save, Trash2, X } from "lucide-react";
import { adminFieldClass, adminLabelClass } from "@/components/admin-ui";
import { HeroSelectField } from "@/components/hero-select-field";
import { apiErrorMessage, validationErrorMessage } from "@/lib/form-errors";
import { productSchema } from "@/modules/products/schemas";

type OptionValue = { value: string; colorId: string | null };
type DraftOption = { key: string; name: string; values: OptionValue[]; valueInput: string };
type ColorChoice = { id: string; name: string; hex: string };

export function ProductOptionsForm({ productId, colors, initialOptions }: {
  productId: string;
  colors: ColorChoice[];
  initialOptions: Array<{ name: string; values: OptionValue[] }>;
}) {
  const [options, setOptions] = useState<DraftOption[]>(() => initialOptions.map((option, index) => ({ key: `existing-${index}`, ...option, valueInput: "" })));
  const [draggedKey, setDraggedKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function updateOption(key: string, update: Partial<DraftOption>) {
    setOptions((current) => current.map((option) => option.key === key ? { ...option, ...update } : option));
  }

  function addOptionGroup() {
    setOptions((current) => current.length >= 10 ? current : [...current, { key: `option-${crypto.randomUUID()}`, name: "", values: [], valueInput: "" }]);
  }

  function addOptionValue(key: string) {
    setOptions((current) => current.map((option) => {
      if (option.key !== key) return option;
      const value = option.valueInput.trim();
      if (!value || option.values.some((item) => item.value === value)) return option;
      return { ...option, values: [...option.values, { value, colorId: null }], valueInput: "" };
    }));
  }

  function addOptionColor(key: string, colorId: string) {
    const color = colors.find((item) => item.id === colorId);
    if (!color) return;
    setOptions((current) => current.map((option) => option.key !== key ? option : {
      ...option,
      values: option.values.some((item) => item.colorId === colorId) ? option.values : [...option.values, { value: color.name, colorId }],
    }));
  }

  function moveOption(targetKey: string) {
    if (!draggedKey || draggedKey === targetKey) return;
    setOptions((current) => {
      const sourceIndex = current.findIndex((option) => option.key === draggedKey);
      const targetIndex = current.findIndex((option) => option.key === targetKey);
      if (sourceIndex < 0 || targetIndex < 0) return current;
      const next = [...current];
      const [moved] = next.splice(sourceIndex, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submittedOptions = options.map((option) => {
      const pendingValue = option.valueInput.trim();
      return { name: option.name, values: !option.name.includes("رنگ") && pendingValue && !option.values.some((item) => item.value === pendingValue) ? [...option.values, { value: pendingValue, colorId: null }] : option.values };
    });
    const validation = productSchema.shape.options.safeParse(submittedOptions);
    if (!validation.success) {
      toast.danger("تنوع‌ها کامل نیستند", { description: validationErrorMessage(validation.error.issues, { options: "تنوع‌های محصول" }), timeout: 5000 });
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`/api/products/${productId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ options: validation.data }) });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(apiErrorMessage(result, "ذخیره تنوع‌ها انجام نشد.", { options: "تنوع‌های محصول" }));
      setOptions(validation.data.map((option, index) => ({ key: `saved-${index}`, ...option, valueInput: "" })));
      toast.success("تنوع‌های محصول ذخیره شدند", { description: "تغییرات همین محصول با موفقیت ثبت شد." });
    } catch (reason) {
      toast.danger("ذخیره تنوع‌ها انجام نشد", { description: reason instanceof Error ? reason.message : "خطای ناشناخته" });
    } finally {
      setLoading(false);
    }
  }

  return <form onSubmit={submit} className="grid gap-4">
    <Card variant="secondary" className="rounded-2xl border border-slate-200/80 bg-white shadow-sm">
      <Card.Content className="p-4 sm:p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#fbf7ef] text-[#9a7434]"><ListPlus size={19} /></span><div><h2 className="text-base font-black text-slate-800">گروه‌های تنوع</h2><p className="text-xs text-slate-400">برای هر گروه، عنوان و مقادیر قابل انتخاب مشتری را مشخص کنید.</p></div></div>
          <Button type="button" variant="secondary" isDisabled={options.length >= 10} onPress={addOptionGroup} className="min-h-10 gap-2 border-[#d8c29a] bg-[#fbf7ef] text-xs font-bold text-[#846325]"><Plus size={15} />افزودن تنوع</Button>
        </div>

        <div className="grid gap-3">
          {options.map((option, index) => <div key={option.key} onDragOver={(event) => event.preventDefault()} onDrop={() => { moveOption(option.key); setDraggedKey(null); }} className={`rounded-xl border bg-white p-3 shadow-sm ${draggedKey === option.key ? "border-[#b5904c] opacity-50" : "border-slate-200"}`}>
            <div className="mb-3 flex items-center justify-between gap-2"><span className="rounded-md bg-[#f4ead8] px-2 py-1 text-[11px] font-black text-[#785b27]">تنوع {(index + 1).toLocaleString("fa-IR")}</span><span className="text-[11px] text-slate-400">{option.values.length.toLocaleString("fa-IR")} مقدار</span></div>
            <div className="mb-3 flex items-end gap-2">
              <span draggable onDragStart={() => setDraggedKey(option.key)} onDragEnd={() => setDraggedKey(null)} className="mb-1 grid h-10 shrink-0 cursor-grab place-items-center text-slate-400" title="تغییر ترتیب"><GripVertical size={17} /></span>
              <label className={`${adminLabelClass} min-w-0 flex-1`}>عنوان تنوع<Input value={option.name} onChange={(event) => updateOption(option.key, { name: event.target.value })} fullWidth variant="secondary" placeholder="مثلاً سایز، رنگ یا طول زنجیر" className={adminFieldClass} /></label>
              <Button type="button" size="sm" isIconOnly variant="danger-soft" onPress={() => setOptions((current) => current.filter((item) => item.key !== option.key))} className="mb-1 h-9 min-h-9 w-9 min-w-9" aria-label={`حذف تنوع ${(index + 1).toLocaleString("fa-IR")}`}><Trash2 size={15} /></Button>
            </div>

            {option.name.includes("رنگ") ? <div className={adminLabelClass}>انتخاب رنگ<HeroSelectField name={`color-${option.key}`} ariaLabel="انتخاب رنگ" value="" placeholder={colors.length ? "یک رنگ را انتخاب کنید" : "رنگی ثبت نشده"} disabled={!colors.length} options={colors.filter((color) => !option.values.some((item) => item.colorId === color.id)).map((color) => ({ value: color.id, label: `${color.name} (${color.hex})` }))} onValueChange={(colorId) => addOptionColor(option.key, colorId)} /></div> : <label className={adminLabelClass}>مقدار قابل انتخاب<span className="flex gap-2"><Input value={option.valueInput} onChange={(event) => updateOption(option.key, { valueInput: event.target.value })} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addOptionValue(option.key); } }} fullWidth variant="secondary" placeholder="مثلاً ۱۲" className={adminFieldClass} /><Button type="button" variant="secondary" onPress={() => addOptionValue(option.key)} className="min-h-11 shrink-0 gap-1"><Plus size={14} />افزودن</Button></span></label>}

            {option.name.includes("رنگ") && !colors.length && <p className="mt-2 text-xs text-amber-700">ابتدا از <Link href="/admin/colors" className="font-black underline">صفحه رنگ‌ها</Link> رنگ موردنظر را ثبت کنید.</p>}
            {option.values.length ? <div className="mt-3 flex flex-wrap gap-2">{option.values.map((item) => { const color = colors.find((candidate) => candidate.id === item.colorId); return <span key={item.value} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700">{color && <span className="h-4 w-4 rounded-full border border-slate-300" style={{ backgroundColor: color.hex }} />}{color?.name ?? item.value}<Button type="button" size="sm" isIconOnly variant="ghost" onPress={() => updateOption(option.key, { values: option.values.filter((value) => value.value !== item.value) })} className="h-5 min-h-5 w-5 min-w-5 text-slate-400" aria-label={`حذف مقدار ${item.value}`}><X size={12} /></Button></span>; })}</div> : <p className="mt-2 text-xs text-amber-700">حداقل یک مقدار به این تنوع اضافه کنید.</p>}
          </div>)}
          {!options.length && <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 px-5 py-12 text-center"><ListPlus className="mx-auto mb-3 text-slate-300" size={30} /><strong className="block text-sm text-slate-600">این محصول هنوز تنوع ندارد</strong><p className="mt-1 text-xs text-slate-400">برای شروع، یک گروه مثل رنگ یا سایز اضافه کنید.</p></div>}
        </div>
      </Card.Content>
    </Card>

    <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
      <Link href="/admin/products" className={buttonVariants({ variant: "secondary", className: "min-h-11 gap-2 rounded-xl" })}><ChevronRight size={16} />بازگشت به محصولات</Link>
      <Button type="submit" variant="primary" isDisabled={loading} className="min-h-11 gap-2 bg-[#172b4d] px-6 font-bold text-white"><Save size={16} />{loading ? "در حال ذخیره..." : "ذخیره تنوع‌ها"}</Button>
    </div>
  </form>;
}
