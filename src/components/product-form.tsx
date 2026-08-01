"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Card, Input, Spinner, toast } from "@heroui/react";
import { BadgePercent, ChevronRight, FileText, GripVertical, Images, Info, PackageCheck, Ruler, Save, Sparkles, Tag, Trash2 } from "lucide-react";
import { MediaPickerDialog } from "@/components/media-picker-dialog";
import type { MediaChoice } from "@/components/media-library";
import { adminFieldClass, adminLabelClass } from "@/components/admin-ui";
import { HeroSelectField } from "@/components/hero-select-field";
import { AdminCheckbox } from "@/components/admin-checkbox";
import { apiErrorMessage, validationErrorMessage } from "@/lib/form-errors";
import { completeProductSchema } from "@/modules/products/schemas";
import { RichTextEditor } from "@/components/rich-text-editor";
import { HeroDateRangeField } from "@/components/hero-date-range-field";
import { HeroNumberInput } from "@/components/hero-number-input";

type EditableProduct = {
  id: string; sku: string; name: string; slug: string; description: string; categoryId: string; purity: number; weightGrams: number;
  storeIndustry: "GOLD" | "GENERAL"; makingFeeType: string; makingFeeValue: number; profitPercent: number; taxPercent: number; fixedPrice: number | null; stock: number;
  discountType: "PERCENT" | "FIXED" | null; discountValue: number | null; discountStartsAt: string | null; discountEndsAt: string | null;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED"; featured: boolean; media: MediaChoice[]; options: Array<{ name: string; values: Array<{ value: string; colorId: string | null }> }>; optionGuide: MediaChoice | null;
};

