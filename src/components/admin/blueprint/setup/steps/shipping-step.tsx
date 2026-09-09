"use client";

import { useState } from "react";
import { toast } from "@heroui/react";
import { CheckCircle2 } from "lucide-react";
import { requestErrorMessage, requestJson } from "@/lib/api-request";
import { BlueprintShippingMethodForm } from "../../shipping-method-form";
import { BlueprintShippingOriginPicker } from "../../shipping-origin-picker";
import { BpButton, BpKicker, BpTag } from "../../ui";

type Props = {
  provinces: Array<{ id: string; name: string }>;
  initialOrigin: { provinceId: string | null; cityId: string | null };
  originSaved: boolean;
  hasActiveMethod: boolean;
  onSaved: () => void;
};

export function SetupShippingStep({ provinces, initialOrigin, originSaved, hasActiveMethod, onSaved }: Props) {
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

  return (
    <div className="grid gap-3">
      <section className="bp-frame relative p-[16px]">
        <BpKicker>وضعیت این گام</BpKicker>
        <div className="mt-2 grid gap-1.5 text-[12px]">
          <span className="flex items-center gap-2"><CheckCircle2 size={15} className={originSaved ? "text-[var(--bp-success)]" : "bp-muted"} /><span className={originSaved ? "" : "bp-muted"}>استان و شهر مبدأ انتخاب شده</span><BpTag tone={originSaved ? "success" : "neutral"}>{originSaved ? "کامل" : "ناقص"}</BpTag></span>
          <span className="flex items-center gap-2"><CheckCircle2 size={15} className={hasActiveMethod ? "text-[var(--bp-success)]" : "bp-muted"} /><span className={hasActiveMethod ? "" : "bp-muted"}>حداقل یک روش ارسال فعال</span><BpTag tone={hasActiveMethod ? "success" : "neutral"}>{hasActiveMethod ? "کامل" : "ناقص"}</BpTag></span>
        </div>
      </section>

      <section className="bp-frame relative p-[16px]">
        <BpKicker>مبدأ ارسال</BpKicker>
        <p className="bp-muted m-0 mt-1 text-[12px] leading-6">آدرسی که سفارش‌ها از آن ارسال می‌شوند؛ برای محاسبهٔ نرخ کرایه لازم است.</p>
        <div className="mt-3">
          <BlueprintShippingOriginPicker
            provinceId={origin.provinceId}
            cityId={origin.cityId}
            onChange={(next) => { setOrigin(next); setOriginError(null); }}
          />
          {originError && <p role="alert" className="m-0 mt-1 text-[12px] leading-6 text-[var(--bp-danger)]">{originError}</p>}
          <div className="mt-2 flex justify-end">
            <BpButton type="button" isPending={savingOrigin} onClick={() => void saveOrigin()}>ذخیره مبدأ</BpButton>
          </div>
        </div>
      </section>

      <section className="bp-frame relative p-[16px]">
        <BpKicker>روش ارسال</BpKicker>
        <p className="bp-muted m-0 mt-1 text-[12px] leading-6">حداقل یک روش فعال لازم است تا مشتری بتواند در تسویه حساب ارسال را انتخاب کند.</p>
        <div className="mt-3">
          <BlueprintShippingMethodForm provinces={provinces} onSaved={onSaved} />
        </div>
      </section>
    </div>
  );
}
