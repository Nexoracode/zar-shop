"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, toast } from "@heroui/react";
import { BadgePercent, ChevronRight, FileText, GripVertical, Images, Info, ListChecks, PackageCheck, Ruler, Sparkles, Tag, Trash2 } from "lucide-react";
import { AdminSaveButton } from "@/components/admin-save-button";
import { MediaPickerDialog } from "@/components/media-picker-dialog";
import type { MediaChoice } from "@/components/media-library";
import { adminFieldClass, adminLabelClass } from "@/components/admin-ui";
import { HeroSelectField } from "@/components/hero-select-field";
import { AdminCheckbox } from "@/components/admin-checkbox";
import { AdminSectionHelp, type AdminSectionHelpBlock } from "@/components/admin-section-help";
import { apiErrorMessage, validationErrorMessage } from "@/lib/form-errors";
import { completeProductSchema } from "@/modules/products/schemas";
import { RichTextEditor } from "@/components/rich-text-editor";
import { HeroDateRangeField } from "@/components/hero-date-range-field";
import { HeroNumberInput } from "@/components/hero-number-input";
import type { CategoryAttributeGroup, ProductAttributeValue } from "@/modules/products/attributes";
import { productFieldLimits } from "@/modules/products/schemas";

type EditableProduct = {
  id: string; sku: string; name: string; slug: string; description: string; categoryId: string; purity: number; weightGrams: number;
  storeIndustry: "GOLD" | "GENERAL"; makingFeeType: string; makingFeeValue: number; profitPercent: number; taxPercent: number; fixedPrice: number | null; stock: number; preparationDays: number;
  discountType: "PERCENT" | "FIXED" | null; discountValue: number | null; discountStartsAt: string | null; discountEndsAt: string | null;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED"; featured: boolean; media: MediaChoice[]; options: Array<{ name: string; values: Array<{ value: string; colorId: string | null }> }>; optionGuide: MediaChoice | null;
  attributes: ProductAttributeValue[];
};

type ProductCategoryOption = { id: string; name: string; parentName: string | null; attributeGroups: CategoryAttributeGroup[] };
type Props = { storeIndustry: "GOLD" | "GENERAL"; categories?: ProductCategoryOption[]; product?: EditableProduct };

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
  preparationDays: "زمان آماده‌سازی",
  status: "وضعیت محصول",
  featured: "نمایش در محصولات ویژه",
  mediaIds: "گالری محصول",
  options: "تنوع‌های محصول",
  optionGuideId: "راهنمای انتخاب",
  attributes: "ویژگی‌های محصول",
};

