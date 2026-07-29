"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Card, Input, Spinner, toast } from "@heroui/react";
import { BadgePercent, ChevronRight, FileText, GripVertical, Images, Info, PackageCheck, Plus, Ruler, Save, Sparkles, Tag, Trash2, X } from "lucide-react";
import { MediaPickerDialog } from "@/components/media-picker-dialog";
import type { MediaChoice } from "@/components/media-library";
import { adminFieldClass, adminLabelClass } from "@/components/admin-ui";
import { HeroSelectField } from "@/components/hero-select-field";
import { AdminCheckbox } from "@/components/admin-checkbox";
import { apiErrorMessage, validationErrorMessage } from "@/lib/form-errors";
import { completeProductSchema } from "@/modules/products/schemas";
import { RichTextEditor } from "@/components/rich-text-editor";
import { HeroDateRangeField } from "@/components/hero-date-range-field";

type EditableProduct = {
  id: string; sku: string; name: string; slug: string; description: string; categoryId: string; purity: number; weightGrams: number;
  storeIndustry: "GOLD" | "GENERAL"; makingFeeType: string; makingFeeValue: number; profitPercent: number; taxPercent: number; fixedPrice: number | null; stock: number;
  discountType: "PERCENT" | "FIXED" | null; discountValue: number | null; discountStartsAt: string | null; discountEndsAt: string | null;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED"; featured: boolean; media: MediaChoice[]; options: Array<{ name: string; values: Array<{ value: string; colorId: string | null }> }>; optionGuide: MediaChoice | null;
};

type DraftOption = { key: string; name: string; values: Array<{ value: string; colorId: string | null }>; valueInput: string };

type Props = { storeIndustry: "GOLD" | "GENERAL"; categories?: Array<{ id: string; name: string; parentName: string | null }>; colors?: Array<{ id: string; name: string; hex: string }>; product?: EditableProduct };

const productFieldLabels: Record<string, string> = {
  sku: "کد کالا",
  name: "نام محصول",
  slug: "نشانی انگلیسی",
  description: "توضیحات محصول",
  categoryId: "دسته‌بندی",
  purity: "عیار",
  weightGrams: "وزن",
  makingFeeType: "نوع اجرت",
  makingFeeValue: "مقدار اجرت",
  profitPercent: "درصد سود",
  taxPercent: "درصد مالیات",
  fixedPrice: "قیمت محصول",
  discountType: "نوع تخفیف",
  discountValue: "مقدار تخفیف",
  discountStartsAt: "شروع تخفیف",
  discountEndsAt: "پایان تخفیف",
  stock: "موجودی انبار",
  status: "وضعیت محصول",
  featured: "نمایش در محصولات ویژه",
  mediaIds: "گالری محصول",
  options: "تنوع‌های محصول",
  optionGuideId: "راهنمای انتخاب",
};

