"use client";

import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import type { PublicSmsProviderConfig } from "@/modules/communications/sms-config";
import { BlueprintSmsProviderManager } from "../../sms-provider-manager";
import { BpButton, BpTag } from "../../ui";
import { SetupDoneNote, SetupFooter, SetupSection } from "../setup-ui";

const FORM_ID = "setup-sms-form";

type Props = {
  smsConfigs: PublicSmsProviderConfig[];
  storeName: string;
  /** A provider is already registered. */
  isDone: boolean;
  onBack?: () => void;
  onNext: () => void;
  /** The provider was just saved: refresh the server state and move on. */
  onSaved: () => void;
};

/** One thing on the screen: connect an SMS service, then move on — a single button at the bottom does both. */
export function SetupSmsStep({ smsConfigs, storeName, isDone, onBack, onNext, onSaved }: Props) {
  const [saving, setSaving] = useState(false);

  if (isDone) {
    return (
      <div>
        <SetupSection title="سرویس پیامک" description="این گام کامل است و لازم نیست کاری بکنید.">
          <SetupDoneNote title="سرویس پیامک ثبت شده است">
            <ul className="m-0 mt-1 grid list-none gap-1.5 p-0">
              {smsConfigs.map((config) => (
                <li key={config.id} className="flex flex-wrap items-center gap-2">
                  <span className="font-bold">{config.displayName}</span>
                  {config.senderNumber && <span className="bp-muted text-[11px]" dir="ltr">{config.senderNumber}</span>}
                  <BpTag tone={config.isActive ? "success" : "neutral"}>{config.isActive ? "فعال" : "غیرفعال"}</BpTag>
                </li>
              ))}
            </ul>
            <span className="bp-muted mt-1 block text-[12px]">پترن‌ها و تنظیمات پیامک را بعداً از بخش اعلان‌ها تغییر دهید.</span>
          </SetupDoneNote>
        </SetupSection>
        <SetupFooter onBack={onBack} primary={<BpButton type="button" variant="primary" onClick={onNext} className="gap-1.5">ادامه<ArrowLeft size={15} /></BpButton>} />
      </div>
    );
  }

  return (
    <div>
      <SetupSection
        title="یک سرویس پیامک وصل کنید"
        description="کد ورود و ثبت‌نام مشتری‌ها با پیامک می‌رود. ۱) سرویس را انتخاب کنید  ۲) اطلاعات اتصال را وارد کنید  ۳) پایین صفحه «ذخیره و ادامه» را بزنید."
      >
        <BlueprintSmsProviderManager
          mode="form"
          stacked
          hideSubmit
          formId={FORM_ID}
          initialConfigs={smsConfigs}
          storeName={storeName}
          onSaved={onSaved}
          onPendingChange={setSaving}
        />
      </SetupSection>
      <SetupFooter
        onBack={onBack}
        hint="بدون سرویس پیامک، هیچ مشتری‌ای نمی‌تواند وارد سایت شود."
        primary={<BpButton type="submit" form={FORM_ID} variant="primary" isPending={saving} className="gap-1.5">ذخیره و ادامه{!saving && <ArrowLeft size={15} />}</BpButton>}
      />
    </div>
  );
}
