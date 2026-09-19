"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@heroui/react";
import { ListChecks } from "lucide-react";
import type { ProductStatus } from "@generated/prisma/enums";
import { AdminDialog, AdminDialogButton } from "@/components/admin/admin-dialog";
import { useBulkSelection } from "@/components/admin-bulk-editor";
import { requestErrorMessage, requestJson } from "@/lib/api-request";
import { productStatusLabels } from "@/modules/admin/labels";
import { BpButton } from "@/components/admin/blueprint/ui/button";
import { BpSeg, type BpSegOption } from "@/components/admin/blueprint/ui/seg";
import { BpSelect, type BpSelectOption } from "@/components/admin/blueprint/ui/select";
import { BpNumberInput } from "@/components/admin/blueprint/ui/number-input";
import { BpDateTimeField } from "@/components/admin/blueprint/ui/date-time-field";

type ChangeType = "price" | "stock" | "discount" | "scheduledDiscount" | "removeDiscount" | "status" | "category";
type AdjustMethod = "set" | "increase" | "decrease";
type DiscountUnit = "PERCENT" | "FIXED";

const typeOptions: { value: ChangeType; label: string }[] = [
  { value: "price", label: "تغییر قیمت" },
  { value: "stock", label: "تغییر موجودی" },
  { value: "discount", label: "تغییر تخفیف" },
  { value: "scheduledDiscount", label: "تخفیف زمان‌بندی‌شده" },
  { value: "removeDiscount", label: "حذف تخفیف" },
  { value: "status", label: "تغییر وضعیت" },
  { value: "category", label: "تغییر دسته‌بندی" },
];

// Same labels the status filter and table tag already use — this picker is choosing a state to
// move rows into, not phrasing a one-click action, so it reads consistently with the rest of the
// admin rather than inventing new imperative copy just for this modal.
const statusOptions: { value: ProductStatus; label: string }[] = Object.entries(productStatusLabels).map(([value, label]) => ({ value: value as ProductStatus, label }));

const priceMethodOptions: { value: AdjustMethod; label: string }[] = [
  { value: "set", label: "قیمت جدید" },
  { value: "increase", label: "افزایش قیمت" },
  { value: "decrease", label: "کاهش قیمت" },
];

const stockMethodOptions: { value: AdjustMethod; label: string }[] = [
  { value: "set", label: "موجودی جدید" },
  { value: "increase", label: "افزایش موجودی" },
  { value: "decrease", label: "کاهش موجودی" },
];

const unitOptions: { value: DiscountUnit; label: string }[] = [
  { value: "PERCENT", label: "درصد" },
  { value: "FIXED", label: "ریال" },
];

// Every price/discount field in this admin panel takes a rial amount — the same amount stored in
// the database — and only ever shows a toman reading as a spelled-out hint underneath. Labelling
// these "تومان" would ask for one unit while the value entered is actually stored as another.
function valueLabel(type: ChangeType, method: AdjustMethod, unit: DiscountUnit) {
  if (type === "price") return method === "set" ? "قیمت جدید (ریال)" : method === "increase" ? "مقدار افزایش قیمت (ریال)" : "مقدار کاهش قیمت (ریال)";
  if (type === "stock") return method === "set" ? "موجودی جدید" : method === "increase" ? "مقدار افزایش موجودی" : "مقدار کاهش موجودی";
  return unit === "PERCENT" ? "درصد تخفیف" : "مبلغ تخفیف (ریال)";
}

/**
 * The modal itself — one implementation, since `AdminDialog` already carries the two templates'
 * chrome. Only the field controls branch, each through its template's own shared component.
 */
