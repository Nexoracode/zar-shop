"use client";

import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { BlueprintShippingMethodForm } from "../../shipping-method-form";
import { BpButton } from "../../ui";
import { SetupDoneNote, SetupFooter, SetupSection } from "../setup-ui";

const FORM_ID = "setup-shipping-method-form";

type Props = {
  provinces: Array<{ id: string; name: string }>;
  /** An active shipping method already exists. */
  isDone: boolean;
  onBack?: () => void;
  onNext: () => void;
  /** The method was just saved: refresh the server state and move on. */
  onSaved: () => void;
};

/** One thing on the screen: add a shipping method, then move on — a single button at the bottom does both. */
export function SetupMethodStep({ provinces, isDone, onBack, onNext, onSaved }: Props) {
  const [saving, setSaving] = useState(false);

  if (isDone) {
    return (
      <div>
        <SetupSection title="روش ارسال" description="این گام کامل است و لازم نیست کاری بکنید.">
          <SetupDoneNote title="یک روش ارسال فعال ثبت شده است">
            <span className="bp-muted block text-[12px]">روش‌های بیشتر یا نرخ‌ها را بعد از فعال‌سازی از بخش «روش‌های ارسال» تغییر دهید.</span>
          </SetupDoneNote>
        </SetupSection>
        <SetupFooter onBack={onBack} primary={<BpButton type="button" variant="primary" onClick={onNext} className="gap-1.5">ادامه<ArrowLeft size={15} /></BpButton>} />
      </div>
    );
  }

  return (
    <div>
      <SetupSection
        title="یک روش ارسال تعریف کنید"
        description="این روش در تسویه‌حساب به مشتری نشان داده می‌شود. نام و شرکت حمل را بنویسید، زمان تحویل را بگذارید و در جدول نرخ، هزینه را وارد کنید؛ بعد «ثبت روش و ادامه» را بزنید."
      >
        <BlueprintShippingMethodForm provinces={provinces} formId={FORM_ID} hideSubmit onSaved={onSaved} onPendingChange={setSaving} />
      </SetupSection>
      <SetupFooter
        onBack={onBack}
        hint="حداقل یک روش ارسال فعال لازم است."
        primary={<BpButton type="submit" form={FORM_ID} variant="primary" isPending={saving} className="gap-1.5">ثبت روش و ادامه{!saving && <ArrowLeft size={15} />}</BpButton>}
      />
    </div>
  );
}