export function ProductForm({ storeIndustry, categories = [], product }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<MediaChoice[]>(product?.media ?? []);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [optionGuidePickerOpen, setOptionGuidePickerOpen] = useState(false);
  const [optionGuide, setOptionGuide] = useState<MediaChoice | null>(product?.optionGuide ?? null);
  const [description, setDescription] = useState(product?.description ?? "");
  const [makingFeeType, setMakingFeeType] = useState<"PERCENT" | "FIXED">(product?.makingFeeType === "FIXED" ? "FIXED" : "PERCENT");
  const [discountEnabled, setDiscountEnabled] = useState(Boolean(product?.discountType));
  const [discountType, setDiscountType] = useState<"PERCENT" | "FIXED">(product?.discountType ?? "PERCENT");
  const [discountRange, setDiscountRange] = useState<{ start: string; end: string } | null>(() => product?.discountStartsAt && product.discountEndsAt ? { start: product.discountStartsAt, end: product.discountEndsAt } : null);
  const [draggedMediaId, setDraggedMediaId] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState(product?.categoryId ?? "");
  const selectedCategory = categories.find((category) => category.id === categoryId);
  const attributeDefinitions = selectedCategory?.attributeGroups.flatMap((group) => group.attributes) ?? [];
  const currentAttributes = product?.categoryId === categoryId ? product.attributes : [];
  const completedAttributeIds = new Set(currentAttributes.filter((attribute) => attribute.values.length).map((attribute) => attribute.attributeId));
  const completedAttributeCount = attributeDefinitions.filter((attribute) => completedAttributeIds.has(attribute.id)).length;
  const importantAttributeCount = attributeDefinitions.filter((attribute) => attribute.important && completedAttributeIds.has(attribute.id)).length;
  const categoryChanged = Boolean(product && product.categoryId !== categoryId);

  function changeCategory(nextCategoryId: string) {
    setCategoryId(nextCategoryId);
  }

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

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true);
    const form = new FormData(event.currentTarget);
    const afterSave = form.get("afterSave") === "attributes" ? "attributes" : "options";
    const body = {
      sku: form.get("sku"), name: form.get("name"), slug: form.get("slug"), description, categoryId,
      storeIndustry, purity: storeIndustry === "GOLD" ? Number(form.get("purity")) : 750, weightGrams: storeIndustry === "GOLD" ? Number(form.get("weightGrams")) : 0,
      makingFeeType: storeIndustry === "GOLD" ? form.get("makingFeeType") : "PERCENT", makingFeeValue: storeIndustry === "GOLD" ? Number(form.get("makingFeeValue")) : 0,
      profitPercent: storeIndustry === "GOLD" ? Number(form.get("profitPercent")) : 0, taxPercent: storeIndustry === "GOLD" ? Number(form.get("taxPercent")) : 0,
      fixedPrice: storeIndustry === "GENERAL" ? Number(form.get("fixedPrice")) : null, stock: Number(form.get("stock")), preparationDays: Number(form.get("preparationDays")), status: form.get("status"),
      discountType: discountEnabled ? form.get("discountType") : null,
      discountValue: discountEnabled ? Number(form.get("discountValue")) : null,
      discountStartsAt: discountEnabled ? discountRange?.start ?? null : null,
      discountEndsAt: discountEnabled ? discountRange?.end ?? null : null,
      featured: form.get("featured") === "on", mediaIds: selectedMedia.map((media) => media.id), options: product?.options ?? [], optionGuideId: optionGuide?.id ?? null, attributes: currentAttributes,
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
      if (!product && (!result || typeof result.id !== "string")) throw new Error("شناسه محصول جدید از سرور دریافت نشد.");
      toast.success(product ? "تغییرات محصول ذخیره شد" : "محصول جدید ثبت شد", { description: product ? "اطلاعات محصول با موفقیت به‌روزرسانی شد." : afterSave === "attributes" ? "اکنون ویژگی‌های توصیفی محصول را تکمیل کنید." : "اکنون تنوع‌ها و موجودی هر مقدار را مدیریت کنید.", timeout: 4000 });
      router.push(product ? "/admin/products" : `/admin/products/${result.id}/${afterSave}`); router.refresh();
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "ارتباط با سرور برقرار نشد.";
      toast.danger("ذخیره محصول انجام نشد", { description: message, timeout: 5000 });
      setLoading(false);
    }
  }

  const inputClass = `${adminFieldClass} text-left`;

  return <>
    <form onSubmit={submit} noValidate className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="grid gap-5">
        <FormSection icon={<Images size={18} />} title="گالری محصول" description="اولین رسانه به‌عنوان تصویر اصلی محصول نمایش داده می‌شود." help={{ summary: "تصاویر و ویدئوهای انتخاب‌شده به‌ترتیب در صفحه محصول نمایش داده می‌شوند.", blocks: [{ title: "ترتیب رسانه", items: ["رسانه‌ها را از گالری مرکزی انتخاب کنید.", "برای تغییر ترتیب، کارت رسانه را بکشید و در جای جدید رها کنید.", "اولین رسانه تصویر اصلی محصول و تصویر کارت‌های فروشگاه است."] }, { title: "ترکیب رسانه‌ها", description: "می‌توانید تصویر و ویدئو را کنار هم قرار دهید؛ تصویر اصلی بهتر است عکس واضح، مربع یا نزدیک به مربع و کم‌حجم باشد." }, { title: "حذف از محصول", tone: "important", description: "آیکون حذف فقط اتصال رسانه به این محصول را برمی‌دارد و فایل اصلی را از گالری مرکزی حذف نمی‌کند." }] }}>
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
                  className={`group cursor-grab overflow-hidden rounded-lg border bg-white shadow-[0_2px_10px_rgba(15,23,42,0.04)] transition active:cursor-grabbing ${draggedMediaId === media.id ? "scale-[0.98] border-[var(--warning)] opacity-50" : "border-slate-200 hover:border-[var(--warning)]/60 hover:shadow-[0_5px_16px_rgba(15,23,42,0.08)]"}`}
                >
                  <div className="relative aspect-square">
                    {media.type === "IMAGE" ? <Image src={media.url} alt={media.title} fill sizes="180px" className="pointer-events-none object-cover" /> : <video src={media.url} muted className="pointer-events-none h-full w-full bg-black object-cover" />}
                    <span className={`absolute right-1.5 top-1.5 grid h-7 min-w-7 place-items-center rounded-md px-1.5 text-[9px] font-bold text-white shadow-sm ${index === 0 ? "bg-[var(--warning)]" : "bg-slate-900/65"}`}>{index === 0 ? "اصلی" : (index + 1).toLocaleString("fa-IR")}</span>
                    <span className="absolute left-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-md bg-white/90 text-slate-500 opacity-80 shadow-sm transition group-hover:opacity-100" title="برای تغییر ترتیب بکشید"><GripVertical size={15} /></span>
                    <Button type="button" size="sm" isIconOnly variant="danger-soft" onPress={() => setSelectedMedia((current) => current.filter((item) => item.id !== media.id))} className="absolute bottom-1.5 left-1.5 h-7 min-h-7 w-7 min-w-7 rounded-md bg-white/90 shadow-sm" aria-label={`حذف رسانه ردیف ${(index + 1).toLocaleString("fa-IR")} از محصول`}><Trash2 size={13} /></Button>
                  </div>
                </Card>
              ))}
            </div>
          ) : <Button type="button" variant="secondary" onPress={() => setPickerOpen(true)} className="grid min-h-32 w-full place-items-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 px-5 text-center text-sm font-bold text-slate-600"><span><Images className="mx-auto mb-2" size={24} />هنوز رسانه‌ای انتخاب نشده است.</span></Button>}
          <Button type="button" variant="secondary" onPress={() => setPickerOpen(true)} className="mt-3 min-h-11 gap-2 border-[var(--warning)]/40 bg-[var(--warning)]/10 px-5 text-sm font-bold text-[var(--warning)]"><Images size={17} />انتخاب از گالری</Button>
        </FormSection>

        <FormSection icon={<Info size={18} />} title="اطلاعات پایه" description="مشخصات اصلی که در صفحه محصول نمایش داده می‌شود.">
          <div className="grid gap-4 sm:grid-cols-2"><Field label="نام محصول"><Input name="name" required maxLength={productFieldLimits.name} fullWidth variant="secondary" defaultValue={product?.name} className={adminFieldClass} /></Field><Field label="کد کالا"><Input name="sku" dir="ltr" required maxLength={productFieldLimits.sku} fullWidth variant="secondary" defaultValue={product?.sku} className={inputClass} /></Field></div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2"><Field label="نشانی انگلیسی"><Input name="slug" dir="ltr" pattern="[a-z0-9-]+" required maxLength={productFieldLimits.slug} fullWidth variant="secondary" defaultValue={product?.slug} placeholder="minimal-gold-ring" className={inputClass} /></Field><HeroSelectField name="categoryId" label="دسته‌بندی" value={categoryId} onValueChange={changeCategory} options={[...categories.map((category) => ({ value: category.id, label: `${category.parentName ? `${category.parentName} ← ` : ""}${category.name}` }))]} /></div>
          <div className={`${adminLabelClass} mt-4`}>توضیحات محصول<RichTextEditor value={product?.description} onChange={setDescription} /></div>
        </FormSection>

        <FormSection icon={<ListChecks size={18} />} title="ویژگی‌های محصول" description="خلاصه مشخصات ثبت‌شده؛ افزودن و ویرایش در صفحه اختصاصی انجام می‌شود." help={{ summary: "فرم اصلی محصول فقط وضعیت تکمیل ویژگی‌ها را نشان می‌دهد تا صفحه خلوت و سریع باقی بماند.", blocks: [{ title: "مدیریت مستقل", description: "پس از ثبت محصول، از دکمه مدیریت ویژگی‌ها وارد صفحه اختصاصی شوید و مقادیر توصیفی را تکمیل کنید." }, { title: "تغییر دسته‌بندی", tone: "important", description: "اگر دسته‌بندی محصول را تغییر داده‌اید، ابتدا فرم را ذخیره کنید؛ سپس ویژگی‌های متناسب با دسته جدید را وارد کنید." }] }}>
          {!categoryId ? <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 py-7 text-center text-xs text-slate-500">برای مشاهده ویژگی‌ها ابتدا دسته‌بندی محصول را انتخاب کنید.</div> : attributeDefinitions.length === 0 ? <div className="rounded-xl border border-amber-200 bg-amber-50 p-4"><strong className="block text-sm text-amber-900">دسته «{selectedCategory?.name}» هنوز ویژگی ندارد</strong><p className="mb-0 mt-1 text-xs leading-6 text-amber-700">ویژگی‌های هر محصول از دسته‌بندی آن خوانده می‌شوند. ابتدا ویژگی‌های موردنیاز این دسته را تعریف کنید.</p><Link href={`/admin/categories/${categoryId}/attributes`} className="mt-3 inline-flex min-h-10 items-center justify-center rounded-xl bg-white px-4 text-xs font-bold text-amber-800 shadow-sm">تعریف ویژگی‌های این دسته</Link></div> : <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-4"><div className="grid gap-2"><p className="m-0 text-[11px] leading-5 text-slate-500">این محصول براساس دسته «{selectedCategory?.name}» دارای {attributeDefinitions.length.toLocaleString("fa-IR")} ویژگی قابل تکمیل است.</p><div className="grid grid-cols-3 gap-2">{[{ label: "تعریف‌شده", value: attributeDefinitions.length }, { label: "تکمیل‌شده", value: completedAttributeCount }, { label: "مهم", value: importantAttributeCount }].map((item) => <div key={item.label} className="rounded-lg border border-slate-200 bg-white px-3 py-2"><strong className="block text-base font-bold text-slate-800">{item.value.toLocaleString("fa-IR")}</strong><span className="text-[10px] text-slate-500">{item.label}</span></div>)}</div></div><div className="flex justify-end">{product ? categoryChanged ? <span className="rounded-lg bg-amber-50 px-3 py-2 text-[11px] font-bold text-amber-700">ابتدا تغییر دسته را ذخیره کنید</span> : <Link href={`/admin/products/${product.id}/attributes`} className="inline-flex min-h-10 items-center justify-center rounded-xl bg-violet-700 px-5 text-xs font-bold text-white">مدیریت ویژگی‌ها</Link> : <AdminSaveButton isSaving={loading} name="afterSave" value="attributes" label="ثبت و مدیریت ویژگی‌ها" savingLabel="در حال ثبت..." />}</div></div>}
        </FormSection>

        <FormSection icon={<Ruler size={18} />} title="تنوع‌های محصول" description="هر نوع ویژگی قابل انتخاب مثل سایز، رنگ، طول یا نوع قفل را تعریف کنید." help={{ summary: "مدیریت کامل تنوع در صفحه مستقل انجام می‌شود تا موجودی، وزن یا قیمت هر مقدار جدا ثبت شود.", blocks: [{ title: "محصول جدید", description: "ابتدا محصول را ذخیره کنید؛ سپس سیستم شما را به صفحه مدیریت تنوع همان محصول منتقل می‌کند." }, { title: "محصول موجود", description: "از دکمه مدیریت تنوع وارد صفحه اختصاصی شوید و گروه‌ها، مقادیر، ترتیب و وضعیت آن‌ها را تغییر دهید." }, { title: "راهنمای انتخاب", description: "می‌توانید یک تصویر یا PDF راهنما برای انتخاب سایز یا مدل ثبت کنید تا مشتری پیش از انتخاب تنوع آن را ببیند." }] }}>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
            <div className="grid place-items-center rounded-xl border-2 border-dashed border-violet-200 bg-violet-50/50 px-5 py-10 text-center">
              <Ruler size={30} className="mb-3 text-violet-500" />
              <strong className="text-sm text-slate-700">تنوع و موجودی هر مقدار در صفحه اختصاصی مدیریت می‌شود</strong>
              <p className="mt-1 max-w-md text-xs leading-6 text-slate-500">{product ? "برای حفظ سوابق خرید، مقادیر ثبت‌شده حذف نمی‌شوند و از آن صفحه می‌توانید موجودی یا وضعیت فعال آن‌ها را تغییر دهید." : "ابتدا محصول را ثبت کنید؛ بلافاصله برای افزودن تنوع، وزن یا قیمت و موجودی هر مقدار به صفحه مدیریت تنوع منتقل می‌شوید."}</p>
              {product ? <Link href={`/admin/products/${product.id}/options`} className="mt-4 inline-flex min-h-10 items-center justify-center rounded-xl bg-violet-700 px-5 text-xs font-bold text-white">مدیریت تنوع و موجودی</Link> : <AdminSaveButton isSaving={loading} label="ثبت محصول و مدیریت تنوع" savingLabel="در حال ثبت محصول..." className="mt-4" />}
            </div>
            <div className="self-start rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="mb-3 flex items-center justify-between gap-2"><strong className="text-xs text-slate-700">راهنمای انتخاب</strong>{optionGuide && <Button type="button" size="sm" isIconOnly variant="ghost" onPress={() => setOptionGuide(null)} className="h-7 min-h-7 w-7 min-w-7 text-slate-400 hover:text-[#d31736]" aria-label="حذف راهنمای انتخاب"><Trash2 size={14} /></Button>}</div>
              {optionGuide ? <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">{optionGuide.type === "IMAGE" ? <div className="relative aspect-[4/3]"><Image src={optionGuide.url} alt={optionGuide.title} fill sizes="260px" className="object-cover" /></div> : <div className="grid min-h-32 place-items-center text-[var(--warning)]"><span className="grid justify-items-center gap-2 text-xs font-bold"><FileText size={34} />فایل PDF راهنما</span></div>}</div> : <div className="grid min-h-32 place-items-center rounded-lg border border-dashed border-slate-300 bg-white text-center text-xs text-slate-400"><span><Ruler className="mx-auto mb-2" size={24} />تصویر یا PDF انتخاب نشده است.</span></div>}
              <Button type="button" variant="secondary" onPress={() => setOptionGuidePickerOpen(true)} className="mt-3 min-h-10 w-full gap-2 border-[var(--warning)]/40 bg-[var(--warning)]/10 text-xs font-bold text-[var(--warning)]"><Images size={15} />{optionGuide ? "تغییر فایل راهنما" : "انتخاب از گالری"}</Button>
            </div>
          </div>
        </FormSection>

        {storeIndustry === "GOLD" && <FormSection icon={<Tag size={18} />} title="مشخصات و قیمت‌گذاری" description="قیمت بر اساس نرخ روز طلا، وزن، اجرت، سود و مالیات محاسبه می‌شود." help={{ summary: "اجزای قیمت طلا با نرخ معتبر سمت سرور محاسبه و هنگام سفارش snapshot می‌شوند.", blocks: [{ title: "اجزای محاسبه", items: ["وزن و عیار ارزش طلای خام را تعیین می‌کنند.", "اجرت می‌تواند درصدی یا مبلغ ثابت باشد.", "سود و مالیات به‌صورت درصدی روی اجزای مربوط محاسبه می‌شوند."] }, { title: "تنوع وزنی", description: "اگر وزن بر اساس سایز یا مدل متفاوت است، وزن پایه را اینجا و وزن دقیق هر مقدار را در صفحه تنوع محصول ثبت کنید." }, { title: "قیمت سفارش", tone: "important", description: "نرخ طلا هنگام ثبت سفارش دوباره بررسی و اجزای قیمت در سفارش ذخیره می‌شوند؛ تغییر نرخ بعدی فاکتور قبلی را تغییر نمی‌دهد." }] }}>
          <div className="grid items-start gap-4 sm:grid-cols-2 xl:grid-cols-3"><Field label="وزن (گرم)"><HeroNumberInput name="weightGrams" step="0.001" min="0.001" suffix="گرم" required fullWidth variant="secondary" defaultValue={product?.weightGrams} className={adminFieldClass} /></Field><Field label="عیار"><HeroNumberInput name="purity" min="1" max="999" suffix="عیار" defaultValue={product?.purity ?? 750} required fullWidth variant="secondary" className={adminFieldClass} /></Field><HeroSelectField name="makingFeeType" label="نوع اجرت" value={makingFeeType} onValueChange={(nextValue) => setMakingFeeType(nextValue as "PERCENT" | "FIXED")} options={[{ value: "PERCENT", label: "درصدی" }, { value: "FIXED", label: "مبلغ ثابت" }]} /><Field label="مقدار اجرت"><HeroNumberInput name="makingFeeValue" step="0.001" defaultValue={product?.makingFeeValue ?? 10} min="0" suffix={makingFeeType === "FIXED" ? "ریال" : "%"} isPrice={makingFeeType === "FIXED"} reserveHelperSpace required fullWidth variant="secondary" className={adminFieldClass} /></Field><Field label="درصد سود"><HeroNumberInput name="profitPercent" step="0.01" defaultValue={product?.profitPercent ?? 7} min="0" suffix="%" reserveHelperSpace required fullWidth variant="secondary" className={adminFieldClass} /></Field><Field label="درصد مالیات"><HeroNumberInput name="taxPercent" step="0.01" defaultValue={product?.taxPercent ?? 10} min="0" suffix="%" reserveHelperSpace required fullWidth variant="secondary" className={adminFieldClass} /></Field></div>
        </FormSection>}
      </div>

      <aside className="grid gap-4 lg:sticky lg:top-7">
        <Card variant="secondary" className="rounded-2xl border border-slate-200/80 bg-white shadow-sm"><Card.Content className="p-5"><div className="mb-4 flex items-center gap-2"><PackageCheck size={18} className="text-[var(--warning)]" /><h2 className="m-0 text-base font-bold">انتشار و موجودی</h2><div className="mr-auto"><AdminSectionHelp title="انتشار و موجودی" summary="وضعیت نمایش، موجودی پایه، زمان آماده‌سازی و حضور در محصولات ویژه را کنترل کنید." blocks={[{ title: "وضعیت محصول", items: ["پیش‌نویس فقط در پنل نگهداری می‌شود.", "منتشرشده برای مشتری قابل مشاهده و خرید است.", "بایگانی‌شده از فروش خارج می‌شود اما سابقه آن حفظ می‌شود."] }, { title: "موجودی و آماده‌سازی", description: "موجودی اینجا مقدار پایه محصول است؛ موجودی مستقل هر رنگ یا سایز در صفحه تنوع ثبت می‌شود. زمان آماده‌سازی نیز مخصوص همین محصول است." }, { title: "پیش از انتشار", tone: "important", description: `تصویر اصلی، دسته‌بندی، ${storeIndustry === "GOLD" ? "وزن" : "قیمت"} و موجودی را بررسی کنید.` }]} /></div></div><div className="grid gap-4"><HeroSelectField name="status" label="وضعیت محصول" defaultValue={product?.status ?? "DRAFT"} options={[{ value: "DRAFT", label: "پیش‌نویس" }, { value: "ACTIVE", label: "منتشرشده" }, { value: "ARCHIVED", label: "بایگانی‌شده" }]} /><Field label="تعداد موجودی انبار"><HeroNumberInput name="stock" defaultValue={product?.stock ?? 1} min="0" required fullWidth variant="secondary" className={adminFieldClass} /></Field><Field label="زمان آماده‌سازی"><HeroNumberInput name="preparationDays" defaultValue={product?.preparationDays ?? 2} min="0" max="90" suffix="روز" required fullWidth variant="secondary" className={adminFieldClass} /></Field><AdminCheckbox name="featured" value="on" defaultSelected={product?.featured ?? false} icon={<Sparkles size={17} />} description="این محصول در بخش پیشنهادهای ویژه فروشگاه نمایش داده می‌شود.">نمایش در محصولات ویژه</AdminCheckbox></div></Card.Content></Card>
        <Card variant="secondary" className="rounded-2xl border border-slate-200/80 bg-white shadow-sm"><Card.Content className="p-5"><div className="mb-4 flex items-center gap-2"><BadgePercent size={18} className="text-rose-500" /><h2 className="m-0 text-base font-bold">{storeIndustry === "GENERAL" ? "قیمت و تخفیف" : "تخفیف محصول"}</h2><div className="mr-auto"><AdminSectionHelp title={storeIndustry === "GENERAL" ? "قیمت و تخفیف" : "تخفیف محصول"} summary="قیمت پایه و تخفیف زمان‌دار این محصول را مستقل از پروموشن‌های سبد خرید مدیریت کنید." blocks={[{ title: "قیمت پایه", description: storeIndustry === "GENERAL" ? "قیمت فروش محصول عادی به ریال ثبت می‌شود؛ اگر تنوع قیمت مستقل داشته باشد، قیمت هر مقدار در صفحه تنوع وارد می‌شود." : "قیمت پایه طلا از مشخصات وزن و نرخ روز محاسبه می‌شود و در این کارت مبلغ ثابت وارد نمی‌شود." }, { title: "تخفیف زمان‌دار", items: ["نوع درصدی یا مبلغ ثابت را انتخاب کنید.", "مقدار تخفیف و بازه شروع و پایان را با تقویم فارسی ثبت کنید.", "تخفیف فقط داخل همین بازه به‌صورت خودکار فعال است."] }, { title: "تداخل تخفیف‌ها", tone: "important", description: "این تخفیف مربوط به خود محصول است. کد تخفیف و سایر کمپین‌ها طبق قواعد مالی پروموشن در سبد خرید محاسبه می‌شوند." }]} /></div></div><div className="grid gap-4">{storeIndustry === "GENERAL" && <div className="border-b border-slate-100 pb-4"><Field label="قیمت فروش (ریال)"><HeroNumberInput name="fixedPrice" min="1" required isPrice fullWidth variant="secondary" defaultValue={product?.fixedPrice ?? undefined} placeholder="مثلاً ۱,۵۰۰,۰۰۰" className={adminFieldClass} /></Field></div>}<AdminCheckbox isSelected={discountEnabled} onChange={setDiscountEnabled} icon={<BadgePercent size={17} />} description="فقط در بازه انتخاب‌شده به‌صورت خودکار اعمال می‌شود.">تخفیف زمان‌دار محصول</AdminCheckbox>{discountEnabled && <div className="grid gap-4 rounded-xl border border-emerald-200 bg-emerald-50/50 p-3"><HeroSelectField name="discountType" label="نوع تخفیف" value={discountType} onValueChange={(nextValue) => setDiscountType(nextValue as "PERCENT" | "FIXED")} includeEmptyOption={false} options={[{ value: "PERCENT", label: "درصدی" }, { value: "FIXED", label: "مبلغ ثابت (ریال)" }]} /><Field label="مقدار تخفیف"><HeroNumberInput name="discountValue" min="0.001" step="0.001" required suffix={discountType === "FIXED" ? "ریال" : "%"} isPrice={discountType === "FIXED"} fullWidth variant="secondary" defaultValue={product?.discountValue ?? undefined} placeholder={discountType === "FIXED" ? "مثلاً ۵۰۰,۰۰۰" : "مثلاً ۱۰"} className={adminFieldClass} /></Field><HeroDateRangeField label="بازه زمانی (تقویم فارسی)" withTime start={discountRange?.start ?? null} end={discountRange?.end ?? null} onChange={setDiscountRange} /></div>}</div></Card.Content></Card>
        <div className="grid gap-2"><AdminSaveButton isSaving={loading} label={product ? "ذخیره تغییرات" : "ثبت محصول"} fullWidth /><Link href="/admin/products" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-600"><ChevronRight size={16} />بازگشت به محصولات</Link></div>
      </aside>
    </form>
    <MediaPickerDialog open={pickerOpen} scope="PRODUCT" multiple allowedTypes={["IMAGE", "VIDEO"]} selected={selectedMedia} onClose={() => setPickerOpen(false)} onConfirm={setSelectedMedia} />
    <MediaPickerDialog open={optionGuidePickerOpen} scope="PRODUCT" allowedTypes={["IMAGE", "DOCUMENT"]} selected={optionGuide ? [optionGuide] : []} onClose={() => setOptionGuidePickerOpen(false)} onConfirm={(items) => setOptionGuide(items[0] ?? null)} />
  </>;
}

function FormSection({ icon, title, description, children, help }: { icon: ReactNode; title: string; description: string; children: ReactNode; help?: { summary: string; blocks: AdminSectionHelpBlock[] } }) {
  return <Card variant="secondary" className="rounded-2xl border border-slate-200/80 bg-white shadow-sm"><Card.Content className="p-4 sm:p-6"><div className="mb-5 flex items-start gap-3 border-b border-slate-100 pb-4"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--warning)]/10 text-[var(--warning)]">{icon}</span><div className="min-w-0"><h2 className="m-0 text-base font-bold text-slate-800">{title}</h2><p className="m-0 text-xs text-slate-400">{description}</p></div>{help && <div className="mr-auto"><AdminSectionHelp title={title} summary={help.summary} blocks={help.blocks} /></div>}</div>{children}</Card.Content></Card>;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className={adminLabelClass}>{label}{children}</label>;
}
