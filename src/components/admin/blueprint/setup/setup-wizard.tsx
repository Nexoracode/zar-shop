"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, LogOut, Store } from "lucide-react";
import type { PublicGatewayConfig } from "@/modules/payments/gateway-config";
import type { PublicSmsProviderConfig } from "@/modules/communications/sms-config";
import type { BrandSettings } from "@/modules/settings/brand-settings";
import type { SetupState } from "@/modules/settings/setup-schemas";
import { BpButton } from "../ui";
import { SetupBasicsStep } from "./steps/basics-step";
import { SetupBrandStep } from "./steps/brand-step";
import { SetupContactStep } from "./steps/contact-step";
import { SetupFinishStep } from "./steps/finish-step";
import { SetupMethodStep } from "./steps/method-step";
import { SetupOriginStep } from "./steps/origin-step";
import { SetupPaymentStep } from "./steps/payment-step";
import { SetupSmsStep } from "./steps/sms-step";

/**
 * The screens, in order. Payment, SMS, shipping origin and shipping method are separate screens —
 * one thing to do on each — even though the server counts them as two steps.
 */
const WORK_STEPS = ["basics", "contact", "brand", "payment", "sms", "origin", "method"] as const;
type WorkStepId = (typeof WORK_STEPS)[number];
type WizardStepId = WorkStepId | "finish";

const STEP_ORDER: WizardStepId[] = [...WORK_STEPS, "finish"];

/** What each step is called, and — in one line — what it is for, so nobody has to guess. */
const STEP_META: Record<WizardStepId, { label: string; summary: string; intro: string }> = {
  basics: { label: "صنف و اطلاعات پایه", summary: "نوع فروشگاه و نام آن", intro: "نوع کالاهایی که می‌فروشید و نامی که مشتری‌ها می‌بینند را مشخص کنید." },
  contact: { label: "تماس و اطلاعات حقوقی", summary: "راه ارتباطی و اطلاعات فاکتور", intro: "این اطلاعات روی فاکتور رسمی و در صفحهٔ تماس فروشگاه نمایش داده می‌شوند." },
  brand: { label: "برند و ظاهر", summary: "لوگو، فاویکون و رنگ‌ها", intro: "لوگو و رنگ‌های فروشگاه را انتخاب کنید تا سایت شبیه برند شما شود." },
  payment: { label: "درگاه پرداخت", summary: "دریافت پول از مشتری", intro: "مشتری سفارشش را از طریق درگاه پرداخت می‌کند. یک درگاه اضافه کنید." },
  sms: { label: "سرویس پیامک", summary: "ارسال کد تأیید ورود", intro: "کد ورود و ثبت‌نام با پیامک می‌رود. یک سرویس پیامک وصل کنید." },
  origin: { label: "مبدأ ارسال", summary: "سفارش‌ها از کجا می‌روند", intro: "شهری که سفارش‌ها را از آنجا ارسال می‌کنید تا کرایه درست محاسبه شود." },
  method: { label: "روش ارسال", summary: "چطور به مشتری می‌رسد", intro: "روشی که مشتری در تسویه‌حساب برای دریافت سفارش انتخاب می‌کند." },
  finish: { label: "مرور و فعال‌سازی", summary: "باز کردن فروشگاه", intro: "همه‌چیز را یک‌بار مرور کنید و فروشگاه را برای مشتری‌ها باز کنید." },
};

const WORK_LABELS = Object.fromEntries(WORK_STEPS.map((id) => [id, STEP_META[id].label])) as Record<WorkStepId, string>;

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

type StepStatus = "done" | "current" | "todo";

/** The numbered dot of a step: a tick once it is complete, its number otherwise. */
function StepDot({ index, status }: { index: number; status: StepStatus }) {
  return (
    <span
      className={`grid size-7 shrink-0 place-items-center rounded-full border text-[12px] font-bold ${
        status === "done" ? "border-[var(--bp-success)] bg-[var(--bp-success)] text-white"
          : status === "current" ? "border-[var(--bp-accent)] bg-[var(--bp-accent)] text-white"
            : "border-[var(--bp-divider)] bg-[var(--bp-card)] text-[var(--bp-muted)]"
      }`}
    >
      {status === "done" ? <Check size={14} strokeWidth={3} aria-hidden /> : (index + 1).toLocaleString("fa-IR")}
    </span>
  );
}

