"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@heroui/react";
import { ChevronDown, FileText, GripVertical, Images, Trash2 } from "lucide-react";
import { MediaPickerDialog } from "@/components/media-picker-dialog";
import type { MediaChoice } from "@/components/media-library";
import { RichTextEditor } from "@/components/rich-text-editor";
import { requestErrorMessage, requestJson } from "@/lib/api-request";
import { completeProductSchema } from "@/modules/products/schemas";
import type { CategoryAttributeGroup, ProductAttributeValue } from "@/modules/products/attributes";
import { BpButton } from "./ui/button";
import { BpKicker } from "./ui/card";
import { BpCombobox } from "./ui/combobox";
import { BpDateTimeField } from "./ui/date-time-field";
import { BpInput } from "./ui/input";
import { BpNumberInput } from "./ui/number-input";
import { BpPopover } from "./ui/popover";
import { BlueprintProductAttributes } from "./product-attributes-panel";
import { BlueprintProductOptions, type LibraryType, type ProductTypeDraft, type VariantDraft } from "./product-options-panel";
import { BpSeg } from "./ui/seg";
import { BpSelect } from "./ui/select";
import { BpSwitch } from "./ui/switch";
import { BpFieldMessage } from "./ui/field-message";
import { productFieldLimits } from "@/modules/products/schemas";
import { useUnsavedChangesWarning } from "@/components/admin/use-unsaved-changes-warning";

export type EditableProduct = {
  id: string; sku: string; name: string; slug: string; description: string; categoryId: string; purity: number; weightGrams: number;
  storeIndustry: "GOLD" | "GENERAL"; makingFeeType: string; makingFeeValue: number; profitPercent: number; taxPercent: number; fixedPrice: number | null; stock: number; preparationDays: number;
  discountType: "PERCENT" | "FIXED" | null; discountValue: number | null; discountStartsAt: string | null; discountEndsAt: string | null;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED"; featured: boolean; media: MediaChoice[]; optionTypes: ProductTypeDraft[]; variants: VariantDraft[]; optionGuide: MediaChoice | null;
  shippingWeightGrams: number | null; packageLengthCm: number | null; packageWidthCm: number | null; packageHeightCm: number | null;
  minOrderQuantity: number; maxOrderQuantity: number | null;
  attributes: ProductAttributeValue[];
};

export type ProductCategoryOption = { id: string; name: string; parentName: string | null; attributeGroups: CategoryAttributeGroup[] };
type Props = { storeIndustry: "GOLD" | "GENERAL"; categories?: ProductCategoryOption[]; colors?: Array<{ id: string; name: string; hex: string }>; optionLibrary?: LibraryType[]; product?: EditableProduct };

/** Errors are keyed by the schema's own field names, so a zod issue maps straight onto a field. */
type FieldErrors = Record<string, string>;

