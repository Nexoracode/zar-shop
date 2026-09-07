"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent, type ReactNode } from "react";
import { toast } from "@heroui/react";
import { requestErrorMessage, requestJson } from "@/lib/api-request";
import { packagingFieldLimits } from "@/modules/shipping/packaging-limits";
import { packagingBoxSchema } from "@/modules/shipping/packaging-schemas";
import { BpButton } from "./ui/button";
import { BpInput } from "./ui/input";
import { BpKicker } from "./ui/card";
import { BpNumberInput } from "./ui/number-input";
import { BpSwitch } from "./ui/switch";

type BoxDraft = {
  id: string;
  name: string;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  weightGrams: number;
  maxWeightGrams: number;
  tapinBoxId: number | null;
  isDefault: boolean;
  isActive: boolean;
};

function Panel({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="bp-frame relative p-[18px]">
      <BpKicker>{title}</BpKicker>
      {description && <p className="bp-muted mb-0 mt-1 text-[12px] leading-6">{description}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

export function BlueprintPackagingBoxForm({ box }: { box?: BoxDraft }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [name, setName] = useState(box?.name ?? "");
  const [lengthCm, setLengthCm] = useState(box ? String(box.lengthCm) : "");
  const [widthCm, setWidthCm] = useState(box ? String(box.widthCm) : "");
  const [heightCm, setHeightCm] = useState(box ? String(box.heightCm) : "");
  const [weightGrams, setWeightGrams] = useState(box ? String(box.weightGrams) : "");
  const [maxWeightGrams, setMaxWeightGrams] = useState(box ? String(box.maxWeightGrams) : "");
  const [tapinBoxId, setTapinBoxId] = useState(box?.tapinBoxId != null ? String(box.tapinBoxId) : "");
  const [isActive, setIsActive] = useState(box?.isActive ?? true);
  const [isDefault, setIsDefault] = useState(box?.isDefault ?? false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  function clearError(field: string) {
    setErrors((current) => (current[field] ? { ...current, [field]: "" } : current));
  }

  function body() {
    return {
      name,
      lengthCm,
      widthCm,
      heightCm,
      weightGrams,
      maxWeightGrams,
      tapinBoxId: tapinBoxId.trim() === "" ? null : tapinBoxId,
      isDefault,
      isActive,
    };
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validation = packagingBoxSchema.safeParse(body());
    if (!validation.success) {
      const found: Record<string, string> = {};
      for (const issue of validation.error.issues) {
        const field = String(issue.path[0] ?? "form");
        if (!found[field]) found[field] = issue.message;
      }
      setErrors(found);
      const first = Object.keys(found)[0];
      if (first) formRef.current?.querySelector<HTMLElement>(`[name="${first}"], [data-field="${first}"]`)?.focus();
      return;
    }
    setSaving(true);
    try {
      await requestJson(box ? `/api/admin/packaging/${box.id}` : "/api/admin/packaging", {
        method: box ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validation.data),
      }, { fallbackMessage: "ذخیره جعبه بسته‌بندی ناموفق بود." });
      setErrors({});
      toast.success(box ? "جعبه بسته‌بندی به‌روزرسانی شد" : "جعبه بسته‌بندی ثبت شد");
      router.push("/admin/packaging");
      router.refresh();
    } catch (reason) {
      toast.danger("ذخیره جعبه بسته‌بندی انجام نشد", { description: requestErrorMessage(reason, "ارتباط با سرور برقرار نشد.") });
      setSaving(false);
    }
  }

  return (
    <form ref={formRef} onSubmit={submit} noValidate className="grid gap-2">
      <Panel title="مشخصات جعبه">
        <div className="grid gap-3">
          <BpInput name="name" label="نام جعبه" required maxLength={packagingFieldLimits.name} value={name} error={errors.name} placeholder="مثلاً جعبه کوچک" onChange={(event) => { setName(event.target.value); clearError("name"); }} />

          <div className="grid gap-3 sm:grid-cols-3">
            <BpNumberInput name="lengthCm" label="طول (سانتی‌متر)" required allowDecimal value={lengthCm} error={errors.lengthCm} onValueChange={(value) => { setLengthCm(value); clearError("lengthCm"); }} />
            <BpNumberInput name="widthCm" label="عرض (سانتی‌متر)" required allowDecimal value={widthCm} error={errors.widthCm} onValueChange={(value) => { setWidthCm(value); clearError("widthCm"); }} />
            <BpNumberInput name="heightCm" label="ارتفاع (سانتی‌متر)" required allowDecimal value={heightCm} error={errors.heightCm} onValueChange={(value) => { setHeightCm(value); clearError("heightCm"); }} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <BpNumberInput name="weightGrams" label="وزن جعبه خالی (گرم)" required value={weightGrams} error={errors.weightGrams} hint="وزن جعبه به وزن محتوا اضافه می‌شود." onValueChange={(value) => { setWeightGrams(value); clearError("weightGrams"); }} />
            <BpNumberInput name="maxWeightGrams" label="حداکثر وزن محتوا (گرم)" required value={maxWeightGrams} error={errors.maxWeightGrams} hint="بسته‌هایی سنگین‌تر از این مقدار در این جعبه جا نمی‌شوند." onValueChange={(value) => { setMaxWeightGrams(value); clearError("maxWeightGrams"); }} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <BpNumberInput name="tapinBoxId" label="شناسه تاپین (اختیاری)" value={tapinBoxId} error={errors.tapinBoxId} hint="عدد box_id متناظر در سیستم تاپین؛ اگر خالی بماند از جعبه پیش‌فرض تاپین استفاده می‌شود." onValueChange={(value) => { setTapinBoxId(value); clearError("tapinBoxId"); }} />
          </div>
        </div>
      </Panel>

      <Panel title="وضعیت">
        <div className="grid gap-4">
          <div>
            <BpSwitch isSelected={isActive} onChange={setIsActive}>فعال</BpSwitch>
            <p className="bp-muted m-0 mt-1.5 text-[12px]">جعبه غیرفعال هنگام محاسبه هزینه ارسال در نظر گرفته نمی‌شود.</p>
          </div>
          <div>
            <BpSwitch isSelected={isDefault} onChange={setIsDefault}>جعبه پیش‌فرض</BpSwitch>
            <p className="bp-muted m-0 mt-1.5 text-[12px]">اگر هیچ جعبه‌ای با وزن مناسب یافت نشد، این جعبه انتخاب می‌شود.</p>
          </div>
        </div>
      </Panel>

      <section className="bp-frame relative flex flex-col gap-3 p-[18px] sm:flex-row sm:items-center sm:justify-between">
        <p className="bp-muted m-0 text-[12px]">پس از ذخیره، این جعبه بلافاصله در محاسبه هزینه ارسال اعمال می‌شود.</p>
        <BpButton type="submit" variant="primary" isPending={saving}>{box ? "ذخیره تغییرات" : "ثبت جعبه"}</BpButton>
      </section>
    </form>
  );
}
