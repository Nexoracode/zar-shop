"use client";

import { CheckCircle2 } from "lucide-react";
import type { PublicGatewayConfig } from "@/modules/payments/gateway-config";
import type { PublicSmsProviderConfig } from "@/modules/communications/sms-config";
import { BlueprintPaymentGatewayManager } from "../../payment-gateway-manager";
import { BlueprintSmsProviderManager } from "../../sms-provider-manager";
import { BpKicker, BpTag } from "../../ui";

type Props = {
  gateways: PublicGatewayConfig[];
  smsConfigs: PublicSmsProviderConfig[];
  appUrl: string;
  storeName: string;
  onSaved: () => void;
};

function StatusLine({ done, label }: { done: boolean; label: string }) {
  return (
    <span className="flex items-center gap-2 text-[12px]">
      <CheckCircle2 size={15} className={done ? "text-[var(--bp-success)]" : "bp-muted"} />
      <span className={done ? "" : "bp-muted"}>{label}</span>
      <BpTag tone={done ? "success" : "neutral"}>{done ? "کامل" : "ناقص"}</BpTag>
    </span>
  );
}

export function SetupPaymentSmsStep({ gateways, smsConfigs, appUrl, storeName, onSaved }: Props) {
  return (
    <div className="grid gap-3">
      <section className="bp-frame relative p-[16px]">
        <BpKicker>وضعیت این گام</BpKicker>
        <div className="mt-2 grid gap-1.5">
          <StatusLine done={gateways.some((gateway) => gateway.isActive)} label="حداقل یک درگاه پرداخت فعال" />
          <StatusLine done={smsConfigs.length > 0} label="حداقل یک ارائه‌دهنده پیامک ثبت شده" />
        </div>
      </section>

      <section className="bp-frame relative p-[16px]">
        <BpKicker>درگاه پرداخت</BpKicker>
        <p className="bp-muted m-0 mt-1 text-[12px] leading-6">بدون درگاه فعال، امکان پرداخت آنلاین سفارش وجود ندارد.</p>
        <div className="mt-3">
          <BlueprintPaymentGatewayManager mode="form" initialConfigs={gateways} appUrl={appUrl} onSaved={onSaved} />
        </div>
      </section>

      <section className="bp-frame relative p-[16px]">
        <BpKicker>ارائه‌دهنده پیامک</BpKicker>
        <p className="bp-muted m-0 mt-1 text-[12px] leading-6">کد تأیید ورود و ثبت‌نام مشتریان از طریق همین ارائه‌دهنده ارسال می‌شود.</p>
        <div className="mt-3">
          <BlueprintSmsProviderManager mode="form" initialConfigs={smsConfigs} storeName={storeName} onSaved={onSaved} />
        </div>
      </section>
    </div>
  );
}