function Panel({ title, description, action, children, className = "" }: { title: string; description?: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    // `min-w-0`: a grid item's automatic minimum size is its content's own — without this, a wide
    // table inside (the combinations table, in particular) forced this whole column wider than
    // its track and spilled onto the sticky sidebar instead of scrolling within itself.
    <section className={`bp-frame relative min-w-0 p-[18px] ${className}`.trim()}>
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

export function BlueprintProductForm({ storeIndustry, categories = [], colors = [], optionLibrary = [], product }: Props) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const saveMenuTriggerRef = useRef<HTMLButtonElement>(null);
  const [loading, setLoading] = useState(false);
  const [saveMenuOpen, setSaveMenuOpen] = useState(false);
  // Whichever trigger started the save — the main button or a menu item — so the spinner sits
  // next to that same wording instead of always the main button's own label.
  const [pendingLabel, setPendingLabel] = useState("");
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
  const [shippingWeightGrams, setShippingWeightGrams] = useState(product?.shippingWeightGrams != null ? String(product.shippingWeightGrams) : "");
  const [packageLengthCm, setPackageLengthCm] = useState(product?.packageLengthCm != null ? String(product.packageLengthCm) : "");
  const [packageWidthCm, setPackageWidthCm] = useState(product?.packageWidthCm != null ? String(product.packageWidthCm) : "");
  const [packageHeightCm, setPackageHeightCm] = useState(product?.packageHeightCm != null ? String(product.packageHeightCm) : "");
  const [minOrderQuantity, setMinOrderQuantity] = useState(String(product?.minOrderQuantity ?? 1));
  const [maxOrderQuantity, setMaxOrderQuantity] = useState(product?.maxOrderQuantity != null ? String(product.maxOrderQuantity) : "");
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
  // A "فروش ویژه" is the same discount with no schedule at all — always on instead of racing a
  // window. Existing data always carries both dates together, so this only ever starts true for
  // a product that was already saved without one.
  const [discountIsSpecialSale, setDiscountIsSpecialSale] = useState(Boolean(product?.discountType) && !product?.discountStartsAt);
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
  const [optionTypes, setOptionTypes] = useState<ProductTypeDraft[]>(product?.optionTypes ?? []);
  const [variants, setVariants] = useState<VariantDraft[]>(product?.variants ?? []);
  // A type or value added from inside this form lands in the library immediately, so the picker
  // has to see it without waiting for the page to be fetched again.
  const [library, setLibrary] = useState<LibraryType[]>(optionLibrary);
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
      shippingWeightGrams, packageLengthCm, packageWidthCm, packageHeightCm,
      minOrderQuantity: Number(minOrderQuantity), maxOrderQuantity,
      discountType: discountEnabled ? discountType : null,
      discountValue: discountEnabled && discountValue !== "" ? Number(discountValue) : null,
      discountStartsAt: discountEnabled && !discountIsSpecialSale ? discountStartsAt : null,
      discountEndsAt: discountEnabled && !discountIsSpecialSale ? discountEndsAt : null,
      featured, mediaIds: selectedMedia.map((media) => media.id),
      optionTypes, variants, optionGuideId: optionGuide?.id ?? null, attributes: currentAttributes,
    };
  }

  // Captured once, on the very first render: the loaded product's own values when editing, or
  // the form's empty defaults when creating one — either way, "what the form looked like before
  // the reader touched anything."
  const initialBodyRef = useRef<string | null>(null);
  if (initialBodyRef.current === null) initialBodyRef.current = JSON.stringify(buildBody());
  const isDirty = attributeGroupsChanged || JSON.stringify(buildBody()) !== initialBodyRef.current;
  useUnsavedChangesWarning(isDirty);

  async function submit(afterSave: "list" | "attributes" | "duplicate" | "new") {
    const validation = completeProductSchema.safeParse(buildBody());
    if (!validation.success) {
      // One message per field, straight from the schema that the server uses too.
      const found: FieldErrors = {};
      const unattached: string[] = [];
      for (const issue of validation.error.issues) {
        const field = String(issue.path[0] ?? "");
        // A row inside the variants table has no single field of its own to sit under either —
        // it is announced the same way a rule with no path at all is.
        if (!field || field === "variants") { unattached.push(issue.message); continue; }
        if (!found[field]) found[field] = issue.message;
      }
      setErrors(found);
      // A rule that belongs to the form as a whole has no field to sit under, so it is announced
      // instead of being dropped silently.
      if (unattached.length) toast.danger("اطلاعات محصول کامل نیست", { description: unattached[0] });
      const first = Object.keys(found)[0];
      // A numeric control keeps `name` on its hidden raw-value input, so the visible box is
      // found by `data-field` instead; document order puts the visible one first.
      if (first) formRef.current?.querySelector<HTMLElement>(`[name="${first}"], [data-field="${first}"]`)?.focus();
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
      // The save just landed, so this is the new "unchanged" baseline — otherwise the tab-close
      // warning would still fire off the pre-save snapshot for the moment before navigation lands.
      initialBodyRef.current = JSON.stringify(buildBody());
      toast.success(product ? "تغییرات محصول ذخیره شد" : "محصول جدید ثبت شد");

      if (afterSave === "duplicate") {
        // The main product is already saved at this point — a failure past here means the
        // duplicate itself, not the edits just made, so it gets its own message and the admin
        // stays right where they are instead of losing the page they were just on.
        try {
          const suffix = Math.random().toString(36).slice(2, 6);
          const duplicate = await requestJson<{ id: string }>("/api/products", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...validation.data, sku: `${validation.data.sku}-${suffix}`, slug: `${validation.data.slug}-${suffix}`, name: `${validation.data.name} (کپی)`, status: "DRAFT" }),
          }, { fallbackMessage: "تکثیر محصول انجام نشد." });
          toast.success("یک نسخه تکثیرشده از محصول ساخته شد");
          router.push(`/admin/products/${duplicate.id}/edit`);
          router.refresh();
        } catch (reason) {
          toast.danger("تکثیر محصول انجام نشد", { description: requestErrorMessage(reason, "ارتباط با سرور برقرار نشد.") });
          setLoading(false);
        }
        return;
      }

      router.push(afterSave === "list" ? "/admin/products" : afterSave === "new" ? "/admin/products/new" : `/admin/products/${id}/${afterSave}`);
      router.refresh();
    } catch (reason) {
      toast.danger("ذخیره محصول انجام نشد", { description: requestErrorMessage(reason, "ارتباط با سرور برقرار نشد.") });
      setLoading(false);
    }
  }

  return <>
    <form ref={formRef} noValidate onSubmit={(event) => { event.preventDefault(); setPendingLabel(product ? "ذخیره و بازگشت به لیست" : "ثبت و بازگشت به لیست"); void submit("list"); }} className="grid items-start gap-2 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="grid min-w-0 gap-2">
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

        {storeIndustry === "GOLD" && (
          <Panel title="مشخصات و قیمت‌گذاری" description="قیمت از نرخ روز طلا، وزن، اجرت، سود و مالیات محاسبه می‌شود.">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <BpNumberInput name="weightGrams" allowDecimal label="وزن (گرم)" required value={weightGrams} error={errors.weightGrams} onValueChange={(next) => { setWeightGrams(next); clearError("weightGrams"); }} />
              <BpNumberInput name="purity" label="عیار" required value={purity} error={errors.purity} onValueChange={(next) => { setPurity(next); clearError("purity"); }} />
              <BpSelect name="makingFeeType" label="نوع اجرت" value={makingFeeType} error={errors.makingFeeType} onChange={(event) => setMakingFeeType(event.target.value as "PERCENT" | "FIXED")} options={[{ value: "PERCENT", label: "درصدی" }, { value: "FIXED", label: "مبلغ ثابت" }]} />
              <BpNumberInput name="makingFeeValue" label={`مقدار اجرت (${makingFeeType === "FIXED" ? "ریال" : "درصد"})`} required allowDecimal isPrice={makingFeeType === "FIXED"} value={makingFeeValue} error={errors.makingFeeValue} onValueChange={(next) => { setMakingFeeValue(next); clearError("makingFeeValue"); }} />
              <BpNumberInput name="profitPercent" allowDecimal label="درصد سود" required value={profitPercent} error={errors.profitPercent} onValueChange={(next) => { setProfitPercent(next); clearError("profitPercent"); }} />
              <BpNumberInput name="taxPercent" allowDecimal label="درصد مالیات" required value={taxPercent} error={errors.taxPercent} onValueChange={(next) => { setTaxPercent(next); clearError("taxPercent"); }} />
            </div>
          </Panel>
        )}

        <Panel title="ارسال و بسته‌بندی" description="ابعاد و وزن بسته آماده ارسال است، نه وزن خود کالا؛ برای محاسبه هزینه ارسال استفاده می‌شود.">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <BpNumberInput name="shippingWeightGrams" label="وزن بسته (گرم)" value={shippingWeightGrams} error={errors.shippingWeightGrams} onValueChange={(next) => { setShippingWeightGrams(next); clearError("shippingWeightGrams"); }} />
            <BpNumberInput name="packageLengthCm" allowDecimal label="طول (سانتی‌متر)" value={packageLengthCm} error={errors.packageLengthCm} onValueChange={(next) => { setPackageLengthCm(next); clearError("packageLengthCm"); }} />
            <BpNumberInput name="packageWidthCm" allowDecimal label="عرض (سانتی‌متر)" value={packageWidthCm} error={errors.packageWidthCm} onValueChange={(next) => { setPackageWidthCm(next); clearError("packageWidthCm"); }} />
            <BpNumberInput name="packageHeightCm" allowDecimal label="ارتفاع (سانتی‌متر)" value={packageHeightCm} error={errors.packageHeightCm} onValueChange={(next) => { setPackageHeightCm(next); clearError("packageHeightCm"); }} />
          </div>
        </Panel>

        <Panel title="موجودی و آماده‌سازی">
          <div className="grid gap-3 sm:grid-cols-2">
            <BpNumberInput name="stock" label="تعداد موجودی در انبار" required value={stock} error={errors.stock} onValueChange={(next) => { setStock(next); clearError("stock"); }} />
            <BpNumberInput name="preparationDays" label="زمان آماده‌سازی (روز)" required value={preparationDays} error={errors.preparationDays} onValueChange={(next) => { setPreparationDays(next); clearError("preparationDays"); }} />
            <BpNumberInput name="minOrderQuantity" label="حداقل سفارش" required value={minOrderQuantity} error={errors.minOrderQuantity} hint="کمترین تعدادی که مشتری می‌تواند از این کالا بخرد." onValueChange={(next) => { setMinOrderQuantity(next); clearError("minOrderQuantity"); }} />
            <BpNumberInput name="maxOrderQuantity" label="حداکثر سفارش" value={maxOrderQuantity} error={errors.maxOrderQuantity} hint="خالی بگذارید تا فقط سقف کلی فروشگاه اعمال شود." onValueChange={(next) => { setMaxOrderQuantity(next); clearError("maxOrderQuantity"); }} />
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
            <div className="mt-3 grid gap-3">
              <div className="grid gap-3 sm:grid-cols-2">
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
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-[var(--bp-divider)] pt-3">
                <span className="bp-muted text-[12px]">بدون بازه زمانی؛ تا وقتی خاموشش نکنید فعال می‌ماند.</span>
                <BpSwitch isSelected={discountIsSpecialSale} onChange={setDiscountIsSpecialSale}>فروش ویژه (بدون زمان)</BpSwitch>
              </div>
              {!discountIsSpecialSale && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <BpDateTimeField label="تاریخ و ساعت شروع" required value={discountStartsAt} error={errors.discountStartsAt} onChange={(value) => { setDiscountStartsAt(value); clearError("discountStartsAt"); }} />
                  <BpDateTimeField label="تاریخ و ساعت پایان" required value={discountEndsAt} error={errors.discountEndsAt} onChange={(value) => { setDiscountEndsAt(value); clearError("discountEndsAt"); }} />
                </div>
              )}
            </div>
          )}
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

        <Panel title="تنوع محصول" description="اگر محصول در چند سایز یا رنگ عرضه می‌شود، نوع‌ها و مقادیرش را انتخاب کنید تا ترکیب‌ها ساخته شوند.">
          <BlueprintProductOptions
            storeIndustry={storeIndustry}
            colors={colors}
            library={library}
            optionTypes={optionTypes}
            variants={variants}
            fixedPrice={fixedPrice}
            onLibraryChange={setLibrary}
            onChange={(next) => { setOptionTypes(next.optionTypes); setVariants(next.variants); }}
          />
          {/* A strip along the foot rather than a column beside the editor: it is one optional
              file, and it was taking 220px away from every value row above it. */}
          <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-[var(--bp-divider)] pt-3">
            <span className="text-[12px] font-bold">راهنمای انتخاب</span>
            {optionGuide
              ? optionGuide.type === "IMAGE"
                ? <span className="relative h-10 w-14 overflow-hidden rounded-[var(--bp-radius)] border border-[var(--bp-divider)]"><Image src={optionGuide.url} alt={optionGuide.title} fill sizes="56px" className="object-cover" /></span>
                : <span className="grid h-10 w-14 place-items-center rounded-[var(--bp-radius)] border border-[var(--bp-divider)] text-[var(--bp-accent)]"><FileText size={18} /></span>
              : <span className="bp-muted text-[11px]">فایلی انتخاب نشده است.</span>}
            {optionGuide && <span className="bp-muted min-w-0 truncate text-[11px]">{optionGuide.title}</span>}
            <BpButton size="sm" className="ms-auto gap-2" onClick={() => setOptionGuidePickerOpen(true)}><Images size={14} />{optionGuide ? "تغییر فایل" : "انتخاب از گالری"}</BpButton>
            {optionGuide && <BpButton isIconOnly size="sm" variant="ghost" aria-label="حذف راهنمای انتخاب" className="text-[var(--bp-danger)]" onClick={() => setOptionGuide(null)}><Trash2 size={14} /></BpButton>}
          </div>
        </Panel>
      </div>

      {/* Stays in view while the long left column scrolls. */}
      <aside className="grid gap-2 lg:sticky lg:top-20">
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
            <div className="flex items-stretch">
              <BpButton type="submit" variant="primary" isPending={loading} className="bp-split-start flex-1">{loading && pendingLabel ? pendingLabel : (product ? "ذخیره و بازگشت به لیست" : "ثبت و بازگشت به لیست")}</BpButton>
              <span aria-hidden className="w-px shrink-0 bg-white/25" />
              <BpButton
                ref={saveMenuTriggerRef}
                type="button"
                isIconOnly
                variant="primary"
                disabled={loading}
                aria-label="گزینه‌های بیشتر ذخیره"
                aria-haspopup="menu"
                aria-expanded={saveMenuOpen}
                className="bp-split-end"
                onClick={() => setSaveMenuOpen((current) => !current)}
              >
                <ChevronDown size={15} />
              </BpButton>
              <BpPopover open={saveMenuOpen} anchorRef={saveMenuTriggerRef} onClose={() => setSaveMenuOpen(false)} label="گزینه‌های بیشتر ذخیره" width={230}>
                <ul role="menu" className="bp-scroll m-0 list-none p-0">
                  {([
                    { value: "list", label: "ذخیره و بازگشت به محصولات" },
                    { value: "duplicate", label: "ذخیره و تکثیر کردن" },
                    { value: "new", label: "ذخیره و ثبت محصول جدید" },
                  ] as const).map((action) => (
                    <li key={action.value}>
                      <button
                        type="button"
                        role="menuitem"
                        disabled={loading}
                        onClick={() => { setSaveMenuOpen(false); setPendingLabel(action.label); void submit(action.value); }}
                        className="w-full border border-transparent px-3 py-2 text-start text-[13px] hover:bg-[var(--bp-hover)] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {action.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </BpPopover>
            </div>
            <Link href="/admin/products" className="bp-btn bp-btn-secondary bp-btn-block">انصراف</Link>
          </div>
        </Panel>

      </aside>
    </form>

    <MediaPickerDialog open={pickerOpen} scope="PRODUCT" multiple allowedTypes={["IMAGE", "VIDEO"]} selected={selectedMedia} onClose={() => setPickerOpen(false)} onConfirm={setSelectedMedia} />
    <MediaPickerDialog open={optionGuidePickerOpen} scope="PRODUCT" allowedTypes={["IMAGE", "DOCUMENT"]} selected={optionGuide ? [optionGuide] : []} onClose={() => setOptionGuidePickerOpen(false)} onConfirm={(items) => setOptionGuide(items[0] ?? null)} />
  </>;
}
