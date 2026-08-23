"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Alert, Button, Input, toast } from "@heroui/react";
import { AdminCheckbox } from "@/components/admin-checkbox";
import { LoadingLabel } from "@/components/loading-label";
import { OtpCodeInput } from "@/components/otp-code-input";
import { OtpResendCountdown } from "@/components/otp-resend-countdown";
import { PasswordInput } from "@/components/password-input";
import { newPasswordSchema, phoneSchema } from "@/modules/auth/schemas";

type Step = "phone" | "password" | "login-otp" | "register-otp" | "register-complete";
type OtpPurpose = "LOGIN" | "REGISTER";
type FieldName = "phone" | "password" | "code" | "firstName" | "lastName";

const fieldClass = "w-full min-h-12 rounded-lg border border-[#e0dfda] bg-white px-[14px] text-[13px] outline-none transition focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/15";
const invalidFieldClass = "border-[var(--danger)] focus:border-[var(--danger)] focus:ring-[var(--danger)]/15";
const labelClass = "text-xs font-normal text-[#848484]";
const submitClass = "min-h-12 px-6 inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--brand-primary)] text-[var(--brand-primary-foreground)] border border-[var(--brand-primary)] text-sm font-medium transition hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed";
const secondaryActionClass = "min-h-11 gap-1 rounded-lg text-xs font-bold text-[var(--brand-accent)] hover:bg-[var(--brand-accent)]/8";
const switchLinkClass = "min-h-9 min-w-0 gap-0.5 rounded-lg px-2 text-xs font-bold text-[var(--brand-accent)] hover:bg-[var(--brand-accent)]/8";

function StepHeader({ title, subtitle, size = "md" }: { title: string; subtitle?: ReactNode; size?: "lg" | "md" }) {
  return (
    <div className="grid gap-1.5">
      <h2 className={`m-0 font-bold text-[#1f1f1f] ${size === "lg" ? "text-xl" : "text-base"}`}>{title}</h2>
      {subtitle && <p className="m-0 text-xs leading-6 text-[#848484]">{subtitle}</p>}
    </div>
  );
}

type ApiResult = { message?: string; exists?: boolean; issues?: Record<string, string[]> } | null;

async function postJson(url: string, body: unknown) {
  const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const result: ApiResult = await response.json().catch(() => null);
  return { ok: response.ok, status: response.status, result };
}

// SMS delivery failures (503, see OtpSendFailedError) are transient infrastructure noise, not
// something wrong with what the user typed — a toast fits that better than pinning the message
// to the form with an inline Alert.
function reportFailure(setError: (value: string) => void, status: number, message: string | undefined, fallback: string) {
  if (status === 503) { toast.danger(message ?? fallback); return; }
  setError(message ?? fallback);
}

