"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, LogOut } from "lucide-react";
import type { PublicGatewayConfig } from "@/modules/payments/gateway-config";
import type { PublicSmsProviderConfig } from "@/modules/communications/sms-config";
import type { BrandSettings } from "@/modules/settings/brand-settings";
import type { SetupState, SetupStepId } from "@/modules/settings/setup-schemas";
import { SETUP_STEP_IDS } from "@/modules/settings/setup-schemas";
import { BpButton } from "../ui";
import { SetupBasicsStep } from "./steps/basics-step";
import { SetupBrandStep } from "./steps/brand-step";
import { SetupContactStep } from "./steps/contact-step";
import { SetupFinishStep } from "./steps/finish-step";
import { SetupPaymentSmsStep } from "./steps/payment-sms-step";
import { SetupShippingStep } from "./steps/shipping-step";

type WizardStepId = SetupStepId | "finish";

const STEP_ORDER: WizardStepId[] = [...SETUP_STEP_IDS, "finish"];

const STEP_LABELS: Record<WizardStepId, string> = {
  basics: "صنف و اطلاعات پایه",
  contact: "تماس و اطلاعات حقوقی",
  brand: "برند و ظاهر",
  "payment-sms": "درگاه پرداخت و پیامک",
  shipping: "ارسال",
  finish: "پایان و فعال‌سازی",
};

const SETUP_STEP_LABELS: Record<SetupStepId, string> = {
  basics: STEP_LABELS.basics,
  contact: STEP_LABELS.contact,
  brand: STEP_LABELS.brand,
  "payment-sms": STEP_LABELS["payment-sms"],
  shipping: STEP_LABELS.shipping,
};

type Props = {
  state: SetupState;
  storeName: string;
  basics: { industry: SetupState["industry"]; storeName: string; tagline: string; shortDescription: string };
  contact: { supportPhone: string; supportEmail: string; storeAddress: string; legalIdentifier: string; supportHours: string };
  brand: BrandSettings;
  origin: { provinceId: string | null; cityId: string | null };
  provinces: Array<{ id: string; name: string }>;
  gateways: PublicGatewayConfig[];
  smsConfigs: PublicSmsProviderConfig[];
  appUrl: string;
};

export function SetupWizard({ state, storeName, basics, contact, brand, origin, provinces, gateways, smsConfigs, appUrl }: Props) {
  const router = useRouter();
  const [current, setCurrent] = useState<WizardStepId>(() => STEP_ORDER.find((id) => id !== "finish" && !state.steps[id as SetupStepId]) ?? "finish");
  const [loggingOut, setLoggingOut] = useState(false);

  const currentIndex = STEP_ORDER.indexOf(current);
  const refresh = () => router.refresh();
  const goNext = () => setCurrent(STEP_ORDER[Math.min(currentIndex + 1, STEP_ORDER.length - 1)]);
  const goPrev = () => setCurrent(STEP_ORDER[Math.max(currentIndex - 1, 0)]);
  const savedAndNext = () => { router.refresh(); goNext(); };

  async function logout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/admin/login");
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  }

  function stepStatus(id: WizardStepId): "done" | "current" | "todo" {
    if (id === current) return "current";
    if (id === "finish") return state.allStepsSatisfied ? "done" : "todo";
    return state.steps[id as SetupStepId] ? "done" : "todo";
  }

  return (
    <div dir="rtl" className="bp-root min-h-dvh bg-[var(--bp-bg)]">
      <header className="bp-dark-bar flex h-12 items-center justify-between gap-3 border-b border-[var(--bp-sidebar-border)] px-4">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-7 w-7 flex-none items-center justify-center border border-[var(--bp-sidebar-border)] text-xs font-bold">ز</span>
          <strong className="truncate text-[13px] font-bold">راه‌اندازی {storeName}</strong>
        </div>
        <BpButton size="sm" variant="danger" isPending={loggingOut} onClick={() => void logout()} className="gap-1.5">
          {!loggingOut && <LogOut size={14} />}خروج
        </BpButton>
      </header>

      <div className="mx-auto grid max-w-4xl gap-4 px-4 py-6">
        <ol className="grid list-none grid-cols-2 gap-2 p-0 sm:grid-cols-3 lg:grid-cols-6">
          {STEP_ORDER.map((id, index) => {
            const status = stepStatus(id);
            return (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => setCurrent(id)}
                  aria-current={status === "current" ? "step" : undefined}
                  className={`flex w-full items-center gap-2 border p-2 text-right text-[11px] leading-4 ${status === "current" ? "border-[var(--bp-accent)] bg-[var(--bp-accent-100)]" : status === "done" ? "border-[var(--bp-success)] bg-[var(--bp-success-bg)]" : "border-[var(--bp-divider)] bg-[var(--bp-card)]"}`}
                >
                  <span className={`grid size-5 shrink-0 place-items-center border text-[10px] font-bold ${status === "done" ? "border-[var(--bp-success)] text-[var(--bp-success)]" : status === "current" ? "border-[var(--bp-accent)] text-[var(--bp-accent)]" : "border-[var(--bp-divider)] bp-muted"}`}>
                    {status === "done" ? <Check size={11} /> : (index + 1).toLocaleString("fa-IR")}
                  </span>
                  <span className="min-w-0 truncate font-bold">{STEP_LABELS[id]}</span>
                </button>
              </li>
            );
          })}
        </ol>

        <div>
          <h1 className="m-0 text-[17px] font-bold">{STEP_LABELS[current]}</h1>
          <p className="bp-muted m-0 mt-1 text-[12px]">گام {(currentIndex + 1).toLocaleString("fa-IR")} از {STEP_ORDER.length.toLocaleString("fa-IR")}</p>
        </div>

        {current === "basics" && <SetupBasicsStep initial={basics} onSaved={savedAndNext} />}
        {current === "contact" && <SetupContactStep initial={contact} onSaved={savedAndNext} />}
        {current === "brand" && <SetupBrandStep initial={brand} onSaved={savedAndNext} />}
        {current === "payment-sms" && <SetupPaymentSmsStep gateways={gateways} smsConfigs={smsConfigs} appUrl={appUrl} storeName={storeName} onSaved={refresh} />}
        {current === "shipping" && (
          <SetupShippingStep
            provinces={provinces}
            initialOrigin={origin}
            originSaved={Boolean(origin.provinceId)}
            hasActiveMethod={state.steps.shipping}
            onSaved={refresh}
          />
        )}
        {current === "finish" && (
          <SetupFinishStep
            steps={state.steps}
            labels={SETUP_STEP_LABELS}
            order={[...SETUP_STEP_IDS]}
            allStepsSatisfied={state.allStepsSatisfied}
            onGoToStep={(step) => setCurrent(step)}
          />
        )}

        <div className="flex items-center justify-between gap-3 border-t border-[var(--bp-divider)] pt-4">
          <BpButton onClick={goPrev} disabled={currentIndex === 0}>گام قبلی</BpButton>
          {current !== "finish" && <BpButton variant="secondary" onClick={goNext}>گام بعدی</BpButton>}
        </div>
      </div>
    </div>
  );
}
