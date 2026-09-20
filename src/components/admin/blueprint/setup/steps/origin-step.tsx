"use client";

import { useState, type FormEvent } from "react";
import { toast } from "@heroui/react";
import { ArrowLeft } from "lucide-react";
import { requestErrorMessage, requestJson } from "@/lib/api-request";
import { BlueprintShippingOriginPicker } from "../../shipping-origin-picker";
import { BpButton } from "../../ui";
import { SetupFooter, SetupSection } from "../setup-ui";

type Props = {
  initialOrigin: { provinceId: string | null; cityId: string | null };
  onBack?: () => void;
  onSaved: () => void;
};

/** Two selects and one button: where the store ships from. */
export function SetupOriginStep({ initialOrigin, onBack, onSaved }: Props) {
  const [origin, setOrigin] = useState(initialOrigin);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!origin.provinceId || !origin.cityId) {
      setError("استان و شهر مبدأ را انتخاب کنید.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await requestJson("/api/admin/setup", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: "shipping-origin", originProvinceId: origin.provinceId, originCityId: origin.cityId }),
      }, { fallbackMessage: "ذخیره مبدأ ارسال انجام نشد." });
      toast.success("مبدأ ارسال ذخیره شد");
      setSaving(false);
      onSaved();
    } catch (reason) {
      toast.danger("ذخیره انجام نشد", { description: requestErrorMessage(reason, "ارتباط با سرور برقرار نشد.") });
      setSaving(false);
    }
  }

  return (
    <form id="setup-origin-form" onSubmit={submit} noValidate>
      <SetupSection
        title="سفارش‌ها از کجا ارسال می‌شوند؟"
        description="استان و شهری را انتخاب کنید که کالا را از آنجا بسته‌بندی و ارسال می‌کنید. کرایهٔ ارسال بر اساس همین مبدأ محاسبه می‌شود."
      >
        <BlueprintShippingOriginPicker
          provinceId={origin.provinceId}
          cityId={origin.cityId}
          onChange={(next) => { setOrigin(next); setError(null); }}
        />
        {error && <p role="alert" className="m-0 mt-1 text-[12px] leading-6 text-[var(--bp-danger)]">{error}</p>}
      </SetupSection>
      <SetupFooter
        onBack={onBack}
        primary={<BpButton type="submit" variant="primary" isPending={saving} className="gap-1.5">ذخیره و ادامه{!saving && <ArrowLeft size={15} />}</BpButton>}
      />
    </form>
  );
}
