"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@heroui/react";
import { FileText, GripVertical, Images, Ruler, Trash2 } from "lucide-react";
import { MediaPickerDialog } from "@/components/media-picker-dialog";
import type { MediaChoice } from "@/components/media-library";
import { RichTextEditor } from "@/components/rich-text-editor";
import { requestErrorMessage, requestJson } from "@/lib/api-request";
import { completeProductSchema } from "@/modules/products/schemas";
import type { CategoryAttributeGroup, ProductAttributeValue } from "@/modules/products/attributes";
import { BpButton } from "./ui/button";
import { BpCorners, BpKicker } from "./ui/card";
import { BpCombobox } from "./ui/combobox";
import { BpDateTimeField } from "./ui/date-time-field";
import { BpInput } from "./ui/input";
import { BpNumberInput } from "./ui/number-input";
import { BlueprintProductAttributes } from "./product-attributes-panel";
import { BpSeg } from "./ui/seg";
import { BpSelect } from "./ui/select";
import { BpSwitch } from "./ui/switch";
import { BpFieldMessage } from "./ui/field-message";
import { productFieldLimits } from "@/modules/products/schemas";

export type EditableProduct = {
  id: string; sku: string; name: string; slug: string; description: string; categoryId: string; purity: number; weightGrams: number;
  storeIndustry: "GOLD" | "GENERAL"; makingFeeType: string; makingFeeValue: number; profitPercent: number; taxPercent: number; fixedPrice: number | null; stock: number; preparationDays: number;
  discountType: "PERCENT" | "FIXED" | null; discountValue: number | null; discountStartsAt: string | null; discountEndsAt: string | null;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED"; featured: boolean; media: MediaChoice[]; options: Array<{ name: string; values: Array<{ value: string; colorId: string | null }> }>; optionGuide: MediaChoice | null;
  attributes: ProductAttributeValue[];
};

export type ProductCategoryOption = { id: string; name: string; parentName: string | null; attributeGroups: CategoryAttributeGroup[] };
type Props = { storeIndustry: "GOLD" | "GENERAL"; categories?: ProductCategoryOption[]; product?: EditableProduct };

/** Errors are keyed by the schema's own field names, so a zod issue maps straight onto a field. */
type FieldErrors = Record<string, string>;