export function SetupWizard({ state, storeName, basics, contact, brand, origin, provinces, gateways, smsConfigs, appUrl }: Props) {
  const router = useRouter();
  // Whether each screen's work is done; the four that share a server step come from `state.parts`.
  const done: Record<WorkStepId, boolean> = {
    basics: state.steps.basics,
    contact: state.steps.contact,
    brand: state.steps.brand,
    payment: state.parts.gateway,
    sms: state.parts.sms,
    origin: state.parts.shippingOrigin,
    method: state.parts.shippingMethod,
  };
  const [current, setCurrent] = useState<WizardStepId>(() => WORK_STEPS.find((id) => !done[id]) ?? "finish");
  const [loggingOut, setLoggingOut] = useState(false);

  const currentIndex = STEP_ORDER.indexOf(current);
  const refresh = () => router.refresh();
  const goTo = (id: WizardStepId) => {
    setCurrent(id);
    // A step is a new screen: start it from the top rather than wherever the last one was scrolled to.
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const goNext = () => goTo(STEP_ORDER[Math.min(currentIndex + 1, STEP_ORDER.length - 1)]);
  const goPrev = currentIndex > 0 ? () => goTo(STEP_ORDER[currentIndex - 1]) : undefined;
  const savedAndNext = () => { router.refresh(); goNext(); };

  const doneCount = WORK_STEPS.filter((id) => done[id]).length;
  const total = WORK_STEPS.length;
  const percent = Math.round((doneCount / total) * 100);

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

  function stepStatus(id: WizardStepId): StepStatus {
    if (id === current) return "current";
    if (id === "finish") return state.allStepsSatisfied ? "done" : "todo";
    return done[id] ? "done" : "todo";
  }

  const meta = STEP_META[current];

  return (
    <div dir="rtl" className="bp-root min-h-dvh bg-[var(--bp-bg)]">
      <header className="bp-dark-bar flex h-12 items-center justify-between gap-3 border-b border-[var(--bp-sidebar-border)] px-4">
        <div className="flex min-w-0 items-center gap-2">
          <span className="grid size-7 flex-none place-items-center rounded-[var(--bp-radius-sm)] border border-[var(--bp-sidebar-border)]"><Store size={15} aria-hidden /></span>
          <strong className="truncate text-[13px] font-bold">راه‌اندازی {storeName}</strong>
        </div>
        <BpButton size="sm" variant="danger" isPending={loggingOut} onClick={() => void logout()} className="gap-1.5">
          {!loggingOut && <LogOut size={14} />}خروج
        </BpButton>
      </header>

      <div className="mx-auto grid max-w-5xl gap-5 px-4 py-6">
        {/* Says up front what this is, how long it is, and that nothing is lost by stopping halfway. */}
        <section className="bp-frame flex flex-wrap items-center gap-x-6 gap-y-3 p-5">
          <div className="min-w-0 flex-1 basis-[280px]">
            <h1 className="m-0 text-[18px] font-bold">فروشگاه‌تان را برای فروش آماده کنید</h1>
            <p className="bp-muted m-0 mt-1.5 text-[12.5px] leading-7">
              فقط {total.toLocaleString("fa-IR")} گام کوتاه مانده. روی هر صفحه فقط یک کار دارید و دکمهٔ پایین صفحه آن را ذخیره می‌کند و شما را به گام بعد می‌برد؛ هر وقت خواستید می‌توانید برگردید.
              تا پایان همهٔ گام‌ها، فروشگاه برای مشتری‌ها بسته می‌ماند.
            </p>
          </div>
          <div className="w-full basis-[220px] sm:w-[240px] sm:flex-none">
            <div className="flex items-baseline justify-between text-[12px]">
              <strong>{doneCount.toLocaleString("fa-IR")} از {total.toLocaleString("fa-IR")} گام کامل شده</strong>
              <span className="bp-muted">{percent.toLocaleString("fa-IR")}٪</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--bp-divider)]" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={doneCount} aria-label="پیشرفت راه‌اندازی">
              <div className="h-full rounded-full bg-[var(--bp-success)] transition-[width] duration-500" style={{ width: `${percent}%` }} />
            </div>
          </div>
        </section>

        <div className="grid items-start gap-5 lg:grid-cols-[250px_minmax(0,1fr)]">
          {/* On a wide screen the steps are a list down the side, each saying what it is for; on a
              phone they shrink to a row of numbers, and the heading below names the current one. */}
          <nav aria-label="گام‌های راه‌اندازی" className="lg:sticky lg:top-4">
            <ol className="m-0 flex list-none gap-2 overflow-x-auto p-0 pb-1 lg:hidden">
              {STEP_ORDER.map((id, index) => (
                <li key={id}>
                  <button type="button" onClick={() => goTo(id)} aria-label={`گام ${(index + 1).toLocaleString("fa-IR")}: ${STEP_META[id].label}`} aria-current={id === current ? "step" : undefined} className="rounded-full">
                    <StepDot index={index} status={stepStatus(id)} />
                  </button>
                </li>
              ))}
            </ol>
            <ol className="bp-frame m-0 hidden list-none p-2 lg:block">
              {STEP_ORDER.map((id, index) => {
                const status = stepStatus(id);
                return (
                  <li key={id} className="relative">
                    {/* The line joining a step to the next; it is drawn from the dot down. */}
                    {index < STEP_ORDER.length - 1 && <span aria-hidden className="absolute start-[23.5px] top-[38px] bottom-[-8px] w-px bg-[var(--bp-divider)]" />}
                    <button
                      type="button"
                      onClick={() => goTo(id)}
                      aria-current={status === "current" ? "step" : undefined}
                      className={`relative flex w-full items-start gap-3 rounded-[var(--bp-radius)] p-2.5 text-right transition-colors ${status === "current" ? "bg-[var(--bp-accent-100)]" : "hover:bg-[var(--bp-hover)]"}`}
                    >
                      <StepDot index={index} status={status} />
                      <span className="min-w-0 pt-0.5">
                        <strong className="block text-[13px] leading-5">{STEP_META[id].label}</strong>
                        <span className="bp-muted block text-[11px] leading-5">{status === "done" && id !== "finish" ? "کامل شد" : STEP_META[id].summary}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </nav>

          <div className="bp-frame relative min-w-0">
            <header className="p-5">
              <span className="bp-muted text-[11px] font-bold">گام {(currentIndex + 1).toLocaleString("fa-IR")} از {STEP_ORDER.length.toLocaleString("fa-IR")}</span>
              <h2 className="m-0 mt-1 text-[17px] font-bold">{meta.label}</h2>
              <p className="bp-muted m-0 mt-1.5 text-[12.5px] leading-7">{meta.intro}</p>
            </header>

            {current === "basics" && <SetupBasicsStep initial={basics} onBack={goPrev} onSaved={savedAndNext} />}
            {current === "contact" && <SetupContactStep initial={contact} onBack={goPrev} onSaved={savedAndNext} />}
            {current === "brand" && <SetupBrandStep initial={brand} onBack={goPrev} onSaved={savedAndNext} />}
            {current === "payment" && (
              <SetupPaymentStep gateways={gateways} appUrl={appUrl} isDone={done.payment} onBack={goPrev} onNext={goNext} onSaved={savedAndNext} />
            )}
            {current === "sms" && (
              <SetupSmsStep smsConfigs={smsConfigs} storeName={storeName} isDone={done.sms} onBack={goPrev} onNext={goNext} onSaved={savedAndNext} />
            )}
            {current === "origin" && <SetupOriginStep initialOrigin={origin} onBack={goPrev} onSaved={savedAndNext} />}
            {current === "method" && <SetupMethodStep provinces={provinces} isDone={done.method} onBack={goPrev} onNext={goNext} onSaved={savedAndNext} />}
            {current === "finish" && (
              <SetupFinishStep
                steps={done}
                labels={WORK_LABELS}
                order={[...WORK_STEPS]}
                allStepsSatisfied={state.allStepsSatisfied}
                onBack={goPrev}
                onGoToStep={(step) => goTo(step as WizardStepId)}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
