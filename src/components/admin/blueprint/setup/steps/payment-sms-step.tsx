"use client";

import { ArrowLeft } from "lucide-react";
import type { PublicGatewayConfig } from "@/modules/payments/gateway-config";
import type { PublicSmsProviderConfig } from "@/modules/communications/sms-config";
import { BlueprintPaymentGatewayManager } from "../../payment-gateway-manager";
import { BlueprintSmsProviderManager } from "../../sms-provider-manager";
import { BpButton } from "../../ui";
import { SetupFooter, SetupSection } from "../setup-ui";

type Props = {
  gateways: PublicGatewayConfig[];
  smsConfigs: PublicSmsProviderConfig[];
  appUrl: string;
  storeName: string;
  /** Both a gateway and an SMS provider are in place. */
  isComplete: boolean;
  onBack?: () => void;
  onNext: () => void;
  onSaved: () => void;
};

export function SetupPaymentSmsStep({ gateways, smsConfigs, appUrl, storeName, isComplete, onBack, onNext, onSaved }: Props) {
  const hasGateway = gateways.some((gateway) => gateway.isActive);
  const hasSms = smsConfigs.length > 0;
  const missing = [!hasGateway && "یک درگاه پرداخت فعال", !hasSms && "یک سرویس پیامک"].filter(Boolean).join(" و ");
  return (
    <div>
      <SetupSection
        title="درگاه پرداخت"
        description="مشتری از طریق این درگاه سفارشش را پرداخت می‌کند. بدون یک درگاه فعال، خرید آنلاین ممکن نیست."
        status={hasGateway ? "done" : "todo"}
      >
        <BlueprintPaymentGatewayManager mode="form" initialConfigs={gateways} appUrl={appUrl} onSaved={onSaved} />
      </SetupSection>

      <SetupSection
        title="سرویس پیامک"
        description="کد تأیید ورود و ثبت‌نام مشتری‌ها با همین سرویس پیامک می‌شود؛ بدون آن کسی نمی‌تواند وارد شود."
        status={hasSms ? "done" : "todo"}
      >
        <BlueprintSmsProviderManager mode="form" initialConfigs={smsConfigs} storeName={storeName} onSaved={onSaved} />
      </SetupSection>

      <SetupFooter
        onBack={onBack}
        hint={isComplete ? undefined : `برای ادامه ${missing} ثبت کنید.`}
        primary={<BpButton type="button" variant="primary" disabled={!isComplete} onClick={onNext} className="gap-1.5">ادامه<ArrowLeft size={15} /></BpButton>}
      />
    </div>
  );
}
