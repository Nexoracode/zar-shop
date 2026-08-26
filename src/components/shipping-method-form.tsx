"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Alert, Button, Card, toast } from "@heroui/react";
import { Plus, Trash2 } from "lucide-react";
import { AdminCheckbox } from "@/components/admin-checkbox";
import { AdminSaveButton } from "@/components/admin-save-button";
import { HeroNumberInput } from "@/components/hero-number-input";
import { HeroSelectField } from "@/components/hero-select-field";
import { TextField } from "@/components/form-field";
import { adminFieldClass, adminLabelClass } from "@/components/admin-ui";
import { requestErrorMessage, requestJson } from "@/lib/api-request";
import { shippingFieldLimits, shippingMethodSchema } from "@/modules/shipping/schemas";
import { tapinRateTypes } from "@/modules/shipping/tapin-rates";

type ZoneDraft = { provinceId: string | null; maxWeightGrams: number; price: number };
type MethodDraft = {
  id: string;
  title: string;
  carrier: string;
  source: string;
  rateType: string | null;
  orderType: number;
  estimatedDays: number;
  isActive: boolean;
  sortOrder: number;
  zones: ZoneDraft[];
};

const carrierLabels: Record<string, string> = {
  irpost: "پست ایران",
  tipax: "تیپاکس",
  railway: "راه‌آهن",
  alopeyk: "الوپیک",
  boxit: "باکسیت",
};

