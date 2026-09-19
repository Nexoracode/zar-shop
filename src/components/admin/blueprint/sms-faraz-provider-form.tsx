"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@heroui/react";
import Link from "next/link";
import { AlertTriangle, ExternalLink, PlugZap, ShieldCheck } from "lucide-react";
import { normalizeNumericValue } from "@/lib/persian-numbers";
import { authFieldLimits } from "@/modules/auth/schemas";
import { smsProviderFieldLimits } from "@/modules/communications/limits";
import { smsProviderInfo, smsProviderInputSchema } from "@/modules/communications/sms-providers";
import type { PublicSmsProviderConfig } from "@/modules/communications/sms-config";
import type { SmsAccountInspection } from "@/modules/communications/sms-account";
import type { SmsPattern } from "@/modules/communications/sms-pattern-schemas";
import { requestSmsAccountInspection } from "./sms-account-client";
import { SmsAccountSummary } from "./sms-account-summary";
import { BpButton, BpInput, BpKicker, BpSelect, BpSpinner } from "./ui";

type Inspection = { status: "idle" } | { status: "loading" } | { status: "error"; message: string } | { status: "ready"; inspection: SmsAccountInspection };
type FieldErrors = Partial<Record<"apiKey" | "senderNumber" | "otpPatternCode" | "otpCodeVariable" | "otpNameVariable", string>>;

const info = smsProviderInfo("FARAZ_SMS");

// With a single usable line there is nothing to choose, so it is picked for the admin.
function defaultLine(inspection: SmsAccountInspection, current: string) {
  return current || (inspection.lines?.length === 1 ? inspection.lines[0].number : "");
}

// Best-effort mapping of a pattern's variables onto "the code" and "the store name", so the two
// selects are usually right without the admin touching them.
function guessVariables(pattern: SmsPattern | undefined) {
  const names = pattern?.vars.map((variable) => variable.var) ?? [];
  if (names.length === 1) return { code: names[0], name: "" };
  return { code: names.find((name) => /otp|code|pin|کد/i.test(name)) ?? "", name: names.find((name) => /name|store|shop|brand|نام/i.test(name)) ?? "" };
}

function patternLabel(pattern: SmsPattern) {
  const text = pattern.text.length > 40 ? `${pattern.text.slice(0, 40)}…` : pattern.text;
  return `${text} (${pattern.code})`;
}

/**
 * Faraz SMS connection form. Instead of asking for a line number, a pattern code and its variable
 * names to be typed by hand, it verifies the API key against Faraz and offers the account's own
 * lines and patterns as choices. Everything still works typed by hand if a lookup fails.
 */