export function ProductForm({ storeIndustry, categories = [], colors = [], product }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<MediaChoice[]>(product?.media ?? []);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [optionGuidePickerOpen, setOptionGuidePickerOpen] = useState(false);
  const [optionGuide, setOptionGuide] = useState<MediaChoice | null>(product?.optionGuide ?? null);
  const [description, setDescription] = useState(product?.description ?? "");
  const [discountEnabled, setDiscountEnabled] = useState(Boolean(product?.discountType));
  const [discountRange, setDiscountRange] = useState<{ start: string; end: string } | null>(() => product?.discountStartsAt && product.discountEndsAt ? { start: product.discountStartsAt, end: product.discountEndsAt } : null);
  const [options, setOptions] = useState<DraftOption[]>(() => product?.options.map((option, index) => ({ key: `existing-${index}`, ...option, valueInput: "" })) ?? []);
  const [draggedOptionKey, setDraggedOptionKey] = useState<string | null>(null);
  const [draggedMediaId, setDraggedMediaId] = useState<string | null>(null);

  function moveMedia(targetId: string) {
    if (!draggedMediaId || draggedMediaId === targetId) return;
    setSelectedMedia((current) => {
      const sourceIndex = current.findIndex((item) => item.id === draggedMediaId);
      const targetIndex = current.findIndex((item) => item.id === targetId);
      if (sourceIndex < 0 || targetIndex < 0) return current;
      const next = [...current];
      const [moved] = next.splice(sourceIndex, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
  }

  function updateOption(key: string, update: Partial<DraftOption>) {
    setOptions((current) => current.map((option) => option.key === key ? { ...option, ...update } : option));
  }

  function addOptionGroup() {
    setOptions((current) => {
      if (current.length >= 10) return current;
      return [...current, { key: `option-${Date.now()}-${Math.random().toString(36).slice(2)}`, name: "", values: [], valueInput: "" }];
    });
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
    if (!colorId) return;
    const color = colors.find((item) => item.id === colorId);
    if (!color) return;
    setOptions((current) => current.map((option) => {
      if (option.key !== key) return option;
      if (option.values.some((item) => item.colorId === colorId)) {
        toast.warning("این رنگ قبلاً انتخاب شده است");
        return option;
      }
      return { ...option, values: [...option.values, { value: color.name, colorId }] };
    }));
  }

  function updateOptionValueColor(key: string, value: string, colorId: string) {
    setOptions((current) => current.map((option) => option.key === key ? {
      ...option,
      values: option.values.map((item) => item.value === value ? { ...item, colorId: colorId || null } : item),
    } : option));
  }

  function moveOption(targetKey: string) {
    if (!draggedOptionKey || draggedOptionKey === targetKey) return;
    setOptions((current) => {
      const sourceIndex = current.findIndex((option) => option.key === draggedOptionKey);
      const targetIndex = current.findIndex((option) => option.key === targetKey);
      if (sourceIndex < 0 || targetIndex < 0) return current;
      const next = [...current];
      const [moved] = next.splice(sourceIndex, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true);
    const form = new FormData(event.currentTarget);
    const submittedOptions = options.map((option) => {
      const pendingValue = option.valueInput.trim();
      return { name: option.name, values: !option.name.includes("رنگ") && pendingValue && !option.values.some((item) => item.value === pendingValue) ? [...option.values, { value: pendingValue, colorId: null }] : option.values };
    });
    const body = {
      sku: form.get("sku"), name: form.get("name"), slug: form.get("slug"), description, categoryId: form.get("categoryId") || null,
      storeIndustry, purity: storeIndustry === "GOLD" ? Number(form.get("purity")) : 750, weightGrams: storeIndustry === "GOLD" ? Number(form.get("weightGrams")) : 0,
      makingFeeType: storeIndustry === "GOLD" ? form.get("makingFeeType") : "PERCENT", makingFeeValue: storeIndustry === "GOLD" ? Number(form.get("makingFeeValue")) : 0,
      profitPercent: storeIndustry === "GOLD" ? Number(form.get("profitPercent")) : 0, taxPercent: storeIndustry === "GOLD" ? Number(form.get("taxPercent")) : 0,
      fixedPrice: storeIndustry === "GENERAL" ? Number(form.get("fixedPrice")) : null, stock: Number(form.get("stock")), status: form.get("status"),
      discountType: discountEnabled ? form.get("discountType") : null,
      discountValue: discountEnabled ? Number(form.get("discountValue")) : null,
      discountStartsAt: discountEnabled ? discountRange?.start ?? null : null,
      discountEndsAt: discountEnabled ? discountRange?.end ?? null : null,
      featured: form.get("featured") === "on", mediaIds: selectedMedia.map((media) => media.id), options: submittedOptions, optionGuideId: optionGuide?.id ?? null,
    };
    const validation = completeProductSchema.safeParse(body);
    if (!validation.success) {
      const message = validationErrorMessage(validation.error.issues, productFieldLabels);
      toast.danger("اطلاعات محصول کامل نیست", { description: message, timeout: 5000 });
      setLoading(false);
      return;
    }
    try {
      const response = await fetch(product ? `/api/products/${product.id}` : "/api/products", { method: product ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(validation.data) });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(apiErrorMessage(result, "ذخیره محصول ناموفق بود.", productFieldLabels));
      toast.success(product ? "تغییرات محصول ذخیره شد" : "محصول جدید ثبت شد", { description: product ? "اطلاعات محصول با موفقیت به‌روزرسانی شد." : "محصول با موفقیت به فهرست فروشگاه اضافه شد.", timeout: 4000 });
      router.push("/admin/products"); router.refresh();
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "ارتباط با سرور برقرار نشد.";
      toast.danger("ذخیره محصول انجام نشد", { description: message, timeout: 5000 });
      setLoading(false);
    }
  }

  const inputClass = `${adminFieldClass} text-left`;

  return <>
    <form onSubmit={submit} noValidate className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="grid gap-5">
        <FormSection icon={<Images size={18} />} title="گالری محصول" description="اولین رسانه به‌عنوان تصویر اصلی محصول نمایش داده می‌شود.">
          {selectedMedia.length ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
              {selectedMedia.map((media, index) => (
                <Card
                  key={media.id}
                  variant="secondary"
                  draggable
                  onDragStart={(event) => { event.dataTransfer.effectAllowed = "move"; setDraggedMediaId(media.id); }}
                  onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "move"; }}
                  onDrop={(event) => { event.preventDefault(); moveMedia(media.id); setDraggedMediaId(null); }}
                  onDragEnd={() => setDraggedMediaId(null)}
                  className={`group cursor-grab overflow-hidden rounded-lg border bg-white shadow-[0_2px_10px_rgba(15,23,42,0.04)] transition active:cursor-grabbing ${draggedMediaId === media.id ? "scale-[0.98] border-[#b5904c] opacity-50" : "border-slate-200 hover:border-[#c9ad75] hover:shadow-[0_5px_16px_rgba(15,23,42,0.08)]"}`}
                >
                  <div className="relative aspect-square">
                    {media.type === "IMAGE" ? <Image src={media.url} alt={media.title} fill sizes="180px" className="pointer-events-none object-cover" /> : <video src={media.url} muted className="pointer-events-none h-full w-full bg-black object-cover" />}
                    <span className={`absolute right-1.5 top-1.5 grid h-7 min-w-7 place-items-center rounded-md px-1.5 text-[9px] font-black text-white shadow-sm ${index === 0 ? "bg-[#b5904c]" : "bg-slate-900/65"}`}>{index === 0 ? "اصلی" : (index + 1).toLocaleString("fa-IR")}</span>
                    <span className="absolute left-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-md bg-white/90 text-slate-500 opacity-80 shadow-sm transition group-hover:opacity-100" title="برای تغییر ترتیب بکشید"><GripVertical size={15} /></span>
                    <Button type="button" size="sm" isIconOnly variant="danger-soft" onPress={() => setSelectedMedia((current) => current.filter((item) => item.id !== media.id))} className="absolute bottom-1.5 left-1.5 h-7 min-h-7 w-7 min-w-7 rounded-md bg-white/90 shadow-sm" aria-label={`حذف رسانه ردیف ${(index + 1).toLocaleString("fa-IR")} از محصول`}><Trash2 size={13} /></Button>
                  </div>
                </Card>
              ))}
            </div>
          ) : <Button type="button" variant="secondary" onPress={() => setPickerOpen(true)} className="grid min-h-32 w-full place-items-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 px-5 text-center text-sm font-bold text-slate-600"><span><Images className="mx-auto mb-2" size={24} />هنوز رسانه‌ای انتخاب نشده است.</span></Button>}
          <Button type="button" variant="secondary" onPress={() => setPickerOpen(true)} className="mt-3 min-h-11 gap-2 border-[#d8c29a] bg-[#fbf7ef] px-5 text-sm font-bold text-[#846325]"><Images size={17} />انتخاب از گالری</Button>
        </FormSection>

        <FormSection icon={<Info size={18} />} title="اطلاعات پایه" description="مشخصات اصلی که در صفحه محصول نمایش داده می‌شود.">
          <div className="grid gap-4 sm:grid-cols-2"><Field label="نام محصول"><Input name="name" required fullWidth variant="secondary" defaultValue={product?.name} className={adminFieldClass} /></Field><Field label="کد کالا"><Input name="sku" dir="ltr" required fullWidth variant="secondary" defaultValue={product?.sku} className={inputClass} /></Field></div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2"><Field label="نشانی انگلیسی"><Input name="slug" dir="ltr" pattern="[a-z0-9-]+" required fullWidth variant="secondary" defaultValue={product?.slug} placeholder="minimal-gold-ring" className={inputClass} /></Field><HeroSelectField name="categoryId" label="دسته‌بندی" defaultValue={product?.categoryId ?? ""} options={[{ value: "", label: "بدون دسته‌بندی" }, ...categories.map((category) => ({ value: category.id, label: `${category.parentName ? `${category.parentName} ← ` : ""}${category.name}` }))]} /></div>
          <div className={`${adminLabelClass} mt-4`}>توضیحات محصول<RichTextEditor value={product?.description} onChange={setDescription} /></div>
        </FormSection>

        <FormSection icon={<Ruler size={18} />} title="تنوع‌های محصول" description="هر نوع ویژگی قابل انتخاب مثل سایز، رنگ، طول یا نوع قفل را تعریف کنید.">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
            {product ? <div className="grid place-items-center rounded-xl border-2 border-dashed border-violet-200 bg-violet-50/50 px-5 py-10 text-center"><Ruler size={30} className="mb-3 text-violet-500" /><strong className="text-sm text-slate-700">تنوع و موجودی هر مقدار در صفحه اختصاصی مدیریت می‌شود</strong><p className="mt-1 max-w-md text-xs leading-6 text-slate-500">برای حفظ سوابق خرید، مقادیر ثبت‌شده حذف نمی‌شوند و از آن صفحه می‌توانید موجودی یا وضعیت فعال آن‌ها را تغییر دهید.</p><Link href={`/admin/products/${product.id}/options`} className="mt-4 inline-flex min-h-10 items-center justify-center rounded-xl bg-violet-700 px-5 text-xs font-bold text-white">مدیریت تنوع و موجودی</Link></div> : <div className="grid gap-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div><strong className="text-sm text-slate-700">گروه‌های تنوع</strong><p className="mt-1 text-xs text-slate-400">مشتری باید از هر گروه یک مقدار انتخاب کند.</p></div>
                <Button type="button" variant="secondary" isDisabled={options.length >= 10} onPress={addOptionGroup} className="min-h-10 gap-1 border border-[#d8c29a] bg-[#fbf7ef] px-4 text-xs font-bold text-[#846325]"><Plus size={15} />افزودن نوع تنوع</Button>
              </div>
              {options.length ? <>{options.map((option, optionIndex) => (
                <div key={option.key} onDragOver={(event) => event.preventDefault()} onDrop={() => { moveOption(option.key); setDraggedOptionKey(null); }} className={`rounded-xl border bg-white p-3 shadow-sm ${draggedOptionKey === option.key ? "border-[#b5904c] opacity-50" : "border-slate-200"}`}>
                  <div className="mb-2 flex items-center justify-between gap-2"><span className="rounded-md bg-[#f4ead8] px-2 py-1 text-[11px] font-black text-[#785b27]">تنوع {(optionIndex + 1).toLocaleString("fa-IR")}</span><span className="text-[11px] text-slate-400">{option.values.length.toLocaleString("fa-IR")} مقدار ثبت‌شده</span></div>
                  <div className="mb-3 flex items-end gap-2">
                    <span draggable onDragStart={() => setDraggedOptionKey(option.key)} onDragEnd={() => setDraggedOptionKey(null)} className="mb-1 grid h-10 shrink-0 cursor-grab place-items-center text-slate-400 active:cursor-grabbing" title="برای تغییر ترتیب بکشید"><GripVertical size={17} /></span>
                    <label className={`${adminLabelClass} min-w-0 flex-1`}>عنوان تنوع<Input value={option.name} onChange={(event) => updateOption(option.key, { name: event.target.value })} fullWidth variant="secondary" placeholder="مثلاً سایز، رنگ یا طول زنجیر" className={adminFieldClass} /></label>
                    <Button type="button" size="sm" isIconOnly variant="ghost" onPress={() => setOptions((current) => current.filter((item) => item.key !== option.key))} className="mb-1 h-9 min-h-9 w-9 min-w-9 text-slate-400 hover:text-[#d31736]" aria-label={`حذف تنوع ردیف ${(optionIndex + 1).toLocaleString("fa-IR")}`}><Trash2 size={15} /></Button>
                  </div>
                  {option.name.includes("رنگ") ? <div className={adminLabelClass}>انتخاب رنگ<HeroSelectField name={`new-color-${option.key}`} ariaLabel="انتخاب رنگ" value="" onValueChange={(colorId) => addOptionColor(option.key, colorId)} placeholder={colors.length ? "یک رنگ را انتخاب کنید" : "رنگی ثبت نشده"} disabled={!colors.length} options={colors.filter((color) => !option.values.some((item) => item.colorId === color.id)).map((color) => ({ value: color.id, label: `${color.name} (${color.hex})` }))} /></div> : <label className={adminLabelClass}>مقادیر قابل انتخاب<span className="flex gap-2"><Input value={option.valueInput} onChange={(event) => updateOption(option.key, { valueInput: event.target.value })} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addOptionValue(option.key); } }} fullWidth variant="secondary" placeholder="مثلاً ۱۲" className={adminFieldClass} /><Button type="button" variant="secondary" onPress={() => addOptionValue(option.key)} className="min-h-11 shrink-0 gap-1 border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-600"><Plus size={14} />افزودن</Button></span></label>}
                  {option.name.includes("رنگ") && !colors.length && <p className="mt-2 text-xs text-amber-700">هنوز رنگی ثبت نشده است. <Link href="/admin/colors" className="font-black underline underline-offset-2">رفتن به صفحه رنگ‌ها</Link></p>}
                  {option.values.length ? <div className="mt-3 grid gap-2">{option.values.map((item) => { const color = colors.find((candidate) => candidate.id === item.colorId); return <div key={item.value} className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs font-bold text-slate-700"><span className="inline-flex min-w-24 flex-1 items-center gap-2">{color && <span className="h-4 w-4 rounded-full border border-slate-300" style={{ backgroundColor: color.hex }} aria-label={`رنگ ${color.name}`} />}{color?.name ?? item.value}</span>{option.name.includes("رنگ") && !item.colorId && <HeroSelectField name={`repair-color-${option.key}-${item.value}`} ariaLabel={`انتخاب رنگ برای ${item.value}`} value="" onValueChange={(colorId) => updateOptionValueColor(option.key, item.value, colorId)} placeholder="انتخاب رنگ" disabled={!colors.length} options={colors.map((candidate) => ({ value: candidate.id, label: `${candidate.name} (${candidate.hex})` }))} className="min-w-52 flex-1 sm:max-w-64" />}<Button type="button" size="sm" isIconOnly variant="ghost" onPress={() => updateOption(option.key, { values: option.values.filter((value) => value.value !== item.value) })} className="h-6 min-h-6 w-6 min-w-6 text-slate-400 hover:text-[#d31736]" aria-label={`حذف مقدار ${item.value}`}><X size={13} /></Button></div>; })}</div> : <p className="mt-2 text-xs text-amber-700">حداقل یک مقدار برای این تنوع اضافه کنید.</p>}
                </div>
              ))}<Button type="button" variant="secondary" isDisabled={options.length >= 10} onPress={addOptionGroup} className="min-h-11 w-full gap-2 border-2 border-dashed border-[#d8c29a] bg-[#fffcf6] text-sm font-bold text-[#846325]"><Plus size={16} />{options.length >= 10 ? "حداکثر ۱۰ تنوع ثبت شده است" : "افزودن تنوع دیگر"}</Button></> : <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-center text-xs leading-6 text-slate-500">اگر محصول تنوع ندارد، این بخش را خالی بگذارید. برای محصولات مختلف می‌توانید هم‌زمان گروه‌هایی مثل سایز، رنگ، طول و نوع قفل تعریف کنید.</div>}
            </div>}
            <div className="self-start rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="mb-3 flex items-center justify-between gap-2"><strong className="text-xs text-slate-700">راهنمای انتخاب</strong>{optionGuide && <Button type="button" size="sm" isIconOnly variant="ghost" onPress={() => setOptionGuide(null)} className="h-7 min-h-7 w-7 min-w-7 text-slate-400 hover:text-[#d31736]" aria-label="حذف راهنمای انتخاب"><Trash2 size={14} /></Button>}</div>
              {optionGuide ? <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">{optionGuide.type === "IMAGE" ? <div className="relative aspect-[4/3]"><Image src={optionGuide.url} alt={optionGuide.title} fill sizes="260px" className="object-cover" /></div> : <div className="grid min-h-32 place-items-center text-[#9a7434]"><span className="grid justify-items-center gap-2 text-xs font-bold"><FileText size={34} />فایل PDF راهنما</span></div>}</div> : <div className="grid min-h-32 place-items-center rounded-lg border border-dashed border-slate-300 bg-white text-center text-xs text-slate-400"><span><Ruler className="mx-auto mb-2" size={24} />تصویر یا PDF انتخاب نشده است.</span></div>}
              <Button type="button" variant="secondary" onPress={() => setOptionGuidePickerOpen(true)} className="mt-3 min-h-10 w-full gap-2 border-[#d8c29a] bg-[#fbf7ef] text-xs font-bold text-[#846325]"><Images size={15} />{optionGuide ? "تغییر فایل راهنما" : "انتخاب از گالری"}</Button>
            </div>
          </div>
        </FormSection>

        <FormSection icon={<Tag size={18} />} title="مشخصات و قیمت‌گذاری" description={storeIndustry === "GOLD" ? "قیمت بر اساس نرخ روز طلا، وزن، اجرت، سود و مالیات محاسبه می‌شود." : "برای محصول معمولی، قیمت فروش را مستقیم به ریال وارد کنید."}>
          {storeIndustry === "GOLD" ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"><Field label="وزن (گرم)"><Input name="weightGrams" type="number" step="0.001" min="0.001" required fullWidth variant="secondary" defaultValue={product?.weightGrams} className={adminFieldClass} /></Field><Field label="عیار"><Input name="purity" type="number" min="1" max="999" defaultValue={product?.purity ?? 750} required fullWidth variant="secondary" className={adminFieldClass} /></Field><HeroSelectField name="makingFeeType" label="نوع اجرت" defaultValue={product?.makingFeeType ?? "PERCENT"} options={[{ value: "PERCENT", label: "درصدی" }, { value: "FIXED", label: "مبلغ ثابت" }]} /><Field label="مقدار اجرت"><Input name="makingFeeValue" type="number" step="0.001" defaultValue={product?.makingFeeValue ?? 10} min="0" required fullWidth variant="secondary" className={adminFieldClass} /></Field><Field label="درصد سود"><Input name="profitPercent" type="number" step="0.01" defaultValue={product?.profitPercent ?? 7} min="0" required fullWidth variant="secondary" className={adminFieldClass} /></Field><Field label="درصد مالیات"><Input name="taxPercent" type="number" step="0.01" defaultValue={product?.taxPercent ?? 10} min="0" required fullWidth variant="secondary" className={adminFieldClass} /></Field></div> : <div className="max-w-md"><Field label="قیمت فروش (ریال)"><Input name="fixedPrice" type="number" min="1" required fullWidth variant="secondary" defaultValue={product?.fixedPrice ?? undefined} placeholder="مثلاً ۱۵۰۰۰۰۰" className={adminFieldClass} /></Field></div>}
        </FormSection>
      </div>

      <aside className="grid gap-4 lg:sticky lg:top-7">
        <Card variant="secondary" className="rounded-2xl border border-slate-200/80 bg-white shadow-sm"><Card.Content className="p-5"><div className="mb-4 flex items-center gap-2"><PackageCheck size={18} className="text-[#9a7434]" /><h2 className="m-0 text-base font-black">انتشار و موجودی</h2></div><div className="grid gap-4"><HeroSelectField name="status" label="وضعیت محصول" defaultValue={product?.status ?? "DRAFT"} options={[{ value: "DRAFT", label: "پیش‌نویس" }, { value: "ACTIVE", label: "منتشرشده" }, { value: "ARCHIVED", label: "بایگانی‌شده" }]} /><Field label="تعداد موجودی انبار"><Input name="stock" type="number" defaultValue={product?.stock ?? 1} min="0" required fullWidth variant="secondary" className={adminFieldClass} /></Field><AdminCheckbox name="featured" value="on" defaultSelected={product?.featured ?? false} icon={<Sparkles size={17} />} description="این محصول در بخش پیشنهادهای ویژه فروشگاه نمایش داده می‌شود.">نمایش در محصولات ویژه</AdminCheckbox></div></Card.Content></Card>
        <Card variant="secondary" className="rounded-2xl border border-slate-200/80 bg-white shadow-sm"><Card.Content className="p-5"><div className="mb-4 flex items-center gap-2"><BadgePercent size={18} className="text-rose-500" /><h2 className="m-0 text-base font-black">تخفیف و قیمت</h2></div><div className="grid gap-4"><AdminCheckbox isSelected={discountEnabled} onChange={setDiscountEnabled} icon={<BadgePercent size={17} />} description="فقط در بازه انتخاب‌شده به‌صورت خودکار اعمال می‌شود.">تخفیف زمان‌دار محصول</AdminCheckbox>{discountEnabled && <div className="grid gap-4 rounded-xl border border-emerald-200 bg-emerald-50/50 p-3"><HeroSelectField name="discountType" label="نوع تخفیف" defaultValue={product?.discountType ?? "PERCENT"} includeEmptyOption={false} options={[{ value: "PERCENT", label: "درصدی" }, { value: "FIXED", label: "مبلغ ثابت (ریال)" }]} /><Field label="مقدار تخفیف"><Input name="discountValue" type="number" min="0.001" step="0.001" required fullWidth variant="secondary" defaultValue={product?.discountValue ?? undefined} placeholder="مثلاً ۱۰" className={adminFieldClass} /></Field><HeroDateRangeField label="بازه زمانی (تقویم فارسی)" start={discountRange?.start ?? null} end={discountRange?.end ?? null} onChange={setDiscountRange} /></div>}</div></Card.Content></Card>
        <Alert status="warning" className="border border-amber-300 bg-amber-50 text-amber-950 shadow-sm">
          <div className="grid gap-1.5">
            <Alert.Title className="block text-sm font-black text-amber-950">نکته مهم</Alert.Title>
            <Alert.Description className="block text-xs leading-6 text-amber-900">پیش از انتشار محصول، تصویر اصلی، دسته‌بندی، {storeIndustry === "GOLD" ? "وزن" : "قیمت"} و موجودی را بررسی کنید.</Alert.Description>
          </div>
        </Alert>
        <div className="grid gap-2"><Button type="submit" isPending={loading} variant="primary" fullWidth className="min-h-12 gap-2 bg-[#172b4d] px-5 text-sm font-bold text-white shadow-lg">{({ isPending }) => <>{isPending ? <Spinner color="current" size="sm" /> : <Save size={17} />}{isPending ? "در حال ذخیره..." : product ? "ذخیره تغییرات" : "ثبت محصول"}</>}</Button><Link href="/admin/products" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-600"><ChevronRight size={16} />بازگشت به محصولات</Link></div>
      </aside>
    </form>
    <MediaPickerDialog open={pickerOpen} scope="PRODUCT" multiple allowedTypes={["IMAGE", "VIDEO"]} selected={selectedMedia} onClose={() => setPickerOpen(false)} onConfirm={setSelectedMedia} />
    <MediaPickerDialog open={optionGuidePickerOpen} scope="PRODUCT" allowedTypes={["IMAGE", "DOCUMENT"]} selected={optionGuide ? [optionGuide] : []} onClose={() => setOptionGuidePickerOpen(false)} onConfirm={(items) => setOptionGuide(items[0] ?? null)} />
  </>;
}

function FormSection({ icon, title, description, children }: { icon: ReactNode; title: string; description: string; children: ReactNode }) {
  return <Card variant="secondary" className="rounded-2xl border border-slate-200/80 bg-white shadow-sm"><Card.Content className="p-4 sm:p-6"><div className="mb-5 flex items-start gap-3 border-b border-slate-100 pb-4"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#fbf7ef] text-[#9a7434]">{icon}</span><div><h2 className="m-0 text-base font-black text-slate-800">{title}</h2><p className="m-0 text-xs text-slate-400">{description}</p></div></div>{children}</Card.Content></Card>;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className={adminLabelClass}>{label}{children}</label>;
}
