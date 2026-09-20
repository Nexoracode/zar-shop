"use client";

import { useState } from "react";
import { toast } from "@heroui/react";
import { ArrowLeft } from "lucide-react";
import { requestErrorMessage, requestJson } from "@/lib/api-request";
import { BlueprintShippingMethodForm } from "../../shipping-method-form";
import { BlueprintShippingOriginPicker } from "../../shipping-origin-picker";
import { BpButton } from "../../ui";
import { SetupFooter, SetupSection } from "../setup-ui";

type Props = {
  provinces: Array<{ id: string; name: string }>;
  initialOrigin: { provinceId: string | null; cityId: string | null };
  originSaved: boolean;
  hasActiveMethod: boolean;
  /** The origin is saved and at least one method is active. */
  isComplete: boolean;
  onBack?: () => void;
  onNext: () => void;
  onSaved: () => void;
};

export function SetupShippingStep({ provinces, initialOrigin, originSaved, hasActiveMethod, isComplete, onBack, onNext, onSaved }: Props) {
  const [origin, setOrigin] = useState(initialOrigin);
  const [savingOrigin, setSavingOrigin] = useState(false);
  const [originError, setOriginError] = useState<string | null>(null);

  async function saveOrigin() {
    if (!origin.provinceId || !origin.cityId) {
      setOriginError("استان و شهر مبدأ را انتخاب کنید.");
      return;
    }
    setOriginError(null);
    setSavingOrigin(true);
    try {
      await requestJson("/api/admin/setup", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: "shipping-origin", originProvinceId: origin.provinceId, originCityId: origin.cityId }),
      }, { fallbackMessage: "ذخیره مبدأ ارسال انجام نشد." });
      toast.success("مبدأ ارسال ذخیره شد");
      setSavingOrigin(false);
      onSaved();
    } catch (reason) {
      toast.danger("ذخیره انجام نشد", { description: requestErrorMessage(reason, "ارتباط با سرور برقرار نشد.") });
      setSavingOrigin(false);
    }
  }

  const missing = [!originSaved && "مبدأ ارسال را ذخیره", !hasActiveMethod && "یک روش ارسال فعال ثبت"].filter(Boolean).join(" و ");

  return (
    <div>
      <SetupSection
        title="مبدأ ارسال"
        description="شهری که سفارش‌ها از آنجا بسته‌بندی و ارسال می‌شوند. کرایهٔ ارسال بر اساس همین مبدأ محاسبه می‌شود."
        status={originSaved ? "done" : "todo"}
      >
        <BlueprintShippingOriginPicker
          provinceId={origin.provinceId}
          cityId={origin.cityId}
          onChange={(next) => { setOrigin(next); setOriginError(null); }}
        />
        {originError && <p role="alert" className="m-0 mt-1 text-[12px] leading-6 text-[var(--bp-danger)]">{originError}</p>}
        <div className="mt-2 flex justify-end">
          <BpButton type="button" isPending={savingOrigin} onClick={() => void saveOrigin()}>ذخیره مبدأ</BpButton>
        </div>
      </SetupSection>

      <SetupSection
        title="روش ارسال"
        description="روشی که مشتری در تسویه‌حساب برای دریافت سفارش انتخاب می‌کند. حداقل یک روش فعال لازم است."
        status={hasActiveMethod ? "done" : "todo"}
      >
        <BlueprintShippingMethodForm provinces={provinces} onSaved={onSaved} />
      </SetupSection>

      <SetupFooter
        onBack={onBack}
        hint={isComplete ? undefined : `برای ادامه ${missing} کنید.`}
        primary={<BpButton type="button" variant="primary" disabled={!isComplete} onClick={onNext} className="gap-1.5">ادامه<ArrowLeft size={15} /></BpButton>}
      />
    </div>
  );
}