function BulkEditFields({
  type, setType, method, setMethod, unit, setUnit, value, setValue, startsAt, setStartsAt, endsAt, setEndsAt,
  status, setStatus, categoryId, setCategoryId, categories, isDisabled,
  valueError, onClearValueError, datesError, onClearDatesError,
}: {
  type: ChangeType; setType: (value: ChangeType) => void;
  method: AdjustMethod; setMethod: (value: AdjustMethod) => void;
  unit: DiscountUnit; setUnit: (value: DiscountUnit) => void;
  value: string; setValue: (value: string) => void;
  startsAt: string | null; setStartsAt: (value: string | null) => void;
  endsAt: string | null; setEndsAt: (value: string | null) => void;
  status: ProductStatus; setStatus: (value: ProductStatus) => void;
  categoryId: string | null; setCategoryId: (value: string | null) => void;
  categories: { id: string; name: string }[];
  isDisabled: boolean;
  valueError?: string;
  onClearValueError: () => void;
  datesError?: string;
  onClearDatesError: () => void;
}) {
  const isPriceLike = type === "price" || ((type === "discount" || type === "scheduledDiscount") && unit === "FIXED");
  const label = valueLabel(type, method, unit);
  // Nothing to enter for this one — it only clears whatever discount a row already has.
  const removeDiscountNote = <p className="bp-muted m-0 text-[12px] leading-6 text-[var(--muted)]">تخفیف (زمان‌بندی‌شده یا فروش ویژه) هر محصول انتخاب‌شده که تخفیف داشته باشد، پاک می‌شود.</p>;

  return (
    <div className="grid gap-3">
      <BpSelect label="نوع تغییر" value={type} onChange={(event) => setType(event.target.value as ChangeType)} options={typeOptions as BpSelectOption[]} />
      {(type === "price" || type === "stock") && (
        <BpSeg label="روش تغییر" fullWidth value={method} onChange={setMethod} options={(type === "price" ? priceMethodOptions : stockMethodOptions) as BpSegOption<AdjustMethod>[]} />
      )}
      {(type === "discount" || type === "scheduledDiscount") && (
        <BpSeg label="واحد تخفیف" fullWidth value={unit} onChange={setUnit} options={unitOptions as BpSegOption<DiscountUnit>[]} />
      )}
      {type === "status" && (
        <BpSeg label="وضعیت جدید" fullWidth value={status} onChange={setStatus} options={statusOptions as BpSegOption<ProductStatus>[]} />
      )}
      {type === "category" && (
        <BpSelect
          label="دسته‌بندی جدید"
          value={categoryId ?? "none"}
          onChange={(event) => setCategoryId(event.target.value === "none" ? null : event.target.value)}
          options={[{ value: "none", label: "بدون دسته‌بندی" }, ...categories.map((category) => ({ value: category.id, label: category.name }))] as BpSelectOption[]}
        />
      )}
      {type === "removeDiscount" ? removeDiscountNote : (type === "status" || type === "category") ? null : (
        <BpNumberInput name="value" label={label} value={value} onValueChange={(next) => { setValue(next); onClearValueError(); }} isPrice={isPriceLike} showWords={isPriceLike} error={valueError} disabled={isDisabled} />
      )}
      {type === "scheduledDiscount" && (
        <div className="grid grid-cols-2 gap-2">
          <BpDateTimeField label="شروع تخفیف" value={startsAt} onChange={(next) => { setStartsAt(next); onClearDatesError(); }} error={datesError} isDisabled={isDisabled} required data-field="dates" />
          <BpDateTimeField label="پایان تخفیف" value={endsAt} onChange={(next) => { setEndsAt(next); onClearDatesError(); }} error={datesError} isDisabled={isDisabled} required />
        </div>
      )}
    </div>
  );
}

