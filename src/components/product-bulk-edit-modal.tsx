"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, toast } from "@heroui/react";
import { ListChecks } from "lucide-react";
import { AdminDialog, AdminDialogButton } from "@/components/admin/admin-dialog";
import { useBulkSelection } from "@/components/admin-bulk-editor";
import { adminFieldClass, adminLabelClass } from "@/components/admin-ui";
import { useAdminTemplate } from "@/components/admin/template-context";
import { requestErrorMessage, requestJson } from "@/lib/api-request";
import { BpButton } from "@/components/admin/blueprint/ui/button";
import { BpSeg, type BpSegOption } from "@/components/admin/blueprint/ui/seg";
import { BpNumberInput } from "@/components/admin/blueprint/ui/number-input";
import { BpDateTimeField } from "@/components/admin/blueprint/ui/date-time-field";
import { HeroSelectField, type HeroSelectOption } from "@/components/hero-select-field";
import { HeroNumberInput } from "@/components/hero-number-input";
import { HeroDateRangeField } from "@/components/hero-date-range-field";

type ChangeType = "price" | "stock" | "discount" | "scheduledDiscount";
type AdjustMethod = "set" | "increase" | "decrease";
type DiscountUnit = "PERCENT" | "FIXED";

const typeOptions: { value: ChangeType; label: string }[] = [
  { value: "price", label: "تغییر قیمت" },
  { value: "stock", label: "تغییر موجودی" },
  { value: "discount", label: "تغییر تخفیف" },
  { value: "scheduledDiscount", label: "تخفیف زمان‌بندی‌شده" },
];

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
  { value: "FIXED", label: "تومان" },
];

function valueLabel(type: ChangeType, method: AdjustMethod, unit: DiscountUnit) {
  if (type === "price") return method === "set" ? "قیمت جدید (تومان)" : method === "increase" ? "مقدار افزایش قیمت (تومان)" : "مقدار کاهش قیمت (تومان)";
  if (type === "stock") return method === "set" ? "موجودی جدید" : method === "increase" ? "مقدار افزایش موجودی" : "مقدار کاهش موجودی";
  return unit === "PERCENT" ? "درصد تخفیف" : "مبلغ تخفیف (تومان)";
}

/**
 * The modal itself — one implementation, since `AdminDialog` already carries the two templates'
 * chrome. Only the field controls branch, each through its template's own shared component.
 */