function Panel({ title, description, action, children, className = "" }: { title: string; description?: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`bp-frame relative p-[18px] ${className}`.trim()}>
      <BpCorners />
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <BpKicker>{title}</BpKicker>
          {description && <p className="bp-muted mb-0 mt-1 text-[12px] leading-6">{description}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export function BlueprintProductForm({ storeIndustry, categories = [], product }: Props) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  const [name, setName] = useState(product?.name ?? "");
  const [sku, setSku] = useState(product?.sku ?? "");
  const [slug, setSlug] = useState(product?.slug ?? "");
  const [categoryId, setCategoryId] = useState(product?.categoryId ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [status, setStatus] = useState<"DRAFT" | "ACTIVE" | "ARCHIVED">(product?.status ?? "DRAFT");
  const [featured, setFeatured] = useState(product?.featured ?? false);
  const [stock, setStock] = useState(String(product?.stock ?? 1));
  const [preparationDays, setPreparationDays] = useState(String(product?.preparationDays ?? 2));
  const [fixedPrice, setFixedPrice] = useState(product?.fixedPrice != null ? String(product.fixedPrice) : "");

  const [weightGrams, setWeightGrams] = useState(String(product?.weightGrams ?? ""));
  const [purity, setPurity] = useState(String(product?.purity ?? 750));
  const [makingFeeType, setMakingFeeType] = useState<"PERCENT" | "FIXED">(product?.makingFeeType === "FIXED" ? "FIXED" : "PERCENT");
  const [makingFeeValue, setMakingFeeValue] = useState(String(product?.makingFeeValue ?? 10));
  const [profitPercent, setProfitPercent] = useState(String(product?.profitPercent ?? 7));
  const [taxPercent, setTaxPercent] = useState(String(product?.taxPercent ?? 10));

  const [discountEnabled, setDiscountEnabled] = useState(Boolean(product?.discountType));
  const [discountType, setDiscountType] = useState<"PERCENT" | "FIXED">(product?.discountType ?? "PERCENT");
  const [discountValue, setDiscountValue] = useState(product?.discountValue != null ? String(product.discountValue) : "");
  const [discountStartsAt, setDiscountStartsAt] = useState<string | null>(product?.discountStartsAt ?? null);
  const [discountEndsAt, setDiscountEndsAt] = useState<string | null>(product?.discountEndsAt ?? null);

  const [selectedMedia, setSelectedMedia] = useState<MediaChoice[]>(product?.media ?? []);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [optionGuide, setOptionGuide] = useState<MediaChoice | null>(product?.optionGuide ?? null);
  const [optionGuidePickerOpen, setOptionGuidePickerOpen] = useState(false);
  const [draggedMediaId, setDraggedMediaId] = useState<string | null>(null);

  const selectedCategory = categories.find((category) => category.id === categoryId);
  /*
   * Both sides of the attributes panel are edited here now. The groups belong to the category,
   * so they are seeded from it and written back to it on save; the values are the product's.
   */
  const [attributeGroups, setAttributeGroups] = useState<CategoryAttributeGroup[]>(selectedCategory?.attributeGroups ?? []);
  const [attributeValues, setAttributeValues] = useState<ProductAttributeValue[]>(product?.categoryId === categoryId ? product.attributes : []);
  // Picking a different category reseeds both: its groups have nothing to do with the last
  // one's, and values keyed to attributes that no longer exist would be dropped on save anyway.
  // Adjusted during render rather than in an effect, so no frame shows the wrong category's rows.
  const [seededCategoryId, setSeededCategoryId] = useState(categoryId);
  if (seededCategoryId !== categoryId) {
    setSeededCategoryId(categoryId);
    setAttributeGroups(selectedCategory?.attributeGroups ?? []);
    setAttributeValues(product?.categoryId === categoryId ? product.attributes : []);
  }
  const currentAttributes = attributeValues;
  const attributeGroupsChanged = JSON.stringify(attributeGroups) !== JSON.stringify(selectedCategory?.attributeGroups ?? []);

  function clearError(field: string) {
    setErrors((current) => (current[field] ? { ...current, [field]: undefined as unknown as string } : current));
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

  function buildBody() {
    return {
      sku, name, slug, description, categoryId, storeIndustry,
      purity: storeIndustry === "GOLD" ? Number(purity) : 750,
      weightGrams: storeIndustry === "GOLD" ? Number(weightGrams) : 0,
      makingFeeType: storeIndustry === "GOLD" ? makingFeeType : "PERCENT",
      makingFeeValue: storeIndustry === "GOLD" ? Number(makingFeeValue) : 0,
      profitPercent: storeIndustry === "GOLD" ? Number(profitPercent) : 0,
      taxPercent: storeIndustry === "GOLD" ? Number(taxPercent) : 0,
      fixedPrice: storeIndustry === "GENERAL" ? Number(fixedPrice) : null,
      stock: Number(stock), preparationDays: Number(preparationDays), status,
      discountType: discountEnabled ? discountType : null,
      discountValue: discountEnabled && discountValue !== "" ? Number(discountValue) : null,
      discountStartsAt: discountEnabled ? discountStartsAt : null,
      discountEndsAt: discountEnabled ? discountEndsAt : null,
      featured, mediaIds: selectedMedia.map((media) => media.id),
      options: product?.options ?? [], optionGuideId: optionGuide?.id ?? null, attributes: currentAttributes,
    };
  }

  async function submit(afterSave: "list" | "attributes" | "options") {
    const validation = completeProductSchema.safeParse(buildBody());
    if (!validation.success) {
      // One message per field, straight from the schema that the server uses too.
      const found: FieldErrors = {};
      const unattached: string[] = [];
      for (const issue of validation.error.issues) {
        const field = String(issue.path[0] ?? "");
        if (!field) { unattached.push(issue.message); continue; }
        if (!found[field]) found[field] = issue.message;
      }
      setErrors(found);
      // A rule that belongs to the form as a whole has no field to sit under, so it is announced
      // instead of being dropped silently.
      if (unattached.length) toast.danger("اطلاعات محصول کامل نیست", { description: unattached[0] });
      const first = Object.keys(found)[0];
      if (first) formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
      return;
    }
    setLoading(true);
    try {
      if (categoryId && attributeGroupsChanged) {
        await requestJson(`/api/categories/${categoryId}/attributes`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(attributeGroups.filter((group) => group.name.trim() && group.attributes.every((attribute) => attribute.name.trim()))),
        }, { fallbackMessage: "ذخیره گروه‌های مشخصات ناموفق بود." });
      }
      const result = await requestJson<{ id?: string }>(product ? `/api/products/${product.id}` : "/api/products", {
        method: product ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validation.data),
      }, { fallbackMessage: "ذخیره محصول ناموفق بود." });
      const id = product?.id ?? result?.id;
      if (!id) throw new Error("شناسه محصول جدید از سرور دریافت نشد.");
      setErrors({});
      toast.success(product ? "تغییرات محصول ذخیره شد" : "محصول جدید ثبت شد");
      router.push(afterSave === "list" ? "/admin/products" : `/admin/products/${id}/${afterSave}`);
      router.refresh();
    } catch (reason) {
      toast.danger("ذخیره محصول انجام نشد", { description: requestErrorMessage(reason, "ارتباط با سرور برقرار نشد.") });
      setLoading(false);
    }
  }

  return <>
    <form ref={formRef} noValidate onSubmit={(event) => { event.preventDefault(); void submit("list"); }} className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="grid gap-5">
        <Panel
          title="گالری محصول"
          description="اولین رسانه به‌عنوان تصویر شاخص استفاده می‌شود. برای تغییر ترتیب، کارت را بکشید و رها کنید."
          action={<BpButton size="sm" className="gap-2" onClick={() => setPickerOpen(true)}><Images size={15} />انتخاب از گالری</BpButton>}
        >
          {selectedMedia.length ? (
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {selectedMedia.map((media, index) => (
                <div
                  key={media.id}
                  draggable
                  onDragStart={(event) => { event.dataTransfer.effectAllowed = "move"; setDraggedMediaId(media.id); }}
                  onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "move"; }}
                  onDrop={(event) => { event.preventDefault(); moveMedia(media.id); setDraggedMediaId(null); }}
                  onDragEnd={() => setDraggedMediaId(null)}
                  className={`relative aspect-square cursor-grab border active:cursor-grabbing ${draggedMediaId === media.id ? "border-[var(--bp-accent)] opacity-50" : "border-[var(--bp-divider)]"}`}
                >
                  {media.type === "IMAGE"
                    ? <Image src={media.url} alt={media.title} fill sizes="180px" className="pointer-events-none object-cover" />
                    : <video src={media.url} muted className="pointer-events-none h-full w-full bg-black object-cover" />}
                  <span className={`absolute right-1 top-1 px-1.5 py-0.5 text-[10px] ${index === 0 ? "bg-[var(--bp-accent)] text-[var(--bp-bg)]" : "bg-[var(--bp-surface)] text-[var(--bp-text)]"}`}>{index === 0 ? "شاخص" : (index + 1).toLocaleString("fa-IR")}</span>
                  <span className="absolute left-1 top-1 text-[var(--bp-muted)]" title="برای تغییر ترتیب بکشید"><GripVertical size={14} /></span>
                  <BpButton isIconOnly size="sm" variant="ghost" aria-label={`حذف رسانه ${(index + 1).toLocaleString("fa-IR")}`} onClick={() => setSelectedMedia((current) => current.filter((item) => item.id !== media.id))} className="absolute bottom-1 left-1 bg-[var(--bp-bg)] text-[var(--bp-danger)]"><Trash2 size={13} /></BpButton>
                </div>
              ))}
            </div>
          ) : (
            <button type="button" onClick={() => setPickerOpen(true)} className="grid min-h-28 w-full place-items-center border border-dashed border-[var(--bp-divider)] text-[13px] text-[var(--bp-muted)] hover:bg-[var(--bp-hover)]">
              <span><Images className="mx-auto mb-2" size={22} />هنوز رسانه‌ای انتخاب نشده است.</span>
            </button>
          )}
          <BpFieldMessage id="media-message" error={errors.mediaIds} reserve={Boolean(errors.mediaIds)} />
        </Panel>

        <Panel title="اطلاعات پایه">
          <div className="grid gap-3 sm:grid-cols-2">
            <BpInput name="name" label="نام محصول" required maxLength={productFieldLimits.name} value={name} error={errors.name} placeholder="مثلاً انگشتر مینیمال طلا" onChange={(event) => { setName(event.target.value); clearError("name"); }} />
            <BpInput name="sku" label="کد کالا (SKU)" required dir="ltr" maxLength={productFieldLimits.sku} value={sku} error={errors.sku} placeholder="PRD-10245" onChange={(event) => { setSku(event.target.value); clearError("sku"); }} />
            <BpInput name="slug" label="نشانی انگلیسی (Slug)" required dir="ltr" maxLength={productFieldLimits.slug} value={slug} error={errors.slug} hint="فقط حروف کوچک انگلیسی، رقم و خط تیره" placeholder="minimal-gold-ring" onChange={(event) => { setSlug(event.target.value); clearError("slug"); }} />
            <BpCombobox
              name="categoryId"
              label="دسته‌بندی"
              required
              value={categoryId}
              error={errors.categoryId}
              placeholder="نام دسته را بنویسید یا انتخاب کنید"
              emptyLabel="دسته‌بندی با این نام پیدا نشد"
              onChange={(next) => { setCategoryId(next); clearError("categoryId"); }}
              options={categories.map((category) => ({ value: category.id, label: `${category.parentName ? `${category.parentName} ← ` : ""}${category.name}` }))}
            />
          </div>
        </Panel>

        <Panel title="توضیحات محصول">
          <RichTextEditor value={product?.description} onChange={setDescription} />
          <BpFieldMessage id="description-message" error={errors.description} reserve={Boolean(errors.description)} />
        </Panel>

        <Panel
          title="مشخصات محصول"
          description="مشخصات محصول را اضافه کنید. گروه‌ها و نام ویژگی‌ها به دسته‌بندی تعلق دارند و روی همه محصولات همان دسته اثر می‌گذارند؛ مقدارها مخصوص همین محصول است."
        >
          {!categoryId ? (
            <p className="bp-muted m-0 border border-dashed border-[var(--bp-divider)] p-4 text-center text-[12px]">برای افزودن مشخصات ابتدا دسته‌بندی محصول را انتخاب کنید.</p>
          ) : (
            <BlueprintProductAttributes
              categoryName={selectedCategory?.name ?? ""}
              groups={attributeGroups}
              values={attributeValues}
              onGroupsChange={setAttributeGroups}
              onValuesChange={setAttributeValues}
            />
          )}
        </Panel>

        <Panel title="تنوع محصول" description="تنوع، موجودی و قیمت هر مقدار در صفحه اختصاصی مدیریت می‌شود.">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
            <div className="grid place-items-center border border-dashed border-[var(--bp-divider)] p-6 text-center">
              <Ruler size={26} className="mb-2 text-[var(--bp-accent)]" />
              <p className="bp-muted mb-3 max-w-md text-[12px] leading-6">{product ? "برای حفظ سوابق خرید، مقادیر ثبت‌شده حذف نمی‌شوند." : "ابتدا محصول را ثبت کنید تا به صفحه مدیریت تنوع منتقل شوید."}</p>
              {product
                ? <Link href={`/admin/products/${product.id}/options`} className="bp-btn bp-btn-secondary bp-btn-sm">مدیریت تنوع و موجودی</Link>
                : <BpButton size="sm" isPending={loading} onClick={() => void submit("options")}>ثبت محصول و مدیریت تنوع</BpButton>}
            </div>
            <div className="border border-[var(--bp-divider)] p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-[12px] font-bold">راهنمای انتخاب</span>
                {optionGuide && <BpButton isIconOnly size="sm" variant="ghost" aria-label="حذف راهنمای انتخاب" onClick={() => setOptionGuide(null)}><Trash2 size={13} /></BpButton>}
              </div>
              {optionGuide
                ? optionGuide.type === "IMAGE"
                  ? <div className="relative aspect-[4/3] border border-[var(--bp-divider)]"><Image src={optionGuide.url} alt={optionGuide.title} fill sizes="220px" className="object-cover" /></div>
                  : <div className="grid min-h-24 place-items-center border border-[var(--bp-divider)] text-[var(--bp-accent)]"><span className="grid justify-items-center gap-1 text-[11px]"><FileText size={26} />فایل PDF راهنما</span></div>
                : <div className="bp-muted grid min-h-24 place-items-center border border-dashed border-[var(--bp-divider)] text-center text-[11px]">فایلی انتخاب نشده است.</div>}
              <BpButton size="sm" fullWidth className="mt-2.5 gap-2" onClick={() => setOptionGuidePickerOpen(true)}><Images size={14} />{optionGuide ? "تغییر فایل" : "انتخاب از گالری"}</BpButton>
            </div>
          </div>
        </Panel>

        {storeIndustry === "GOLD" && (
          <Panel title="مشخصات و قیمت‌گذاری" description="قیمت از نرخ روز طلا، وزن، اجرت، سود و مالیات محاسبه می‌شود.">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <BpInput name="weightGrams" label="وزن (گرم)" required type="number" step="0.001" min="0.001" dir="ltr" value={weightGrams} error={errors.weightGrams} onChange={(event) => { setWeightGrams(event.target.value); clearError("weightGrams"); }} />
              <BpInput name="purity" label="عیار" required type="number" min="1" max="999" dir="ltr" value={purity} error={errors.purity} onChange={(event) => { setPurity(event.target.value); clearError("purity"); }} />
              <BpSelect name="makingFeeType" label="نوع اجرت" value={makingFeeType} error={errors.makingFeeType} onChange={(event) => setMakingFeeType(event.target.value as "PERCENT" | "FIXED")} options={[{ value: "PERCENT", label: "درصدی" }, { value: "FIXED", label: "مبلغ ثابت" }]} />
              <BpNumberInput name="makingFeeValue" label={`مقدار اجرت (${makingFeeType === "FIXED" ? "ریال" : "درصد"})`} required allowDecimal isPrice={makingFeeType === "FIXED"} value={makingFeeValue} error={errors.makingFeeValue} onValueChange={(next) => { setMakingFeeValue(next); clearError("makingFeeValue"); }} />
              <BpInput name="profitPercent" label="درصد سود" required type="number" step="0.01" min="0" dir="ltr" value={profitPercent} error={errors.profitPercent} onChange={(event) => { setProfitPercent(event.target.value); clearError("profitPercent"); }} />
              <BpInput name="taxPercent" label="درصد مالیات" required type="number" step="0.01" min="0" dir="ltr" value={taxPercent} error={errors.taxPercent} onChange={(event) => { setTaxPercent(event.target.value); clearError("taxPercent"); }} />
            </div>
          </Panel>
        )}

        <Panel title="موجودی و آماده‌سازی">
          <div className="grid gap-3 sm:grid-cols-2">
            <BpInput name="stock" label="تعداد موجودی در انبار" required type="number" min="0" dir="ltr" value={stock} error={errors.stock} onChange={(event) => { setStock(event.target.value); clearError("stock"); }} />
            <BpInput name="preparationDays" label="زمان آماده‌سازی (روز)" required type="number" min="0" max="90" dir="ltr" value={preparationDays} error={errors.preparationDays} onChange={(event) => { setPreparationDays(event.target.value); clearError("preparationDays"); }} />
          </div>
        </Panel>

        <Panel title={storeIndustry === "GENERAL" ? "قیمت و تخفیف" : "تخفیف محصول"}>
          {storeIndustry === "GENERAL" && (
            <div className="mb-3 border-b border-[var(--bp-divider)] pb-3 sm:max-w-xs">
              <BpNumberInput name="fixedPrice" label="قیمت فروش (ریال)" required isPrice value={fixedPrice} error={errors.fixedPrice} placeholder="۱٬۵۰۰٬۰۰۰" onValueChange={(next) => { setFixedPrice(next); clearError("fixedPrice"); }} />
            </div>
          )}
          <div className="flex items-center justify-between gap-3">
            <span className="bp-muted text-[12px]">فقط در بازه انتخاب‌شده به‌صورت خودکار اعمال می‌شود.</span>
            <BpSwitch isSelected={discountEnabled} onChange={setDiscountEnabled}>تخفیف داشته باشد</BpSwitch>
          </div>
          {discountEnabled && (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="bp-field">
                <label>نوع تخفیف</label>
                <BpSeg
                  label="نوع تخفیف"
                  fullWidth
                  value={discountType}
                  onChange={(value) => { setDiscountType(value); clearError("discountType"); }}
                  options={[{ value: "PERCENT", label: "درصدی" }, { value: "FIXED", label: "مبلغ ثابت" }]}
                />
                <BpFieldMessage id="discountType-message" error={errors.discountType} />
              </div>
              <BpNumberInput name="discountValue" label={discountType === "FIXED" ? "مبلغ تخفیف (ریال)" : "درصد تخفیف"} required allowDecimal isPrice={discountType === "FIXED"} value={discountValue} error={errors.discountValue} onValueChange={(next) => { setDiscountValue(next); clearError("discountValue"); }} />
              <BpDateTimeField label="تاریخ و ساعت شروع" value={discountStartsAt} error={errors.discountStartsAt} onChange={(value) => { setDiscountStartsAt(value); clearError("discountStartsAt"); }} />
              <BpDateTimeField label="تاریخ و ساعت پایان" value={discountEndsAt} error={errors.discountEndsAt} onChange={(value) => { setDiscountEndsAt(value); clearError("discountEndsAt"); }} />
            </div>
          )}
        </Panel>
      </div>

      {/* Stays in view while the long left column scrolls. */}
      <aside className="grid gap-5 lg:sticky lg:top-20">
        <Panel title="وضعیت انتشار">
          <BpSeg
            label="وضعیت انتشار"
            fullWidth
            value={status}
            onChange={(value) => setStatus(value)}
            options={[{ value: "ACTIVE", label: "انتشار" }, { value: "DRAFT", label: "پیش‌نویس" }, { value: "ARCHIVED", label: "بایگانی" }]}
          />
          <div className="mt-3">
            <BpSwitch isSelected={featured} onChange={setFeatured}>نمایش در محصولات ویژه</BpSwitch>
          </div>
          <div className="mt-4 grid gap-2">
            <BpButton type="submit" variant="primary" fullWidth withCorners isPending={loading}>{product ? "ذخیره و بازگشت به لیست" : "ثبت و بازگشت به لیست"}</BpButton>
            <Link href="/admin/products" className="bp-btn bp-btn-secondary bp-btn-block">انصراف</Link>
          </div>
        </Panel>

      </aside>
    </form>

    <MediaPickerDialog open={pickerOpen} scope="PRODUCT" multiple allowedTypes={["IMAGE", "VIDEO"]} selected={selectedMedia} onClose={() => setPickerOpen(false)} onConfirm={setSelectedMedia} />
    <MediaPickerDialog open={optionGuidePickerOpen} scope="PRODUCT" allowedTypes={["IMAGE", "DOCUMENT"]} selected={optionGuide ? [optionGuide] : []} onClose={() => setOptionGuidePickerOpen(false)} onConfirm={(items) => setOptionGuide(items[0] ?? null)} />
  </>;
}
