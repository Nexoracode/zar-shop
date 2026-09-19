"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, FlaskConical, Info, RefreshCw, Wallet } from "lucide-react";
import type { PublicSmsProviderConfig } from "@/modules/communications/sms-config";
import type { SmsAccountInspection } from "@/modules/communications/sms-account";
import { requestSmsAccountInspection } from "./sms-account-client";
import { SmsAccountSummary } from "./sms-account-summary";
import { SmsTestDialog } from "./sms-test-dialog";
import { BpButton, BpKicker, BpSpinner, BpTag } from "./ui";

type Check = { tone: "success" | "warning"; text: string };
type State = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; inspection: SmsAccountInspection };

// The saved configuration compared against what the account really has — the mismatches an admin
// would otherwise only discover when a customer never receives a code.
function buildChecks(config: PublicSmsProviderConfig, storeName: string, inspection: SmsAccountInspection): Check[] {
  const checks: Check[] = [];
  const { profile, balance, lines, patterns } = inspection;
  checks.push(config.isActive ? { tone: "success", text: "فراز اس‌ام‌اس ارائه‌دهنده فعال ارسال است." } : { tone: "warning", text: "فراز اس‌ام‌اس هنوز به‌عنوان ارائه‌دهنده فعال انتخاب نشده است." });
  if (profile?.blocked) checks.push({ tone: "warning", text: "حساب فراز اس‌ام‌اس مسدود است." });
  if (profile?.verified === false) checks.push({ tone: "warning", text: "احراز هویت حساب فراز اس‌ام‌اس کامل نشده است." });
  if (balance.amountToman === 0 || balance.smsCount === 0) checks.push({ tone: "warning", text: "موجودی حساب تمام شده است؛ تا شارژ مجدد پیامکی ارسال نمی‌شود." });
  if (lines) {
    checks.push(lines.some((line) => line.number === config.senderNumber.replace(/\D/g, ""))
      ? { tone: "success", text: "سرشماره ذخیره‌شده جزو خطوط قابل‌استفاده حساب است." }
      : { tone: "warning", text: `سرشماره ${config.senderNumber} در فهرست خطوط این حساب نیست؛ ارسال‌ها ممکن است رد شوند.` });
  }
  if (!config.otp) {
    checks.push({ tone: "warning", text: "پترن کد تأیید ثبت نشده است؛ کد ورود و ثبت‌نام ارسال نمی‌شود." });
  } else if (patterns) {
    const pattern = patterns.find((item) => item.code === config.otp?.patternCode);
    if (!pattern) {
      checks.push({ tone: "warning", text: `پترن با کد ${config.otp.patternCode} در حساب فراز پیدا نشد.` });
    } else {
      checks.push({ tone: "success", text: "پترن کد تأیید در حساب فراز وجود دارد." });
      const nameVariable = config.otp.nameVariable ? pattern.vars.find((variable) => variable.var === config.otp?.nameVariable) : null;
      // A variable value longer than the length declared in the panel makes Faraz silently hold the message for human approval.
      if (nameVariable && nameVariable.length > 0 && storeName.length > nameVariable.length) checks.push({ tone: "warning", text: `نام فروشگاه (${storeName.length.toLocaleString("fa-IR")} نویسه) از طول متغیر «${nameVariable.var}» (${nameVariable.length.toLocaleString("fa-IR")}) بلندتر است؛ فراز کد تأیید را برای تأیید اپراتور نگه می‌دارد.` });
    }
  }
  return checks;
}

export function BlueprintSmsAccountOverview({ config, storeName }: { config: PublicSmsProviderConfig; storeName: string }) {
  const [state, setState] = useState<State>({ status: "loading" });
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    requestSmsAccountInspection()
      .then((inspection) => { if (!cancelled) setState({ status: "ready", inspection }); })
      .catch((error) => { if (!cancelled) setState({ status: "error", message: error instanceof Error ? error.message : "خطای ناشناخته" }); });
    return () => { cancelled = true; };
  }, []);

  function refresh() {
    setState({ status: "loading" });
    requestSmsAccountInspection()
      .then((inspection) => setState({ status: "ready", inspection }))
      .catch((error) => setState({ status: "error", message: error instanceof Error ? error.message : "خطای ناشناخته" }));
  }

  const loading = state.status === "loading";
  return (
    <section className="bp-frame relative mb-2 p-[16px]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center border border-[var(--bp-accent)] bg-[var(--bp-accent-100)] text-[var(--bp-accent)]"><Wallet size={17} /></span>
          <div className="min-w-0">
            <BpKicker>حساب فراز اس‌ام‌اس</BpKicker>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <BpTag tone={config.isActive ? "success" : "neutral"}>{config.isActive ? "فعال" : "غیرفعال"}</BpTag>
              <span className="bp-muted font-mono text-[11px]" dir="ltr">{config.senderNumber}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <BpButton type="button" variant="secondary" isPending={loading} onClick={refresh} className="gap-2"><RefreshCw size={14} />بروزرسانی</BpButton>
          <BpButton type="button" variant="primary" onClick={() => setTesting(true)} className="gap-2"><FlaskConical size={14} />ارسال آزمایشی</BpButton>
        </div>
      </div>

      <div className="mt-3">
        {state.status === "loading" && <div className="bp-muted flex items-center gap-2 text-[12px]"><BpSpinner size={14} />در حال دریافت اطلاعات از فراز اس‌ام‌اس…</div>}
        {state.status === "error" && (
          <div className="flex items-start gap-2.5 border border-[var(--bp-danger)] p-3 text-[12px] leading-6 text-[var(--bp-danger)]">
            <AlertTriangle size={15} className="mt-1 shrink-0" />
            <span>{state.message}</span>
          </div>
        )}
        {state.status === "ready" && (
          <div className="grid items-start gap-2 lg:grid-cols-2">
            <SmsAccountSummary inspection={state.inspection} />
            <ul className="m-0 grid list-none gap-2 p-0">
              {buildChecks(config, storeName, state.inspection).map((check) => (
                <li key={check.text} className={`flex items-start gap-2 border p-2.5 text-[12px] leading-6 ${check.tone === "success" ? "border-[var(--bp-divider)]" : "border-[var(--bp-warning)] bg-[var(--bp-warning-bg)] text-[var(--bp-warning)]"}`}>
                  {check.tone === "success" ? <CheckCircle2 size={14} className="mt-1 shrink-0 text-[var(--bp-success)]" /> : <AlertTriangle size={14} className="mt-1 shrink-0" />}
                  <span>{check.text}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="mt-3 flex items-start gap-2.5 border border-[var(--bp-divider)] p-3 text-[12px] leading-6">
        <Info size={14} className="bp-muted mt-1 shrink-0" />
        <p className="bp-muted m-0">پیامک‌های متنی آزاد (ارسال دستی و اعلان‌های سفارش) طبق قوانین فراز پیش از ارسال توسط اپراتور تأیید می‌شوند و فوری نیستند؛ فقط ارسال با پترن، مثل کد تأیید، بلافاصله انجام می‌شود. اگر می‌خواهید پیامک‌های متنی بدون تأیید بروند، از پشتیبانی فراز بخواهید حساب را مستثنا کند.</p>
      </div>

      {testing && <SmsTestDialog open onClose={() => setTesting(false)} hasOtpPattern={Boolean(config.otp)} ownerMobile={state.status === "ready" ? state.inspection.profile?.mobile ?? null : null} />}
    </section>
  );
}