function BulkEditFields({
  type, setType, method, setMethod, unit, setUnit, value, setValue, startsAt, setStartsAt, endsAt, setEndsAt, isDisabled,
}: {
  type: ChangeType; setType: (value: ChangeType) => void;
  method: AdjustMethod; setMethod: (value: AdjustMethod) => void;
  unit: DiscountUnit; setUnit: (value: DiscountUnit) => void;
  value: string; setValue: (value: string) => void;
  startsAt: string | null; setStartsAt: (value: string | null) => void;
  endsAt: string | null; setEndsAt: (value: string | null) => void;
  isDisabled: boolean;
}) {
  const template = useAdminTemplate();
  const isPriceLike = type === "price" || ((type === "discount" || type === "scheduledDiscount") && unit === "FIXED");
  const label = valueLabel(type, method, unit);

  if (template === "BLUEPRINT") {
    return (
      <div className="grid gap-3">
        <BpSeg label="نوع تغییر" fullWidth value={type} onChange={setType} options={typeOptions as BpSegOption<ChangeType>[]} />
        {(type === "price" || type === "stock") && (
          <BpSeg label="روش تغییر" fullWidth value={method} onChange={setMethod} options={(type === "price" ? priceMethodOptions : stockMethodOptions) as BpSegOption<AdjustMethod>[]} />
        )}
        {(type === "discount" || type === "scheduledDiscount") && (
          <BpSeg label="واحد تخفیف" fullWidth value={unit} onChange={setUnit} options={unitOptions as BpSegOption<DiscountUnit>[]} />
        )}
        <BpNumberInput label={label} value={value} onValueChange={setValue} isPrice={isPriceLike} showWords={isPriceLike} disabled={isDisabled} />
        {type === "scheduledDiscount" && (
          <div className="grid grid-cols-2 gap-2">
            <BpDateTimeField label="شروع تخفیف" value={startsAt} onChange={setStartsAt} isDisabled={isDisabled} required />
            <BpDateTimeField label="پایان تخفیف" value={endsAt} onChange={setEndsAt} isDisabled={isDisabled} required />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      <HeroSelectField name="bulk-edit-type" label="نوع تغییر" value={type} onValueChange={(next) => setType(next as ChangeType)} options={typeOptions as HeroSelectOption[]} includeEmptyOption={false} disabled={isDisabled} />
      {(type === "price" || type === "stock") && (
        <HeroSelectField name="bulk-edit-method" label="روش تغییر" value={method} onValueChange={(next) => setMethod(next as AdjustMethod)} options={(type === "price" ? priceMethodOptions : stockMethodOptions) as HeroSelectOption[]} includeEmptyOption={false} disabled={isDisabled} />
      )}
      {(type === "discount" || type === "scheduledDiscount") && (
        <HeroSelectField name="bulk-edit-unit" label="واحد تخفیف" value={unit} onValueChange={(next) => setUnit(next as DiscountUnit)} options={unitOptions as HeroSelectOption[]} includeEmptyOption={false} disabled={isDisabled} />
      )}
      <label className={adminLabelClass}>{label}<HeroNumberInput value={value} onValueChange={setValue} isPrice={isPriceLike} isDisabled={isDisabled} fullWidth variant="secondary" className={adminFieldClass} /></label>
      {type === "scheduledDiscount" && (
        <HeroDateRangeField label="بازه زمانی تخفیف" start={startsAt} end={endsAt} withTime onChange={(range) => { setStartsAt(range?.start ?? null); setEndsAt(range?.end ?? null); }} isDisabled={isDisabled} />
      )}
    </div>
  );
}

function ProductBulkEditModal({ open, ids, onClose, onCompleted }: { open: boolean; ids: string[]; onClose: () => void; onCompleted: () => void }) {
  const router = useRouter();
  const [type, setType] = useState<ChangeType>("price");
  const [method, setMethod] = useState<AdjustMethod>("set");
  const [unit, setUnit] = useState<DiscountUnit>("PERCENT");
  const [value, setValue] = useState("");
  const [startsAt, setStartsAt] = useState<string | null>(null);
  const [endsAt, setEndsAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function reset() {
    setType("price"); setMethod("set"); setUnit("PERCENT"); setValue(""); setStartsAt(null); setEndsAt(null); setError("");
  }

  function close() {
    if (loading) return;
    reset();
    onClose();
  }

  async function submit() {
    setError("");
    const amount = Number(value);
    if (!value || !Number.isFinite(amount) || amount <= 0) return setError("مقدار را وارد کنید.");
    if ((type === "discount" || type === "scheduledDiscount") && unit === "PERCENT" && amount > 100) return setError("درصد تخفیف نمی‌تواند بیشتر از ۱۰۰ باشد.");
    if (type === "scheduledDiscount") {
      if (!startsAt || !endsAt) return setError("بازه زمانی تخفیف را کامل کنید.");
      if (endsAt < startsAt) return setError("پایان تخفیف باید بعد از شروع آن باشد.");
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
          value: amount,
          ...(type === "scheduledDiscount" ? { startsAt, endsAt } : {}),
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
      setError(requestErrorMessage(reason, "ویرایش گروهی انجام نشد."));
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
      {error && <p className="m-0 border border-[var(--danger)] bg-[var(--danger)]/10 p-3 text-xs leading-6 text-[var(--danger)]">{error}</p>}
      <BulkEditFields
        type={type} setType={setType}
        method={method} setMethod={setMethod}
        unit={unit} setUnit={setUnit}
        value={value} setValue={setValue}
        startsAt={startsAt} setStartsAt={setStartsAt}
        endsAt={endsAt} setEndsAt={setEndsAt}
        isDisabled={loading}
      />
      {/* Combinations carry their own price, stock and discount — the base product's fields stay
         untouched once it has any, so this note keeps the reach of the change from being a surprise. */}
      <p className="bp-muted m-0 text-[11px] leading-6 text-[var(--muted)]">محصولی که تنوع (رنگ، سایز و…) دارد، این تغییر روی همهٔ ترکیب‌های آن اعمال می‌شود.</p>
    </AdminDialog>
  );
}

/** Sits beside the quick-edit control in the products table's selection toolbar. */
export function ProductBulkEditButton() {
  const template = useAdminTemplate();
  const { selected } = useBulkSelection();
  const [open, setOpen] = useState(false);
  const selectedIds = [...selected];
  const disabled = selectedIds.length === 0;

  return (
    <>
      {template === "BLUEPRINT" ? (
        <BpButton variant="secondary" disabled={disabled} onClick={() => setOpen(true)} className="gap-1.5">
          <ListChecks size={14} />ویرایش گروهی
        </BpButton>
      ) : (
        <Button type="button" variant="secondary" isDisabled={disabled} onPress={() => setOpen(true)} className="min-h-10 gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-bold text-slate-600">
          <ListChecks size={14} />ویرایش گروهی
        </Button>
      )}
      <ProductBulkEditModal open={open} ids={selectedIds} onClose={() => setOpen(false)} onCompleted={() => setOpen(false)} />
    </>
  );
}
