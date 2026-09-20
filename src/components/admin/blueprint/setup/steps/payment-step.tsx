"use client";

import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import type { PublicGatewayConfig } from "@/modules/payments/gateway-config";
import { BlueprintPaymentGatewayManager } from "../../payment-gateway-manager";
import { BpButton, BpTag } from "../../ui";
import { SetupDoneNote, SetupFooter, SetupSection } from "../setup-ui";

const FORM_ID = "setup-payment-form";

type Props = {
  gateways: PublicGatewayConfig[];
  appUrl: string;
  /** An active gateway is already registered. */
  isDone: boolean;
  onBack?: () => void;
  onNext: () => void;
  /** The gateway was just registered: refresh the server state and move on. */
  onSaved: () => void;
};

/** One thing on the screen: register a gateway, then move on — a single button at the bottom does both. */
export function SetupPaymentStep({ gateways, appUrl, isDone, onBack, onNext, onSaved }: Props) {
  const [saving, setSaving] = useState(false);
  const active = gateways.filter((gateway) => gateway.isActive);

  if (isDone) {
    return (
      <div>
        <SetupSection title="درگاه پرداخت" description="این گام کامل است و لازم نیست کاری بکنید.">
          <SetupDoneNote title="درگاه پرداخت فعال دارید">
            <ul className="m-0 mt-1 grid list-none gap-1.5 p-0">
              {active.map((gateway) => (
                <li key={gateway.id} className="flex flex-wrap items-center gap-2">
                  <span className="font-bold">{gateway.displayName}</span>
                  <span className="bp-muted font-mono text-[11px]" dir="ltr">{gateway.credentialMasked}</span>
                  <BpTag tone={gateway.isSandbox ? "warning" : "success"}>{gateway.isSandbox ? "آزمایشی" : "زنده"}</BpTag>
                </li>
              ))}
            </ul>
            <span className="bp-muted mt-1 block text-[12px]">درگاه‌های بیشتر را بعداً از تنظیمات پرداخت اضافه کنید.</span>
          </SetupDoneNote>
        </SetupSection>
        <SetupFooter onBack={onBack} primary={<BpButton type="button" variant="primary" onClick={onNext} className="gap-1.5">ادامه<ArrowLeft size={15} /></BpButton>} />
      </div>
    );
  }

  return (
    <div>
      <SetupSection
        title="یک درگاه پرداخت اضافه کنید"
        description="۱) درگاه را انتخاب کنید  ۲) شناسهٔ اتصال را از پنل آن بردارید و در کادر بگذارید  ۳) پایین صفحه «ثبت درگاه و ادامه» را بزنید."
      >
        <BlueprintPaymentGatewayManager
          mode="form"
          stacked
          hideSubmit
          formId={FORM_ID}
          initialConfigs={gateways}
          appUrl={appUrl}
          onSaved={onSaved}
          onPendingChange={setSaving}
        />
      </SetupSection>
      <SetupFooter
        onBack={onBack}
        hint="بدون درگاه پرداخت، مشتری نمی‌تواند سفارشش را پرداخت کند."
        primary={<BpButton type="submit" form={FORM_ID} variant="primary" isPending={saving} className="gap-1.5">ثبت درگاه و ادامه{!saving && <ArrowLeft size={15} />}</BpButton>}
      />
    </div>
  );
}
