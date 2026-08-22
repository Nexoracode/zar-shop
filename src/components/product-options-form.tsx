"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Button, Card, Input, buttonVariants, toast } from "@heroui/react";
import { Eye, EyeOff, ChevronRight, GripVertical, ListPlus, Plus, Trash2 } from "lucide-react";
import { AdminSaveButton } from "@/components/admin-save-button";
import { adminFieldClass, adminLabelClass } from "@/components/admin-ui";
import { AdminSectionHelp } from "@/components/admin-section-help";
import { HeroSelectField } from "@/components/hero-select-field";
import { HeroNumberInput } from "@/components/hero-number-input";
import { apiErrorMessage, validationErrorMessage } from "@/lib/form-errors";
import { productSchema } from "@/modules/products/schemas";
import { parseOptionValueShortcut } from "@/modules/products/option-shortcuts";

type OptionValue = { value: string; colorId: string | null; isActive: boolean; stock: number | null; weightGrams: string | null; price: string | null; persisted?: boolean; used?: boolean };
type DraftOption = { key: string; name: string; values: OptionValue[]; valueInput: string; persisted: boolean };
type ColorChoice = { id: string; name: string; hex: string };

export function ProductOptionsForm({ productId, productStock, storeIndustry, colors, initialOptions, showBackLink = true }: {
  productId: string;
  productStock: number;
  storeIndustry: "GOLD" | "GENERAL";
  colors: ColorChoice[];
  initialOptions: Array<{ name: string; values: OptionValue[] }>;
  showBackLink?: boolean;
}) {
  const [options, setOptions] = useState<DraftOption[]>(() => initialOptions.map((option, index) => ({ key: `existing-${index}`, ...option, values: option.values.map((item) => ({ ...item, persisted: true })), valueInput: "", persisted: true })));
  const [draggedKey, setDraggedKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function updateOption(key: string, update: Partial<DraftOption>) {
    setOptions((current) => current.map((option) => option.key === key ? { ...option, ...update } : option));
  }

  function addOptionGroup() {
    setOptions((current) => current.length >= 10 ? current : [...current, { key: `option-${crypto.randomUUID()}`, name: "", values: [], valueInput: "", persisted: false }]);
  }

  function addOptionValue(key: string) {
    const draft = options.find((option) => option.key === key);
    if (!draft) return;
    const parsed = parseOptionValueShortcut(draft.valueInput);
    if (parsed.invalid.length) {
      toast.danger("فرمت مقدار یا وزن درست نیست", { description: `موارد نامعتبر: ${parsed.invalid.join("، ")}` });
      return;
    }
    if (!parsed.values.length) return;
    setOptions((current) => current.map((option) => {
      if (option.key !== key) return option;
      const existingValues = new Set(option.values.map((item) => item.value));
      const addedValues = parsed.values.filter((item) => !existingValues.has(item.value)).map((item) => ({ ...item, weightGrams: storeIndustry === "GOLD" ? item.weightGrams : null, price: null, colorId: null, isActive: true, stock: productStock, persisted: false, used: false }));
      return { ...option, values: [...option.values, ...addedValues], valueInput: "" };
    }));
  }

  function addOptionColor(key: string, colorId: string) {
    const color = colors.find((item) => item.id === colorId);
    if (!color) return;
    setOptions((current) => current.map((option) => option.key !== key ? option : {
      ...option,
      values: option.values.some((item) => item.colorId === colorId) ? option.values : [...option.values, { value: color.name, colorId, isActive: true, stock: productStock, weightGrams: null, price: null, persisted: false, used: false }],
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
    const usedKeys = new Set(options.flatMap((option) => option.values.filter((item) => item.used).map((item) => JSON.stringify([option.name, item.value]))));
    const invalidPending = options.flatMap((option) => parseOptionValueShortcut(option.valueInput).invalid);
    if (invalidPending.length) {
      toast.danger("فرمت مقدار یا وزن درست نیست", { description: `موارد نامعتبر: ${invalidPending.join("، ")}` });
      return;
    }
    const submittedOptions = options.map((option) => {
      const pendingValues = option.name.includes("رنگ") ? [] : parseOptionValueShortcut(option.valueInput).values;
      const existingValues = new Set(option.values.map((item) => item.value));
      const values = [...option.values, ...pendingValues.filter((item) => !existingValues.has(item.value)).map((item) => ({ ...item, weightGrams: storeIndustry === "GOLD" ? item.weightGrams : null, price: null, colorId: null, isActive: true, stock: productStock }))];
      return { name: option.name, values: values.map((item) => ({ value: item.value, colorId: item.colorId, isActive: item.isActive, stock: item.stock, weightGrams: item.weightGrams, price: item.price })) };
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
      setOptions(validation.data.map((option, index) => ({ key: `saved-${index}`, ...option, values: option.values.map((item) => ({ ...item, persisted: true, used: usedKeys.has(JSON.stringify([option.name, item.value])) })), valueInput: "", persisted: true })));
      toast.success("تنوع‌های محصول ذخیره شدند", { description: "تغییرات همین محصول با موفقیت ثبت شد." });
    } catch (reason) {
      toast.danger("ذخیره تنوع‌ها انجام نشد", { description: reason instanceof Error ? reason.message : "خطای ناشناخته" });
    } finally {
      setLoading(false);
    }
  }

  return <form onSubmit={submit} className="admin-sticky-save-form grid gap-4">
    <Card variant="secondary" className="rounded-xl border border-slate-200/80 bg-white shadow-sm">
      <Card.Content className="p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--warning)]/10 text-[var(--warning)]"><ListPlus size={19} /></span><div><h2 className="text-base font-bold text-slate-800">گروه‌های تنوع</h2><p className="text-xs text-slate-400">برای هر گروه، عنوان و مقادیر قابل انتخاب مشتری را مشخص کنید.</p></div></div>
          <div className="mr-auto flex items-center gap-2"><AdminSectionHelp title="گروه‌های تنوع" summary="تنوع‌ها انتخاب‌های مؤثر بر خرید مثل رنگ و سایز هستند و برای هر مقدار موجودی و قیمت یا وزن مستقل دارند." blocks={[{ title: "افزودن سریع مقدار", items: ["مقادیر ساده را با کاما وارد کنید؛ مثل ۱۲,۱۳,۱۴.", "در فروشگاه طلا می‌توانید وزن را بعد از دونقطه بنویسید؛ مثل ۱۲:۲/۴۰۰.", "برای گروه رنگ، رنگ‌ها را از فهرست رنگ‌های ثبت‌شده انتخاب کنید."] }, { title: "موجودی و قیمت‌گذاری", description: storeIndustry === "GOLD" ? "موجودی هر مقدار مستقل است و وزن آن برای محاسبه قیمت روز طلا استفاده می‌شود. مقدار بدون وزن از وزن پایه محصول استفاده می‌کند." : "موجودی و قیمت هر مقدار مستقل است. قیمت خالی از قیمت پایه محصول استفاده می‌کند." }, { title: "حذف یا غیرفعال‌سازی", tone: "important", description: "مقداری که هنوز در سفارشی استفاده نشده قابل حذف است. اگر سابقه خرید دارد، برای حفظ فاکتور مشتری فقط آن را غیرفعال کنید." }, { title: "ترتیب نمایش", description: "گروه‌ها را از دستگیره بکشید؛ ترتیب این صفحه همان ترتیب انتخاب‌های مشتری در صفحه محصول است." }]} /><Button type="button" variant="secondary" isDisabled={options.length >= 10} onPress={addOptionGroup} className="min-h-10 gap-1.5 border-[var(--warning)]/40 bg-[var(--warning)]/10 text-[11px] font-bold text-[var(--warning)]"><Plus size={14} />افزودن</Button></div>
        </div>

        <div className="grid gap-3">
          {options.map((option, index) => <div key={option.key} onDragOver={(event) => event.preventDefault()} onDrop={() => { moveOption(option.key); setDraggedKey(null); }} className={`rounded-xl border bg-slate-50/40 p-3 sm:p-4 ${draggedKey === option.key ? "border-[var(--warning)] opacity-50" : "border-slate-200"}`}>
            <div className="mb-3 flex items-center justify-between gap-2"><span className="rounded-md bg-[var(--warning)]/15 px-2 py-1 text-[11px] font-bold text-[var(--warning)]">تنوع {(index + 1).toLocaleString("fa-IR")}</span><span className="text-[11px] text-slate-400">{option.values.length.toLocaleString("fa-IR")} مقدار</span></div>
            <div className="mb-3 grid items-end gap-2 sm:grid-cols-[32px_minmax(0,1fr)_36px]">
              <span draggable onDragStart={() => setDraggedKey(option.key)} onDragEnd={() => setDraggedKey(null)} className="mb-1 grid h-10 shrink-0 cursor-grab place-items-center text-slate-400" title="تغییر ترتیب"><GripVertical size={17} /></span>
              <label className={`${adminLabelClass} min-w-0 flex-1`}>عنوان تنوع<Input value={option.name} disabled={option.persisted} onChange={(event) => updateOption(option.key, { name: event.target.value })} fullWidth variant="secondary" placeholder="مثلاً سایز، رنگ یا طول زنجیر" className={adminFieldClass} /></label>
              {option.values.some((item) => item.used) ? <Button type="button" size="sm" isIconOnly variant="ghost" aria-label={`${option.values.some((item) => item.isActive) ? "غیرفعال‌سازی" : "فعال‌سازی"} گروه ${option.name}`} onPress={() => updateOption(option.key, { values: option.values.map((item) => ({ ...item, isActive: !option.values.some((value) => value.isActive) })) })} className={`mb-1 h-9 min-h-9 w-9 min-w-9 ${option.values.some((item) => item.isActive) ? "text-emerald-600" : "text-slate-400"}`}>{option.values.some((item) => item.isActive) ? <Eye size={16} /> : <EyeOff size={16} />}</Button> : <Button type="button" size="sm" isIconOnly variant="danger-soft" onPress={() => setOptions((current) => current.filter((item) => item.key !== option.key))} className="mb-1 h-9 min-h-9 w-9 min-w-9" aria-label={`حذف گروه ${option.name || (index + 1).toLocaleString("fa-IR")}`}><Trash2 size={15} /></Button>}
            </div>

            {option.name.includes("رنگ") ? <div className={adminLabelClass}>انتخاب رنگ<HeroSelectField name={`color-${option.key}`} ariaLabel="انتخاب رنگ" value="" placeholder={colors.length ? "یک رنگ را انتخاب کنید" : "رنگی ثبت نشده"} disabled={!colors.length} options={colors.filter((color) => !option.values.some((item) => item.colorId === color.id)).map((color) => ({ value: color.id, label: `${color.name} (${color.hex})` }))} onValueChange={(colorId) => addOptionColor(option.key, colorId)} /></div> : <label className={adminLabelClass}>مقدار قابل انتخاب<span className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]"><Input value={option.valueInput} onChange={(event) => updateOption(option.key, { valueInput: event.target.value })} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addOptionValue(option.key); } }} fullWidth variant="secondary" placeholder={storeIndustry === "GOLD" ? "۱۲,۱۳,۱۴ یا ۱۲:۲/۴۰۰" : "کوچک،متوسط،بزرگ"} className={adminFieldClass} /><Button type="button" variant="secondary" onPress={() => addOptionValue(option.key)} className="min-h-11 shrink-0 gap-1 px-4"><Plus size={14} />افزودن</Button></span><span className="text-[10px] font-normal text-slate-400">{storeIndustry === "GOLD" ? "چند مقدار را با کاما جدا کنید؛ بعد از دونقطه وزن را بنویسید." : "چند مقدار را با کاما از هم جدا کنید."}</span></label>}

            {option.name.includes("رنگ") && !colors.length && <p className="mt-2 text-xs text-amber-700">ابتدا از <Link href="/admin/colors" className="font-bold underline">صفحه رنگ‌ها</Link> رنگ موردنظر را ثبت کنید.</p>}
            {option.values.length ? <div className="admin-content-scroll mt-4 grid gap-1.5 overflow-x-auto pb-1">
              <div className="grid min-w-[600px] grid-cols-[minmax(150px,1fr)_110px_minmax(220px,1.15fr)_38px] gap-2 px-3 text-[10px] font-bold text-slate-400"><span>مقدار</span><span>موجودی</span><span>{storeIndustry === "GOLD" ? "وزن (گرم)" : "قیمت (ریال)"}</span><span className="sr-only">وضعیت</span></div>
              {option.values.map((item) => {
                const color = colors.find((candidate) => candidate.id === item.colorId);
                const compactInputClass = `${adminFieldClass} h-9 min-h-9 rounded-lg border-slate-200 bg-white px-2 py-1 text-xs shadow-none`;
                return <div key={item.value} className={`grid min-w-[600px] grid-cols-[minmax(150px,1fr)_110px_minmax(220px,1.15fr)_38px] items-start gap-2 rounded-lg border px-3 py-2 ${item.isActive ? "border-slate-200 bg-white" : "border-slate-200 bg-slate-50 opacity-55"}`}>
                  <span className="inline-flex min-w-0 items-center gap-2 truncate text-xs font-bold text-slate-700">{color && <span className="h-4 w-4 shrink-0 rounded-full border border-slate-300" style={{ backgroundColor: color.hex }} />}{color?.name ?? item.value}</span>
                  <HeroNumberInput min="0" value={String(item.stock ?? 0)} onValueChange={(nextValue) => updateOption(option.key, { values: option.values.map((value) => value.value === item.value ? { ...value, stock: Math.max(0, Number(nextValue) || 0) } : value) })} variant="secondary" className={compactInputClass} aria-label={`موجودی ${item.value}`} />
                  {storeIndustry === "GOLD" ? <HeroNumberInput min="0.001" step="0.001" value={item.weightGrams ?? ""} placeholder="پایه" onValueChange={(nextValue) => updateOption(option.key, { values: option.values.map((value) => value.value === item.value ? { ...value, weightGrams: nextValue || null } : value) })} variant="secondary" className={compactInputClass} aria-label={`وزن ${item.value}`} /> : <HeroNumberInput min="1" value={item.price ?? ""} isPrice placeholder="قیمت پایه" onValueChange={(nextValue) => updateOption(option.key, { values: option.values.map((value) => value.value === item.value ? { ...value, price: nextValue || null } : value) })} variant="secondary" className={compactInputClass} aria-label={`قیمت ${item.value}`} />}
                  {item.used ? <Button type="button" size="sm" isIconOnly variant="ghost" aria-label={`${item.isActive ? "غیرفعال‌سازی" : "فعال‌سازی"} ${item.value}`} onPress={() => updateOption(option.key, { values: option.values.map((value) => value.value === item.value ? { ...value, isActive: !value.isActive } : value) })} className={`h-8 min-h-8 w-8 min-w-8 rounded-lg ${item.isActive ? "text-emerald-600" : "text-slate-400"}`}>{item.isActive ? <Eye size={15} /> : <EyeOff size={15} />}</Button> : <Button type="button" size="sm" isIconOnly variant="danger-soft" onPress={() => updateOption(option.key, { values: option.values.filter((value) => value.value !== item.value) })} className="h-8 min-h-8 w-8 min-w-8 rounded-lg" aria-label={`حذف مقدار ${item.value}`}><Trash2 size={13} /></Button>}
                </div>;
              })}
            </div> : <p className="mt-2 text-xs text-amber-700">حداقل یک مقدار به این تنوع اضافه کنید.</p>}
          </div>)}
          {!options.length && <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 px-5 py-12 text-center"><ListPlus className="mx-auto mb-3 text-slate-300" size={30} /><strong className="block text-sm text-slate-600">این محصول هنوز تنوع ندارد</strong><p className="mt-1 text-xs text-slate-400">برای شروع، یک گروه مثل رنگ یا سایز اضافه کنید.</p></div>}
        </div>
      </Card.Content>
    </Card>

    <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
      {showBackLink && <Link href="/admin/products" className={buttonVariants({ variant: "secondary", className: "min-h-11 gap-2 rounded-xl" })}><ChevronRight size={16} />بازگشت به محصولات</Link>}
      <AdminSaveButton isSaving={loading} label="ذخیره تنوع‌ها" />
    </div>
  </form>;
}