// Single Digikala-style flow used by both /login and /register: the entered phone number
// determines the branch server-side (existing account -> password/OTP login, new number ->
// OTP-verified registration), so there is no separate "mode" prop. Each step renders its own
// heading, mirroring how digikala's SSO screen replaces its title as the flow progresses.
export function AuthFlow() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [loading, setLoading] = useState(false);
  const [altLoading, setAltLoading] = useState(false);
  const [otp, setOtp] = useState("");
  const [resendKey, setResendKey] = useState(0);
  const [smsMarketingConsent, setSmsMarketingConsent] = useState(false);

  function clearFieldError(field: FieldName) {
    setFieldErrors((current) => (current[field] ? { ...current, [field]: undefined } : current));
  }

  function applyIssues(issues: Record<string, string[]> | undefined) {
    if (!issues) return;
    const next: Partial<Record<FieldName, string>> = {};
    for (const [key, messages] of Object.entries(issues)) if (messages?.[0]) next[key as FieldName] = messages[0];
    setFieldErrors(next);
  }

  const fieldError = (field: FieldName) => (
    <span role={fieldErrors[field] ? "alert" : undefined} aria-hidden={fieldErrors[field] ? undefined : true} className={`block min-h-4 text-[11px] font-normal ${fieldErrors[field] ? "text-[var(--danger)]" : "invisible"}`}>{fieldErrors[field] ?? "بدون خطا"}</span>
  );

  function goToOtpStep(nextStep: "login-otp" | "register-otp") {
    setOtp("");
    setError("");
    setFieldErrors({});
    setResendKey((value) => value + 1);
    setStep(nextStep);
  }

  function backToPhone() {
    setStep("phone");
    setOtp("");
    setError("");
    setFieldErrors({});
  }

  async function submitPhone(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const submittedPhone = String(new FormData(event.currentTarget).get("phone") ?? "").trim();
    const parsed = phoneSchema.safeParse(submittedPhone);
    if (!parsed.success) { setFieldErrors({ phone: parsed.error.issues[0]?.message }); return; }
    setFieldErrors({});
    setLoading(true);
    const { ok, status, result } = await postJson("/api/auth/phone/check", { phone: parsed.data });
    setLoading(false);
    if (!ok) { applyIssues(result?.issues); reportFailure(setError, status, result?.message, "بررسی شماره موبایل انجام نشد."); return; }
    setPhone(parsed.data);
    if (result?.exists) { setStep("password"); return; }
    goToOtpStep("register-otp");
  }

  async function submitPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const password = String(new FormData(event.currentTarget).get("password") ?? "");
    if (!password) { setFieldErrors({ password: "رمز عبور را وارد کنید." }); return; }
    setFieldErrors({});
    setLoading(true);
    const { ok, result } = await postJson("/api/auth/login", { phone, password });
    setLoading(false);
    if (!ok) { setError(result?.message ?? "ورود انجام نشد."); return; }
    toast.success("ورود موفق بود", { description: "با موفقیت وارد حساب کاربری شدید.", timeout: 4000 });
    router.push("/account");
    router.refresh();
  }

  async function requestLoginOtp() {
    setAltLoading(true);
    setError("");
    const { ok, status, result } = await postJson("/api/auth/otp/request", { phone, purpose: "LOGIN" });
    setAltLoading(false);
    if (!ok) { reportFailure(setError, status, result?.message, "ارسال کد یکبار مصرف انجام نشد."); return; }
    goToOtpStep("login-otp");
  }

  async function resendOtp(purpose: OtpPurpose) {
    setAltLoading(true);
    setError("");
    const { ok, status, result } = await postJson("/api/auth/otp/request", { phone, purpose });
    setAltLoading(false);
    if (!ok) { reportFailure(setError, status, result?.message, "ارسال دوباره کد انجام نشد."); return; }
    setOtp("");
    setFieldErrors({});
    setResendKey((value) => value + 1);
    toast.success("کد جدید ارسال شد");
  }

  async function submitLoginOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setFieldErrors({});
    setLoading(true);
    const { ok, result } = await postJson("/api/auth/otp/verify", { phone, purpose: "LOGIN", code: otp });
    setLoading(false);
    if (!ok) { setFieldErrors({ code: result?.message ?? "کد وارد شده نادرست است." }); return; }
    toast.success("ورود موفق بود", { description: "با موفقیت وارد حساب کاربری شدید.", timeout: 4000 });
    router.push("/account");
    router.refresh();
  }

  async function submitRegisterOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setFieldErrors({});
    setLoading(true);
    const { ok, result } = await postJson("/api/auth/otp/verify", { phone, purpose: "REGISTER", code: otp });
    setLoading(false);
    if (!ok) { setFieldErrors({ code: result?.message ?? "کد وارد شده نادرست است." }); return; }
    setOtp("");
    setStep("register-complete");
  }

  async function submitRegisterComplete(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    const firstName = String(form.get("firstName") ?? "").trim();
    const lastName = String(form.get("lastName") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const nextFieldErrors: Partial<Record<FieldName, string>> = {};
    if (firstName && firstName.length < 2) nextFieldErrors.firstName = "نام باید حداقل ۲ حرف باشد.";
    if (lastName && lastName.length < 2) nextFieldErrors.lastName = "نام خانوادگی باید حداقل ۲ حرف باشد.";
    const passwordCheck = newPasswordSchema.safeParse(password);
    if (!passwordCheck.success) nextFieldErrors.password = passwordCheck.error.issues[0]?.message;
    if (Object.keys(nextFieldErrors).length) { setFieldErrors(nextFieldErrors); return; }
    setFieldErrors({});
    setLoading(true);
    const body = { phone, firstName: firstName || undefined, lastName: lastName || undefined, password, smsMarketingConsent };
    const { ok, result } = await postJson("/api/auth/register/complete", body);
    setLoading(false);
    if (!ok) { applyIssues(result?.issues); setError(result?.message ?? "ثبت‌نام انجام نشد."); return; }
    toast.success("حساب کاربری ساخته شد", { description: "حساب شما با موفقیت ایجاد شد.", timeout: 4000 });
    router.push("/");
    router.refresh();
  }

  if (step === "phone") {
    return (
      <form className="grid gap-5" onSubmit={submitPhone} noValidate>
        <StepHeader title="ورود یا ثبت‌نام" subtitle="لطفاً شماره موبایل خود را وارد کنید" size="lg" />
        <label className="grid gap-[7px]" htmlFor="phone">
          <span className={labelClass}>شماره موبایل</span>
          <Input id="phone" name="phone" inputMode="tel" dir="ltr" placeholder="09123456789" onChange={() => clearFieldError("phone")} aria-invalid={Boolean(fieldErrors.phone)} fullWidth variant="secondary" className={`${fieldClass} ${fieldErrors.phone ? invalidFieldClass : ""}`} autoFocus />
          {fieldError("phone")}
        </label>
        {error && <Alert status="danger"><Alert.Description>{error}</Alert.Description></Alert>}
        <Button type="submit" variant="primary" fullWidth className={submitClass} isPending={loading}>
          {({ isPending }) => <LoadingLabel isPending={isPending}>ادامه</LoadingLabel>}
        </Button>
      </form>
    );
  }

  if (step === "password") {
    return (
      <form className="grid gap-5" onSubmit={submitPassword} noValidate>
        <StepHeader title="رمز عبور را وارد کنید" subtitle={<>ورود با شماره <strong dir="ltr">{phone}</strong></>} />
        <label className="grid gap-[7px]" htmlFor="password">
          <span className={labelClass}>رمز عبور</span>
          <PasswordInput id="password" name="password" onChange={() => clearFieldError("password")} aria-invalid={Boolean(fieldErrors.password)} fullWidth variant="secondary" className={`${fieldClass} ${fieldErrors.password ? invalidFieldClass : ""}`} autoFocus />
          {fieldError("password")}
        </label>
        <div className="grid gap-1 justify-items-start">
          <Button type="button" variant="ghost" isPending={altLoading} isDisabled={loading} onPress={requestLoginOtp} className={`${secondaryActionClass} px-2`}>
            {({ isPending }) => <LoadingLabel isPending={isPending}>ورود با کد یکبار مصرف<ChevronLeft size={15} /></LoadingLabel>}
          </Button>
          <Link href="/forgot-password" className={`${secondaryActionClass} inline-flex items-center px-2`}>فراموشی رمز عبور<ChevronLeft size={15} /></Link>
        </div>
        {error && <Alert status="danger"><Alert.Description>{error}</Alert.Description></Alert>}
        <Button type="submit" variant="primary" fullWidth className={submitClass} isPending={loading}>
          {({ isPending }) => <LoadingLabel isPending={isPending}>تایید</LoadingLabel>}
        </Button>
      </form>
    );
  }

  if (step === "login-otp" || step === "register-otp") {
    const purpose: OtpPurpose = step === "login-otp" ? "LOGIN" : "REGISTER";
    const submit = step === "login-otp" ? submitLoginOtp : submitRegisterOtp;
    return (
      <form className="grid gap-5" onSubmit={submit} noValidate>
        <StepHeader title="کد تایید را وارد کنید" subtitle={<>کد تایید برای شماره <strong dir="ltr">{phone}</strong> پیامک شد</>} />
        {step === "login-otp" && <Button type="button" variant="ghost" onPress={() => setStep("password")} className={`${switchLinkClass} justify-self-start`}>ورود با رمز عبور<ChevronLeft size={15} /></Button>}
        <div className="grid gap-2">
          <OtpCodeInput value={otp} onChange={(value) => { setOtp(value); clearFieldError("code"); }} isDisabled={loading} />
          {fieldErrors.code && <p role="alert" className="m-0 text-center text-[11px] font-normal text-[var(--danger)]">{fieldErrors.code}</p>}
        </div>
        {error && <Alert status="danger"><Alert.Description>{error}</Alert.Description></Alert>}
        <Button type="submit" variant="primary" fullWidth className={submitClass} isPending={loading} isDisabled={otp.length !== 6}>
          {({ isPending }) => <LoadingLabel isPending={isPending}>تأیید کد</LoadingLabel>}
        </Button>
        <OtpResendCountdown key={resendKey} onResend={() => resendOtp(purpose)} isResending={altLoading} />
        <Button type="button" variant="ghost" onPress={backToPhone} className={`${switchLinkClass} justify-self-center`}>تغییر شماره موبایل</Button>
      </form>
    );
  }

  return (
    <form className="grid gap-5" onSubmit={submitRegisterComplete} noValidate>
      <StepHeader title="تعیین رمز عبور" subtitle={<>شماره <strong dir="ltr">{phone}</strong> تأیید شد؛ برای تکمیل ثبت‌نام رمز عبور بسازید</>} />
      <div className="grid grid-cols-1 gap-[14px] sm:grid-cols-2">
        <label className="grid gap-[7px]" htmlFor="firstName">
          <span className={labelClass}>نام</span>
          <Input id="firstName" name="firstName" onChange={() => clearFieldError("firstName")} aria-invalid={Boolean(fieldErrors.firstName)} fullWidth variant="secondary" className={`${fieldClass} ${fieldErrors.firstName ? invalidFieldClass : ""}`} />
          {fieldError("firstName")}
        </label>
        <label className="grid gap-[7px]" htmlFor="lastName">
          <span className={labelClass}>نام خانوادگی</span>
          <Input id="lastName" name="lastName" onChange={() => clearFieldError("lastName")} aria-invalid={Boolean(fieldErrors.lastName)} fullWidth variant="secondary" className={`${fieldClass} ${fieldErrors.lastName ? invalidFieldClass : ""}`} />
          {fieldError("lastName")}
        </label>
      </div>
      <label className="grid gap-[7px]" htmlFor="password">
        <span className={labelClass}>رمز عبور</span>
        <PasswordInput id="password" name="password" onChange={() => clearFieldError("password")} aria-invalid={Boolean(fieldErrors.password)} fullWidth variant="secondary" className={`${fieldClass} ${fieldErrors.password ? invalidFieldClass : ""}`} />
        {fieldError("password")}
      </label>
      <AdminCheckbox isSelected={smsMarketingConsent} onChange={setSmsMarketingConsent} description="برای تخفیف‌ها و خبرهای فروشگاه؛ هر زمان قابل لغو است">مایلم پیامک‌های اطلاع‌رسانی فروشگاه را دریافت کنم</AdminCheckbox>
      {error && <Alert status="danger"><Alert.Description>{error}</Alert.Description></Alert>}
      <Button type="submit" variant="primary" fullWidth className={submitClass} isPending={loading}>
        {({ isPending }) => <LoadingLabel isPending={isPending}>ساخت حساب</LoadingLabel>}
      </Button>
    </form>
  );
}