type Props = { storeIndustry: "GOLD" | "GENERAL"; categories?: Array<{ id: string; name: string; parentName: string | null }>; product?: EditableProduct };

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
      featured: form.get("featured") === "on", mediaIds: selectedMedia.map((media) => media.id), options: product?.options ?? [], optionGuideId: optionGuide?.id ?? null,
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
      toast.success(product ? "تغییرات محصول ذخیره شد" : "محصول جدید ثبت شد", { description: product ? "اطلاعات محصول با موفقیت به‌روزرسانی شد." : "اکنون تنوع‌ها و موجودی هر مقدار را مدیریت کنید.", timeout: 4000 });
      router.push(product ? "/admin/products" : `/admin/products/${result.id}/options`); router.refresh();
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
            <div className="grid place-items-center rounded-xl border-2 border-dashed border-violet-200 bg-violet-50/50 px-5 py-10 text-center">
              <Ruler size={30} className="mb-3 text-violet-500" />
              <strong className="text-sm text-slate-700">تنوع و موجودی هر مقدار در صفحه اختصاصی مدیریت می‌شود</strong>
              <p className="mt-1 max-w-md text-xs leading-6 text-slate-500">{product ? "برای حفظ سوابق خرید، مقادیر ثبت‌شده حذف نمی‌شوند و از آن صفحه می‌توانید موجودی یا وضعیت فعال آن‌ها را تغییر دهید." : "ابتدا محصول را ثبت کنید؛ بلافاصله برای افزودن تنوع، وزن یا قیمت و موجودی هر مقدار به صفحه مدیریت تنوع منتقل می‌شوید."}</p>
              {product ? <Link href={`/admin/products/${product.id}/options`} className="mt-4 inline-flex min-h-10 items-center justify-center rounded-xl bg-violet-700 px-5 text-xs font-bold text-white">مدیریت تنوع و موجودی</Link> : <Button type="submit" variant="primary" isPending={loading} className="mt-4 min-h-10 gap-2 bg-violet-700 px-5 text-xs font-bold text-white">{({ isPending }) => <>{isPending ? <Spinner color="current" size="sm" /> : <Save size={15} />}{isPending ? "در حال ثبت محصول..." : "ثبت محصول و مدیریت تنوع"}</>}</Button>}
            </div>
            <div className="self-start rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="mb-3 flex items-center justify-between gap-2"><strong className="text-xs text-slate-700">راهنمای انتخاب</strong>{optionGuide && <Button type="button" size="sm" isIconOnly variant="ghost" onPress={() => setOptionGuide(null)} className="h-7 min-h-7 w-7 min-w-7 text-slate-400 hover:text-[#d31736]" aria-label="حذف راهنمای انتخاب"><Trash2 size={14} /></Button>}</div>
              {optionGuide ? <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">{optionGuide.type === "IMAGE" ? <div className="relative aspect-[4/3]"><Image src={optionGuide.url} alt={optionGuide.title} fill sizes="260px" className="object-cover" /></div> : <div className="grid min-h-32 place-items-center text-[#9a7434]"><span className="grid justify-items-center gap-2 text-xs font-bold"><FileText size={34} />فایل PDF راهنما</span></div>}</div> : <div className="grid min-h-32 place-items-center rounded-lg border border-dashed border-slate-300 bg-white text-center text-xs text-slate-400"><span><Ruler className="mx-auto mb-2" size={24} />تصویر یا PDF انتخاب نشده است.</span></div>}
              <Button type="button" variant="secondary" onPress={() => setOptionGuidePickerOpen(true)} className="mt-3 min-h-10 w-full gap-2 border-[#d8c29a] bg-[#fbf7ef] text-xs font-bold text-[#846325]"><Images size={15} />{optionGuide ? "تغییر فایل راهنما" : "انتخاب از گالری"}</Button>
            </div>
          </div>
        </FormSection>

        {storeIndustry === "GOLD" && <FormSection icon={<Tag size={18} />} title="مشخصات و قیمت‌گذاری" description="قیمت بر اساس نرخ روز طلا، وزن، اجرت، سود و مالیات محاسبه می‌شود.">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"><Field label="وزن (گرم)"><HeroNumberInput name="weightGrams" step="0.001" min="0.001" required fullWidth variant="secondary" defaultValue={product?.weightGrams} className={adminFieldClass} /></Field><Field label="عیار"><HeroNumberInput name="purity" min="1" max="999" defaultValue={product?.purity ?? 750} required fullWidth variant="secondary" className={adminFieldClass} /></Field><HeroSelectField name="makingFeeType" label="نوع اجرت" value={makingFeeType} onValueChange={(nextValue) => setMakingFeeType(nextValue as "PERCENT" | "FIXED")} options={[{ value: "PERCENT", label: "درصدی" }, { value: "FIXED", label: "مبلغ ثابت" }]} /><Field label="مقدار اجرت"><HeroNumberInput name="makingFeeValue" step="0.001" defaultValue={product?.makingFeeValue ?? 10} min="0" isPrice={makingFeeType === "FIXED"} required fullWidth variant="secondary" className={adminFieldClass} /></Field><Field label="درصد سود"><HeroNumberInput name="profitPercent" step="0.01" defaultValue={product?.profitPercent ?? 7} min="0" required fullWidth variant="secondary" className={adminFieldClass} /></Field><Field label="درصد مالیات"><HeroNumberInput name="taxPercent" step="0.01" defaultValue={product?.taxPercent ?? 10} min="0" required fullWidth variant="secondary" className={adminFieldClass} /></Field></div>
        </FormSection>}
      </div>

      <aside className="grid gap-4 lg:sticky lg:top-7">
        <Card variant="secondary" className="rounded-2xl border border-slate-200/80 bg-white shadow-sm"><Card.Content className="p-5"><div className="mb-4 flex items-center gap-2"><PackageCheck size={18} className="text-[#9a7434]" /><h2 className="m-0 text-base font-black">انتشار و موجودی</h2></div><div className="grid gap-4"><HeroSelectField name="status" label="وضعیت محصول" defaultValue={product?.status ?? "DRAFT"} options={[{ value: "DRAFT", label: "پیش‌نویس" }, { value: "ACTIVE", label: "منتشرشده" }, { value: "ARCHIVED", label: "بایگانی‌شده" }]} /><Field label="تعداد موجودی انبار"><HeroNumberInput name="stock" defaultValue={product?.stock ?? 1} min="0" required fullWidth variant="secondary" className={adminFieldClass} /></Field><AdminCheckbox name="featured" value="on" defaultSelected={product?.featured ?? false} icon={<Sparkles size={17} />} description="این محصول در بخش پیشنهادهای ویژه فروشگاه نمایش داده می‌شود.">نمایش در محصولات ویژه</AdminCheckbox></div></Card.Content></Card>
        <Card variant="secondary" className="rounded-2xl border border-slate-200/80 bg-white shadow-sm"><Card.Content className="p-5"><div className="mb-4 flex items-center gap-2"><BadgePercent size={18} className="text-rose-500" /><h2 className="m-0 text-base font-black">{storeIndustry === "GENERAL" ? "قیمت و تخفیف" : "تخفیف محصول"}</h2></div><div className="grid gap-4">{storeIndustry === "GENERAL" && <div className="border-b border-slate-100 pb-4"><Field label="قیمت فروش (ریال)"><HeroNumberInput name="fixedPrice" min="1" required isPrice fullWidth variant="secondary" defaultValue={product?.fixedPrice ?? undefined} placeholder="مثلاً ۱,۵۰۰,۰۰۰" className={adminFieldClass} /></Field></div>}<AdminCheckbox isSelected={discountEnabled} onChange={setDiscountEnabled} icon={<BadgePercent size={17} />} description="فقط در بازه انتخاب‌شده به‌صورت خودکار اعمال می‌شود.">تخفیف زمان‌دار محصول</AdminCheckbox>{discountEnabled && <div className="grid gap-4 rounded-xl border border-emerald-200 bg-emerald-50/50 p-3"><HeroSelectField name="discountType" label="نوع تخفیف" value={discountType} onValueChange={(nextValue) => setDiscountType(nextValue as "PERCENT" | "FIXED")} includeEmptyOption={false} options={[{ value: "PERCENT", label: "درصدی" }, { value: "FIXED", label: "مبلغ ثابت (ریال)" }]} /><Field label="مقدار تخفیف"><div className="relative"><HeroNumberInput name="discountValue" min="0.001" step="0.001" required isPrice={discountType === "FIXED"} fullWidth variant="secondary" defaultValue={product?.discountValue ?? undefined} placeholder={discountType === "FIXED" ? "مثلاً ۵۰۰,۰۰۰" : "مثلاً ۱۰"} className={`${adminFieldClass} ${discountType === "FIXED" ? "pl-14" : ""}`} />{discountType === "FIXED" && <span className="pointer-events-none absolute left-3 top-[22px] -translate-y-1/2 text-[11px] font-bold text-slate-400">ریال</span>}</div></Field><HeroDateRangeField label="بازه زمانی (تقویم فارسی)" start={discountRange?.start ?? null} end={discountRange?.end ?? null} onChange={setDiscountRange} /></div>}</div></Card.Content></Card>
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