function ProductBulkEditModal({ open, ids, variantTypeNames, variantProductCount, categories, onClose, onCompleted }: { open: boolean; ids: string[]; variantTypeNames: string[]; variantProductCount: number; categories: { id: string; name: string }[]; onClose: () => void; onCompleted: () => void }) {
  const router = useRouter();
  const [type, setType] = useState<ChangeType>("price");
  const [method, setMethod] = useState<AdjustMethod>("set");
  const [unit, setUnit] = useState<DiscountUnit>("PERCENT");
  const [value, setValue] = useState("");
  const [startsAt, setStartsAt] = useState<string | null>(null);
  const [endsAt, setEndsAt] = useState<string | null>(null);
  const [status, setStatus] = useState<ProductStatus>("ACTIVE");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // Field-level errors sit under their own control; `formError` is only for a failure that
  // belongs to the request as a whole (the server unreachable, etc.), not to one input.
  const [valueError, setValueError] = useState<string | undefined>(undefined);
  const [datesError, setDatesError] = useState<string | undefined>(undefined);
  const [formError, setFormError] = useState("");
  const fieldsRef = useRef<HTMLDivElement>(null);

  function reset() {
    setType("price"); setMethod("set"); setUnit("PERCENT"); setValue(""); setStartsAt(null); setEndsAt(null);
    setStatus("ACTIVE"); setCategoryId(null);
    setValueError(undefined); setDatesError(undefined); setFormError("");
  }

  function close() {
    if (loading) return;
    reset();
    onClose();
  }

  async function submit() {
    setFormError("");
    const amount = Number(value);
    let nextValueError: string | undefined;
    let nextDatesError: string | undefined;
    if (type !== "removeDiscount" && type !== "status" && type !== "category") {
      if (!value || !Number.isFinite(amount) || amount <= 0) nextValueError = "مقدار را وارد کنید.";
      else if ((type === "discount" || type === "scheduledDiscount") && unit === "PERCENT" && amount > 100) nextValueError = "درصد تخفیف نمی‌تواند بیشتر از ۱۰۰ باشد.";
    }
    if (type === "scheduledDiscount") {
      if (!startsAt || !endsAt) nextDatesError = "بازه زمانی تخفیف را کامل کنید.";
      else if (endsAt < startsAt) nextDatesError = "پایان تخفیف باید بعد از شروع آن باشد.";
    }
    if (nextValueError || nextDatesError) {
      setValueError(nextValueError);
      setDatesError(nextDatesError);
      // The value field comes first in the form, so it wins when both are invalid. The matched
      // element is sometimes the focusable control itself (a plain input, or Blueprint's date
      // trigger button) and sometimes a wrapper around one (HeroUI's date range group, whose own
      // focusable part is a segment inside it) — either way, this reaches the real target.
      const container = fieldsRef.current?.querySelector<HTMLElement>(nextValueError ? '[data-field="value"]' : '[data-field="dates"]');
      const focusable = container?.matches("input, button") ? container : container?.querySelector<HTMLElement>("input, button, [tabindex]");
      focusable?.focus();
      return;
    }
    setLoading(true);
    try {
      const result = await requestJson<{ updated: number; skipped: number }>("/api/admin/products/bulk-edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids,
          type,
          ...(type === "price" || type === "stock" ? { method } : {}),
          ...(type === "discount" || type === "scheduledDiscount" ? { unit } : {}),
          ...(type !== "removeDiscount" && type !== "status" && type !== "category" ? { value: amount } : {}),
          ...(type === "scheduledDiscount" ? { startsAt, endsAt } : {}),
          ...(type === "status" ? { status } : {}),
          ...(type === "category" ? { categoryId } : {}),
        }),
      }, { fallbackMessage: "ویرایش گروهی انجام نشد." });
      toast.success("ویرایش گروهی انجام شد", {
        description: result.skipped > 0
          ? `${result.updated.toLocaleString("fa-IR")} مورد به‌روزرسانی شد؛ ${result.skipped.toLocaleString("fa-IR")} مورد شرایط این تغییر را نداشت.`
          : `${result.updated.toLocaleString("fa-IR")} مورد به‌روزرسانی شد.`,
        timeout: 5000,
      });
      reset();
      onCompleted();
      router.refresh();
    } catch (reason) {
      setFormError(requestErrorMessage(reason, "ویرایش گروهی انجام نشد."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AdminDialog
      open={open}
      ariaLabel="ویرایش گروهی محصولات"
      title="ویرایش گروهی"
      description={`اعمال روی ${ids.length.toLocaleString("fa-IR")} محصول انتخاب‌شده`}
      isBusy={loading}
      onClose={close}
      actions={<>
        <AdminDialogButton variant="primary" isPending={loading} onPress={() => void submit()}>اعمال تغییر</AdminDialogButton>
        <AdminDialogButton variant="secondary" isDisabled={loading} onPress={close}>انصراف</AdminDialogButton>
      </>}
    >
      {formError && <p className="m-0 border border-[var(--danger)] bg-[var(--danger)]/10 p-3 text-xs leading-6 text-[var(--danger)]">{formError}</p>}
      <div ref={fieldsRef}>
        <BulkEditFields
          type={type} setType={setType}
          method={method} setMethod={setMethod}
          unit={unit} setUnit={setUnit}
          value={value} setValue={setValue}
          startsAt={startsAt} setStartsAt={setStartsAt}
          endsAt={endsAt} setEndsAt={setEndsAt}
          status={status} setStatus={setStatus}
          categoryId={categoryId} setCategoryId={setCategoryId}
          categories={categories}
          isDisabled={loading}
          valueError={valueError} onClearValueError={() => setValueError(undefined)}
          datesError={datesError} onClearDatesError={() => setDatesError(undefined)}
        />
      </div>
      {/* Combinations carry their own price, stock and discount — the base product's fields stay
         untouched once it has any, so this note keeps the reach of the change from being a surprise.
         Naming the actual variant types found in the selection beats a generic example. وضعیت and
         دسته‌بندی are product-only and never reach a combination, so this would be misleading for
         them. */}
      {type !== "status" && type !== "category" && variantProductCount > 0 && (
        <p className="bp-muted m-0 text-[11px] leading-6 text-[var(--muted)]">
          {variantProductCount.toLocaleString("fa-IR")} محصول انتخاب‌شده تنوع ({variantTypeNames.join("، ")}) دارند؛ این تغییر روی همهٔ ترکیب‌های آن‌ها اعمال می‌شود.
        </p>
      )}
    </AdminDialog>
  );
}

export type BulkEditProductSummary = { id: string; variantTypeNames: string[] };

/** The products table's only bulk-edit surface — sits in the selection toolbar. */
export function ProductBulkEditButton({ products, categories }: { products: BulkEditProductSummary[]; categories: { id: string; name: string }[] }) {
  const { selected } = useBulkSelection();
  const [open, setOpen] = useState(false);
  const selectedIds = [...selected];
  const disabled = selectedIds.length === 0;
  const selectedWithVariants = products.filter((product) => selected.has(product.id) && product.variantTypeNames.length > 0);
  const variantTypeNames = [...new Set(selectedWithVariants.flatMap((product) => product.variantTypeNames))];

  return (
    <>
      <BpButton variant="secondary" disabled={disabled} onClick={() => setOpen(true)} className="gap-1.5">
        <ListChecks size={14} />ویرایش گروهی
      </BpButton>
      <ProductBulkEditModal open={open} ids={selectedIds} variantTypeNames={variantTypeNames} variantProductCount={selectedWithVariants.length} categories={categories} onClose={() => setOpen(false)} onCompleted={() => setOpen(false)} />
    </>
  );
}