export function BlueprintFarazProviderForm({ existing, storeName, onSaved }: { existing: PublicSmsProviderConfig | null; storeName: string; onSaved?: () => void }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [apiKey, setApiKey] = useState("");
  const [senderNumber, setSenderNumber] = useState(existing?.senderNumber ?? "");
  const [patternCode, setPatternCode] = useState(existing?.otp?.patternCode ?? "");
  const [codeVariable, setCodeVariable] = useState(existing?.otp?.codeVariable ?? "");
  const [nameVariable, setNameVariable] = useState(existing?.otp?.nameVariable ?? "");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  // An existing config already has a saved key, so the account is loaded straight away.
  const [inspection, setInspection] = useState<Inspection>(existing ? { status: "loading" } : { status: "idle" });

  const hasExisting = Boolean(existing);
  useEffect(() => {
    if (!hasExisting) return;
    let cancelled = false;
    requestSmsAccountInspection()
      .then((result) => { if (cancelled) return; setInspection({ status: "ready", inspection: result }); setSenderNumber((current) => defaultLine(result, current)); })
      .catch((error) => { if (!cancelled) setInspection({ status: "error", message: error instanceof Error ? error.message : "خطای ناشناخته" }); });
    return () => { cancelled = true; };
  }, [hasExisting]);

  function verify() {
    setInspection({ status: "loading" });
    setErrors((current) => ({ ...current, apiKey: undefined }));
    requestSmsAccountInspection(apiKey.trim())
      .then((result) => { setInspection({ status: "ready", inspection: result }); setSenderNumber((current) => defaultLine(result, current)); })
      .catch((error) => setInspection({ status: "error", message: error instanceof Error ? error.message : "خطای ناشناخته" }));
  }

  const ready = inspection.status === "ready" ? inspection.inspection : null;
  const lines = ready?.lines ?? null;
  const patterns = ready?.patterns ?? null;
  const selectedPattern = patterns?.find((pattern) => pattern.code === patternCode);
  const variableOptions = useMemo(() => (selectedPattern?.vars ?? []).map((variable) => ({ value: variable.var, label: variable.var })), [selectedPattern]);

  const lineOptions = useMemo(() => {
    if (!lines?.length) return [];
    const options = lines.map((line) => ({ value: line.number, label: [line.number, line.title, line.isDedicated ? "اختصاصی" : null].filter(Boolean).join(" — ") }));
    return senderNumber && !lines.some((line) => line.number === senderNumber) ? [{ value: senderNumber, label: `${senderNumber} — ذخیره‌شده، در فهرست خطوط حساب نیست` }, ...options] : options;
  }, [lines, senderNumber]);

  // A variable value longer than the length declared for it on Faraz's side makes Faraz silently
  // hold the message for human approval — the login code then arrives minutes late.
  const lengthWarnings = useMemo(() => {
    if (!selectedPattern) return [];
    const warnings: string[] = [];
    const nameDefinition = selectedPattern.vars.find((variable) => variable.var === nameVariable);
    if (nameDefinition && nameDefinition.length > 0 && storeName.length > nameDefinition.length) warnings.push(`نام فروشگاه (${storeName.length.toLocaleString("fa-IR")} نویسه) از طول تعریف‌شده برای متغیر «${nameDefinition.var}» (${nameDefinition.length.toLocaleString("fa-IR")}) بلندتر است؛ فراز چنین کدی را برای تأیید اپراتور نگه می‌دارد. طول متغیر را در پترن افزایش دهید.`);
    const codeDefinition = selectedPattern.vars.find((variable) => variable.var === codeVariable);
    if (codeDefinition && codeDefinition.length > 0 && codeDefinition.length < authFieldLimits.otpCode) warnings.push(`کد تأیید ${authFieldLimits.otpCode.toLocaleString("fa-IR")} رقمی است، اما طول متغیر «${codeDefinition.var}» ${codeDefinition.length.toLocaleString("fa-IR")} تعریف شده؛ فراز چنین کدی را برای تأیید اپراتور نگه می‌دارد.`);
    return warnings;
  }, [selectedPattern, nameVariable, codeVariable, storeName]);

  function changePattern(code: string) {
    setPatternCode(code);
    const guess = guessVariables(patterns?.find((pattern) => pattern.code === code));
    setCodeVariable(guess.code);
    setNameVariable(guess.name);
    setErrors((current) => ({ ...current, otpPatternCode: undefined, otpCodeVariable: undefined }));
  }

  function showErrors(next: FieldErrors) {
    setErrors(next);
    // The first invalid control gets focus once React has rendered its `aria-invalid`.
    requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = { provider: "FARAZ_SMS" as const, apiKey: apiKey.trim() || undefined, senderNumber, otpPatternCode: patternCode, otpCodeVariable: codeVariable, otpNameVariable: nameVariable || undefined };
    const parsed = smsProviderInputSchema.safeParse(body);
    const next: FieldErrors = {};
    if (!parsed.success) for (const issue of parsed.error.issues) { const field = issue.path[0] as keyof FieldErrors; if (!next[field]) next[field] = field === "otpPatternCode" || field === "otpCodeVariable" ? "این مورد الزامی است." : issue.message; }
    if (!existing && !apiKey.trim()) next.apiKey = "API Key را وارد کنید.";
    if (Object.keys(next).length) { showErrors(next); return; }
    setSaving(true);
    try {
      const response = await fetch("/api/admin/sms/providers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        const serverErrors: FieldErrors = {};
        for (const [field, messages] of Object.entries((result?.issues ?? {}) as Record<string, string[]>)) if (messages?.[0]) serverErrors[field as keyof FieldErrors] = messages[0];
        if (Object.keys(serverErrors).length) showErrors(serverErrors);
        throw new Error(result?.message ?? "پیکربندی ذخیره نشد.");
      }
      toast.success(`${info.name} ذخیره شد`);
      if (onSaved) { onSaved(); return; }
      router.push("/admin/settings/notifications/providers");
      router.refresh();
    } catch (error) {
      toast.danger("ذخیره انجام نشد", { description: error instanceof Error ? error.message : "خطای ناشناخته" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form ref={formRef} onSubmit={submit} noValidate className="grid items-start gap-2 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
      <section className="bp-frame relative p-[16px]">
        <div className="flex items-center gap-3">
          <span className="grid size-11 shrink-0 place-items-center border border-[var(--bp-accent)] bg-[var(--bp-accent-100)] text-[var(--bp-accent)]"><ShieldCheck size={19} /></span>
          <BpKicker>فعال‌سازی {info.name}</BpKicker>
        </div>
        <ol className="m-0 mt-3 grid list-none gap-2 p-0">
          {info.steps.map((step, index) => (
            <li key={step} className="flex items-start gap-2.5 border border-[var(--bp-divider)] bg-[var(--bp-bg)] p-3 text-[12px] leading-6">
              <span className="grid size-6 shrink-0 place-items-center border border-[var(--bp-accent)] text-[11px] font-bold text-[var(--bp-accent)]">{(index + 1).toLocaleString("fa-IR")}</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
        <a href={info.docsUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 text-[12px] font-bold text-[var(--bp-accent)]">راهنمای رسمی<ExternalLink size={14} /></a>
      </section>

      <div className="grid gap-2">
        <section className="bp-frame relative p-[16px]">
          <BpKicker>۱. اتصال به حساب</BpKicker>
          <p className="bp-muted m-0 mt-1 text-[12px]">کلید رمزنگاری می‌شود و بعداً کامل نمایش داده نخواهد شد.</p>
          <div className="mt-3 grid gap-3">
            <BpInput label="API Key" secret required={!existing} maxLength={smsProviderFieldLimits.apiKey} value={apiKey} onChange={(event) => { setApiKey(event.target.value); setErrors((current) => ({ ...current, apiKey: undefined })); }} error={errors.apiKey} hint={existing ? `کلید ذخیره‌شده (${existing.credentialMasked}) حفظ می‌شود؛ فقط برای تغییر، کلید تازه را وارد کنید.` : "کلید را از بخش وب‌سرویس پنل فراز کپی کنید."} dir="ltr" autoComplete="off" />
            <BpButton type="button" variant="secondary" isPending={inspection.status === "loading"} disabled={!existing && !apiKey.trim()} onClick={verify} className="gap-2"><PlugZap size={15} />تست اتصال و دریافت اطلاعات حساب</BpButton>
            {inspection.status === "loading" && <div className="bp-muted flex items-center gap-2 text-[12px]"><BpSpinner size={14} />در حال دریافت اطلاعات از فراز اس‌ام‌اس…</div>}
            {inspection.status === "error" && (
              <div className="flex items-start gap-2.5 border border-[var(--bp-danger)] p-3 text-[12px] leading-6 text-[var(--bp-danger)]">
                <AlertTriangle size={15} className="mt-1 shrink-0" />
                <span>{inspection.message}</span>
              </div>
            )}
            {ready && <SmsAccountSummary inspection={ready} />}
          </div>
        </section>

        <section className="bp-frame relative p-[16px]">
          <BpKicker>۲. سرشماره ارسال</BpKicker>
          <div className="mt-3">
            {lineOptions.length > 0 ? (
              <BpSelect label="سرشماره" required placeholder="انتخاب سرشماره…" hint="خطوطی که حساب شما اجازه ارسال با آن‌ها را دارد" value={senderNumber} onChange={(event) => { setSenderNumber(event.target.value); setErrors((current) => ({ ...current, senderNumber: undefined })); }} error={errors.senderNumber} options={lineOptions} />
            ) : (
              <BpInput label="سرشماره" required dir="ltr" inputMode="numeric" maxLength={smsProviderFieldLimits.senderNumber} value={senderNumber} onChange={(event) => { setSenderNumber(normalizeNumericValue(event.target.value, false)); setErrors((current) => ({ ...current, senderNumber: undefined })); }} error={errors.senderNumber} hint={ready ? "فراز خطی برای این حساب برنگرداند؛ سرشماره را دستی وارد کنید." : "با «تست اتصال» فهرست خطوط حساب بارگذاری می‌شود."} placeholder="90008361" />
            )}
          </div>
        </section>

        <section className="bp-frame relative p-[16px]">
          <BpKicker>۳. پترن کد تأیید (OTP)</BpKicker>
          <p className="bp-muted m-0 mt-1 text-[12px]">کد ورود و ثبت‌نام مشتریان با این پترن ارسال می‌شود.</p>
          <div className="mt-3 grid gap-3">
            {patterns && patterns.length > 0 ? (
              <>
                <BpSelect label="پترن" required placeholder="انتخاب پترن…" hint="پترن‌های حساب فراز شما" value={patternCode} onChange={(event) => changePattern(event.target.value)} error={errors.otpPatternCode} options={[...(patternCode && !selectedPattern ? [{ value: patternCode, label: `${patternCode} — ذخیره‌شده، در حساب پیدا نشد` }] : []), ...patterns.map((pattern) => ({ value: pattern.code, label: patternLabel(pattern) }))]} />
                {variableOptions.length > 0 ? (
                  <>
                    <BpSelect label="متغیر کد تأیید" required placeholder="انتخاب کنید" value={codeVariable} onChange={(event) => { setCodeVariable(event.target.value); setErrors((current) => ({ ...current, otpCodeVariable: undefined })); }} error={errors.otpCodeVariable} options={variableOptions} />
                    <BpSelect label="متغیر نام فروشگاه" placeholder="هیچ‌کدام" hint="اختیاری؛ اگر پترن جای نام فروشگاه هم دارد" value={nameVariable} onChange={(event) => setNameVariable(event.target.value)} options={variableOptions} />
                  </>
                ) : null}
              </>
            ) : (
              <>
                <BpInput label="کد پترن" required dir="ltr" maxLength={smsProviderFieldLimits.otpPatternCode} value={patternCode} onChange={(event) => { setPatternCode(event.target.value); setErrors((current) => ({ ...current, otpPatternCode: undefined })); }} error={errors.otpPatternCode} hint={patterns ? "در این حساب پترنی نیست؛ ابتدا از بخش پترن‌های پیامک بسازید." : "با «تست اتصال» پترن‌های حساب بارگذاری می‌شوند."} placeholder="SJ3FgPrE0C" />
                <BpInput label="نام متغیر کد تأیید" required dir="ltr" maxLength={smsProviderFieldLimits.otpVariableName} value={codeVariable} onChange={(event) => { setCodeVariable(event.target.value); setErrors((current) => ({ ...current, otpCodeVariable: undefined })); }} error={errors.otpCodeVariable} hint="همان نامی که هنگام ساخت پترن برای این متغیر گذاشتید" placeholder="otp" />
                <BpInput label="نام متغیر نام فروشگاه" dir="ltr" maxLength={smsProviderFieldLimits.otpVariableName} value={nameVariable} onChange={(event) => setNameVariable(event.target.value)} hint="اختیاری؛ اگر پترن جای نام فروشگاه هم دارد" placeholder="name" />
              </>
            )}
            {lengthWarnings.map((warning) => (
              <div key={warning} className="flex items-start gap-2 border border-[var(--bp-warning)] bg-[var(--bp-warning-bg)] p-2.5 text-[12px] leading-6 text-[var(--bp-warning)]">
                <AlertTriangle size={14} className="mt-1 shrink-0" />
                <span>{warning}</span>
              </div>
            ))}
            <Link href="/admin/settings/notifications/patterns" className="text-[12px] font-bold text-[var(--bp-accent)]">مدیریت پترن‌های پیامک ←</Link>
          </div>
        </section>

        <BpButton type="submit" variant="primary" fullWidth isPending={saving}>ذخیره پیکربندی</BpButton>
      </div>
    </form>
  );
}
