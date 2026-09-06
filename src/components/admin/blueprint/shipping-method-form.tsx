"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import { toast } from "@heroui/react";
import { Plus, Trash2 } from "lucide-react";
import { requestErrorMessage, requestJson } from "@/lib/api-request";
import { shippingFieldLimits, shippingMethodSchema } from "@/modules/shipping/schemas";
import { tapinRateTypes } from "@/modules/shipping/tapin-rates";
import { BpButton } from "./ui/button";
import { BpCombobox } from "./ui/combobox";
import { BpInput } from "./ui/input";
import { BpKicker } from "./ui/card";
import { BpNumberInput } from "./ui/number-input";
import { BpSelect } from "./ui/select";
import { BpSwitch } from "./ui/switch";

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

function Panel({ title, description, action, children }: { title: string; description?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="bp-frame relative p-[18px]">
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

export function BlueprintShippingMethodForm({ provinces, method }: { provinces: Array<{ id: string; name: string }>; method?: MethodDraft }) {
  const router = useRouter();
  const [title, setTitle] = useState(method?.title ?? "");
  const [carrier, setCarrier] = useState(method?.carrier ?? "");
  const [source, setSource] = useState(method?.source ?? "TABLE");
  const [rateType, setRateType] = useState(method?.rateType ?? "");
  const [orderType, setOrderType] = useState(String(method?.orderType ?? 1));
  const [estimatedDays, setEstimatedDays] = useState(String(method?.estimatedDays ?? 3));
  const [isActive, setIsActive] = useState(method?.isActive ?? true);
  // Display order is set by dragging rows in the list, not edited here — the form only carries
  // the method's current value through to the save request unchanged.
  const sortOrder = method?.sortOrder ?? 0;
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
      sortOrder,
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

  const provinceOptions = [{ value: "", label: "همه استان‌ها" }, ...provinces.map((province) => ({ value: province.id, label: province.name }))];

  return (
    <form onSubmit={submit} noValidate className="grid gap-2">
      <Panel title="اطلاعات پایه">
        <div className="grid gap-3 sm:grid-cols-2">
          <BpInput label="نام روش" required maxLength={shippingFieldLimits.title} value={title} error={errors.title} placeholder="مثلاً پست پیشتاز" onChange={(event) => { setTitle(event.target.value); clearError("title"); }} />
          <BpInput label="شرکت حمل" required maxLength={shippingFieldLimits.carrier} value={carrier} error={errors.carrier} placeholder="مثلاً پست ایران" onChange={(event) => { setCarrier(event.target.value); clearError("carrier"); }} />
          <BpSelect
            label="منبع نرخ"
            value={source}
            error={errors.source}
            options={[
              { value: "TABLE", label: "جدول نرخ فروشگاه" },
              { value: "TAPIN", label: "نرخ لحظه‌ای تاپین" },
            ]}
            onChange={(event) => { setSource(event.target.value); clearError("source"); }}
          />
          {source === "TAPIN" && (
            <BpSelect
              label="شرکت حمل تاپین"
              value={rateType}
              error={errors.rateType}
              placeholder="انتخاب کنید"
              options={tapinRateTypes.map((value) => ({ value, label: carrierLabels[value] ?? value }))}
              onChange={(event) => { setRateType(event.target.value); clearError("rateType"); }}
            />
          )}
          {source === "TAPIN" && (
            <BpSelect
              label="نوع سرویس"
              value={orderType}
              options={[{ value: "0", label: "عادی" }, { value: "1", label: "پیشتاز / اکسپرس" }]}
              onChange={(event) => setOrderType(event.target.value)}
            />
          )}
          <BpNumberInput label="زمان تحویل (روز کاری)" value={estimatedDays} onValueChange={setEstimatedDays} />
        </div>
        <div className="mt-3">
          <BpSwitch isSelected={isActive} onChange={setIsActive}>نمایش در تسویه حساب</BpSwitch>
          <p className="bp-muted m-0 mt-1.5 text-[12px]">روش غیرفعال در تسویه حساب نمایش داده نمی‌شود.</p>
        </div>
      </Panel>

      <Panel
        title="جدول نرخ"
        description={source === "TAPIN"
          ? "این ردیف‌ها نرخ پشتیبان هستند و وقتی سرویس تاپین در دسترس نباشد به‌جای آن استفاده می‌شوند."
          : "هزینه هر بسته بر اساس استان مقصد و سقف وزن. ردیف بدون استان برای همه مقصدها به‌کار می‌رود."}
        action={<BpButton type="button" size="sm" className="gap-1.5" onClick={() => setZones((current) => [...current, { provinceId: null, maxWeightGrams: 1000, price: 0 }])}><Plus size={14} />افزودن ردیف نرخ</BpButton>}
      >
        {errors.zones && (
          <p role="alert" className="m-0 mb-3 border border-[var(--bp-danger)] bg-[var(--bp-danger-bg)] p-3 text-[12px] leading-6 text-[var(--bp-danger)]">{errors.zones}</p>
        )}

        {zones.length === 0
          ? <p className="bp-muted m-0 border border-dashed border-[var(--bp-divider)] p-6 text-center text-[12px]">هنوز ردیفی اضافه نشده است.</p>
          : <div className="grid gap-3">
            {zones.map((zone, index) => (
              <div key={index} className="grid items-end gap-3 border border-[var(--bp-divider)] p-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
                <BpCombobox
                  label="استان مقصد"
                  value={zone.provinceId ?? ""}
                  options={provinceOptions}
                  onChange={(value) => setZones((current) => current.map((item, position) => (position === index ? { ...item, provinceId: value || null } : item)))}
                />
                <BpNumberInput label="تا وزن (گرم)" value={String(zone.maxWeightGrams)} onValueChange={(value) => setZones((current) => current.map((item, position) => (position === index ? { ...item, maxWeightGrams: Number(value || 0) } : item)))} />
                <BpNumberInput label="هزینه (ریال)" isPrice value={String(zone.price)} onValueChange={(value) => setZones((current) => current.map((item, position) => (position === index ? { ...item, price: Number(value || 0) } : item)))} />
                <BpButton type="button" isIconOnly variant="ghost" aria-label={`حذف ردیف ${(index + 1).toLocaleString("fa-IR")}`} className="mb-[3px] bp-btn-danger-icon" onClick={() => setZones((current) => current.filter((_, position) => position !== index))}>
                  <Trash2 size={15} />
                </BpButton>
              </div>
            ))}
          </div>}
      </Panel>

      <section className="bp-frame relative flex flex-col gap-3 p-[18px] sm:flex-row sm:items-center sm:justify-between">
        <p className="bp-muted m-0 text-[12px]">پس از ذخیره، این روش بلافاصله در تسویه حساب اعمال می‌شود.</p>
        <BpButton type="submit" variant="primary" isPending={saving}>{method ? "ذخیره تغییرات" : "ثبت روش ارسال"}</BpButton>
      </section>
    </form>
  );
}