export function ShippingMethodForm({ provinces, method }: { provinces: Array<{ id: string; name: string }>; method?: MethodDraft }) {
  const router = useRouter();
  const [title, setTitle] = useState(method?.title ?? "");
  const [carrier, setCarrier] = useState(method?.carrier ?? "");
  const [source, setSource] = useState(method?.source ?? "TABLE");
  const [rateType, setRateType] = useState(method?.rateType ?? "");
  const [orderType, setOrderType] = useState(String(method?.orderType ?? 1));
  const [estimatedDays, setEstimatedDays] = useState(String(method?.estimatedDays ?? 3));
  const [isActive, setIsActive] = useState(method?.isActive ?? true);
  const [sortOrder, setSortOrder] = useState(String(method?.sortOrder ?? 0));
  const [zones, setZones] = useState<ZoneDraft[]>(method?.zones ?? []);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  function clearError(field: string) {
    setErrors((current) => (current[field] ? { ...current, [field]: "" } : current));
  }

  function body() {
    return {
      title, carrier, source,
      rateType: source === "TAPIN" ? rateType || null : null,
      orderType: Number(orderType),
      estimatedDays: Number(estimatedDays),
      isActive,
      sortOrder: Number(sortOrder),
      zones,
    };
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Validated against the same schema the API uses, so a message never differs between them.
    const validation = shippingMethodSchema.safeParse(body());
    if (!validation.success) {
      const found: Record<string, string> = {};
      for (const issue of validation.error.issues) {
        const field = String(issue.path[0] ?? "form");
        if (!found[field]) found[field] = issue.message;
      }
      setErrors(found);
      return;
    }
    setSaving(true);
    try {
      await requestJson(method ? `/api/admin/shipping-methods/${method.id}` : "/api/admin/shipping-methods", {
        method: method ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validation.data),
      }, { fallbackMessage: "ذخیره روش ارسال ناموفق بود." });
      setErrors({});
      toast.success(method ? "روش ارسال به‌روزرسانی شد" : "روش ارسال ثبت شد");
      router.push("/admin/shipping-methods");
      router.refresh();
    } catch (reason) {
      toast.danger("ذخیره روش ارسال انجام نشد", { description: requestErrorMessage(reason, "ارتباط با سرور برقرار نشد.") });
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="admin-sticky-save-form grid gap-5">
      <Card variant="secondary" className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="نام روش" required value={title} maxLength={shippingFieldLimits.title} error={errors.title} placeholder="مثلاً پست پیشتاز" onChange={(event) => { setTitle(event.target.value); clearError("title"); }} />
          <TextField label="شرکت حمل" required value={carrier} maxLength={shippingFieldLimits.carrier} error={errors.carrier} placeholder="مثلاً پست ایران" onChange={(event) => { setCarrier(event.target.value); clearError("carrier"); }} />
          <HeroSelectField
            name="source"
            label="منبع نرخ"
            value={source}
            includeEmptyOption={false}
            error={errors.source}
            options={[
              { value: "TABLE", label: "جدول نرخ فروشگاه" },
              { value: "TAPIN", label: "نرخ لحظه‌ای تاپین" },
            ]}
            onValueChange={(value) => { setSource(value); clearError("source"); }}
          />
          {source === "TAPIN" && (
            <HeroSelectField
              name="rateType"
              label="شرکت حمل تاپین"
              value={rateType}
              error={errors.rateType}
              placeholder="انتخاب کنید"
              options={tapinRateTypes.map((value) => ({ value, label: carrierLabels[value] ?? value }))}
              onValueChange={(value) => { setRateType(value); clearError("rateType"); }}
            />
          )}
          {source === "TAPIN" && (
            <HeroSelectField
              name="orderType"
              label="نوع سرویس"
              value={orderType}
              includeEmptyOption={false}
              options={[{ value: "0", label: "عادی" }, { value: "1", label: "پیشتاز / اکسپرس" }]}
              onValueChange={setOrderType}
            />
          )}
          <label className={adminLabelClass}>زمان تحویل (روز کاری)<HeroNumberInput name="estimatedDays" min="0" max="90" value={estimatedDays} onValueChange={setEstimatedDays} fullWidth variant="secondary" className={adminFieldClass} /></label>
          <label className={adminLabelClass}>ترتیب نمایش<HeroNumberInput name="sortOrder" min="0" value={sortOrder} onValueChange={setSortOrder} fullWidth variant="secondary" className={adminFieldClass} /></label>
        </div>
        <div className="mt-4">
          <AdminCheckbox isSelected={isActive} onChange={setIsActive} description="روش غیرفعال در تسویه حساب نمایش داده نمی‌شود.">نمایش در تسویه حساب</AdminCheckbox>
        </div>
      </Card>

      <Card variant="secondary" className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <strong className="block text-sm">جدول نرخ</strong>
            <p className="m-0 mt-1 text-xs leading-6 text-[var(--muted)]">
              {source === "TAPIN"
                ? "این ردیف‌ها نرخ پشتیبان هستند و وقتی سرویس تاپین در دسترس نباشد به‌جای آن استفاده می‌شوند."
                : "هزینه هر بسته بر اساس استان مقصد و سقف وزن. ردیف بدون استان برای همه مقصدها به‌کار می‌رود."}
            </p>
          </div>
          <Button type="button" variant="secondary" onPress={() => setZones((current) => [...current, { provinceId: null, maxWeightGrams: 1000, price: 0 }])} className="min-h-11 shrink-0 gap-2">
            <Plus size={16} />افزودن ردیف نرخ
          </Button>
        </div>

        {errors.zones && <Alert status="danger" className="mb-4"><Alert.Description>{errors.zones}</Alert.Description></Alert>}

        {zones.length === 0
          ? <p className="m-0 rounded-xl border border-dashed border-[var(--border)] p-6 text-center text-xs text-[var(--muted)]">هنوز ردیفی اضافه نشده است.</p>
          : <div className="grid gap-3">
            {zones.map((zone, index) => (
              <div key={index} className="grid items-end gap-3 rounded-xl border border-[var(--border)] p-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
                <HeroSelectField
                  name={`zone-province-${index}`}
                  label="استان مقصد"
                  searchable
                  value={zone.provinceId ?? ""}
                  placeholder="همه استان‌ها"
                  options={provinces.map((province) => ({ value: province.id, label: province.name }))}
                  onValueChange={(value) => setZones((current) => current.map((item, position) => (position === index ? { ...item, provinceId: value || null } : item)))}
                />
                <label className={adminLabelClass}>تا وزن (گرم)<HeroNumberInput name={`zone-weight-${index}`} min="1" value={String(zone.maxWeightGrams)} onValueChange={(value) => setZones((current) => current.map((item, position) => (position === index ? { ...item, maxWeightGrams: Number(value || 0) } : item)))} fullWidth variant="secondary" className={adminFieldClass} /></label>
                <label className={adminLabelClass}>هزینه (ریال)<HeroNumberInput name={`zone-price-${index}`} min="0" isPrice value={String(zone.price)} onValueChange={(value) => setZones((current) => current.map((item, position) => (position === index ? { ...item, price: Number(value || 0) } : item)))} fullWidth variant="secondary" className={adminFieldClass} /></label>
                <Button type="button" variant="danger-soft" isIconOnly aria-label={`حذف ردیف ${(index + 1).toLocaleString("fa-IR")}`} onPress={() => setZones((current) => current.filter((_, position) => position !== index))} className="mb-6 h-11 min-h-11 w-11 min-w-11 rounded-xl">
                  <Trash2 size={16} />
                </Button>
              </div>
            ))}
          </div>}
      </Card>

      <Card variant="secondary" className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="m-0 text-xs text-[var(--muted)]">پس از ذخیره، این روش بلافاصله در تسویه حساب اعمال می‌شود.</p>
          <AdminSaveButton isSaving={saving} label={method ? "ذخیره تغییرات" : "ثبت روش ارسال"} />
        </div>
      </Card>
    </form>
  );
}
