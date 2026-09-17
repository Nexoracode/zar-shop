"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Button, toast } from "@heroui/react";
import type { UserRole } from "@generated/prisma/enums";
import { InlineAlert } from "@/components/inline-alert";
import { LoadingLabel } from "@/components/loading-label";
import { OtpCodeInput } from "@/components/otp-code-input";
import { OtpResendCountdown } from "@/components/otp-resend-countdown";
import { PasswordField } from "@/components/password-input";
import { phoneSchema } from "@/modules/auth/schemas";
import { authFieldLimits } from "@/modules/auth/schemas";
import { TextField } from "@/components/form-field";
import { isAdminRole } from "@/modules/auth/permissions";

type Step = "phone" | "password" | "login-otp" | "register-otp";
type OtpPurpose = "LOGIN" | "REGISTER";
type FieldName = "phone" | "password" | "code";

// HeroUI's own Button base CSS sets text-sm/font-medium directly on `.button` (in the
// "components" layer, imported by @heroui/styles) — a plain `text-xs`/`font-bold` utility
// class ties with it on specificity and loses the cascade unpredictably, so button typography
// overrides need `!` to reliably win (same pattern already used in admin-save-button.tsx).
const submitClass = "min-h-12 px-6 inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--brand-primary)] text-[var(--brand-primary-foreground)] border border-[var(--brand-primary)] !text-sm !font-medium transition hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed";
const secondaryActionClass = "min-h-11 gap-1 rounded-lg !text-xs !font-bold text-[var(--brand-accent)] hover:bg-[var(--brand-accent)]/8";
const switchLinkClass = "min-h-9 min-w-0 gap-0.5 rounded-lg px-2 !text-xs !font-bold text-[var(--brand-accent)] hover:bg-[var(--brand-accent)]/8";

function StepHeader({ title, subtitle, size = "md" }: { title: string; subtitle?: ReactNode; size?: "lg" | "md" }) {
  return (
    <div className="grid gap-1.5">
      <h2 className={`m-0 font-bold text-[#1f1f1f] ${size === "lg" ? "text-xl" : "text-base"}`}>{title}</h2>
      {subtitle && <p className="m-0 text-xs leading-6 text-[#848484]">{subtitle}</p>}
    </div>
  );
}

type ApiResult = { message?: string; exists?: boolean; hasPassword?: boolean; issues?: Record<string, string[]>; user?: { role: UserRole } } | null;

async function postJson(url: string, body: unknown) {
  const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const result: ApiResult = await response.json().catch(() => null);
  return { ok: response.ok, status: response.status, result };
}

// Staff signing in from the customer-facing form (rather than /admin/login) still land in the
// admin panel instead of their storefront profile — the same account works from either page.
function postLoginDestination(role: UserRole | undefined) {
  return role && isAdminRole(role) ? "/admin" : "/account";
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
  const searchParams = useSearchParams();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  // Only ever set once, from a ?ref= link — there is no field left for the visitor to type
  // one into themselves.
  const [referralCode] = useState(() => (searchParams.get("ref") ?? "").trim().toUpperCase());
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [loading, setLoading] = useState(false);
  const [altLoading, setAltLoading] = useState(false);
  const [otp, setOtp] = useState("");
  const [resendKey, setResendKey] = useState(0);
  // Only meaningful once /api/auth/phone/check has answered for an existing account — lets the
  // OTP-login step hide the "ورود با رمز عبور" fallback for an account that has none to try.
  const [hasPassword, setHasPassword] = useState(true);

  function clearFieldError(field: FieldName) {
    setFieldErrors((current) => (current[field] ? { ...current, [field]: undefined } : current));
  }

  function applyIssues(issues: Record<string, string[]> | undefined) {
    if (!issues) return;
    const next: Partial<Record<FieldName, string>> = {};
    for (const [key, messages] of Object.entries(issues)) if (messages?.[0]) next[key as FieldName] = messages[0];
    setFieldErrors(next);
  }


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
    if (result?.exists) {
      setHasPassword(Boolean(result.hasPassword));
      if (result.hasPassword) { setStep("password"); return; }
      // No password on this account (registered through the no-password flow) — a password
      // field would have nothing to check against, so go straight to the OTP-login codepath.
      setLoading(true);
      const otpResult = await postJson("/api/auth/otp/request", { phone: parsed.data, purpose: "LOGIN" });
      setLoading(false);
      if (!otpResult.ok) { reportFailure(setError, otpResult.status, otpResult.result?.message, "ارسال کد یکبار مصرف انجام نشد."); return; }
      goToOtpStep("login-otp");
      return;
    }
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
    // A full browser navigation (not router.push) so the freshly-set session cookie is always
    // picked up on the very next request — client-side transitions can otherwise reuse an
    // already-fetched (pre-login) router cache entry for the destination route.
    window.location.assign(postLoginDestination(result?.user?.role));
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
    window.location.assign(postLoginDestination(result?.user?.role));
  }

  async function submitRegisterOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setFieldErrors({});
    setLoading(true);
    const { ok, result } = await postJson("/api/auth/otp/verify", { phone, purpose: "REGISTER", code: otp });
    if (!ok) { setLoading(false); setFieldErrors({ code: result?.message ?? "کد وارد شده نادرست است." }); return; }
    // No password, no name, no separate step — the verified code is the whole registration.
    // A referral code only ever gets here pre-filled from the ?ref= link (there is no field
    // left to type one into), so an invalid/expired one is silently dropped and retried
    // instead of blocking someone who never typed it themselves.
    const code = referralCode.trim() || undefined;
    let complete = await postJson("/api/auth/register/complete", { phone, referralCode: code });
    if (!complete.ok && code && complete.result?.issues?.referralCode) {
      complete = await postJson("/api/auth/register/complete", { phone });
    }
    setLoading(false);
    if (!complete.ok) { setOtp(""); setError(complete.result?.message ?? "ثبت‌نام انجام نشد."); return; }
    toast.success("حساب کاربری ساخته شد", { description: "خوش آمدید!", timeout: 4000 });
    window.location.assign("/");
  }

  if (step === "phone") {
    return (
      <form className="grid gap-5" onSubmit={submitPhone} noValidate>
        <StepHeader title="ورود یا ثبت‌نام" subtitle="لطفاً شماره موبایل خود را وارد کنید" size="lg" />
        <TextField tone="auth" label="شماره موبایل" error={fieldErrors.phone} id="phone" name="phone" inputMode="tel" dir="ltr" maxLength={authFieldLimits.phone} placeholder="09123456789" onChange={() => clearFieldError("phone")} autoFocus />
        {error && <InlineAlert status="danger">{error}</InlineAlert>}
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
        <PasswordField tone="auth" label="رمز عبور" error={fieldErrors.password} id="password" name="password" maxLength={authFieldLimits.password} onChange={() => clearFieldError("password")} autoFocus />
        <div className="grid gap-1 justify-items-start">
          <Button type="button" variant="ghost" isPending={altLoading} isDisabled={loading} onPress={requestLoginOtp} className={`${secondaryActionClass} px-2`}>
            {({ isPending }) => <LoadingLabel isPending={isPending}>ورود با کد یکبار مصرف<ChevronLeft size={15} /></LoadingLabel>}
          </Button>
          <Link href="/forgot-password" className={`${secondaryActionClass} inline-flex items-center px-2`}>فراموشی رمز عبور<ChevronLeft size={15} /></Link>
        </div>
        {error && <InlineAlert status="danger">{error}</InlineAlert>}
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
        {step === "login-otp" && hasPassword && <Button type="button" variant="ghost" onPress={() => setStep("password")} className={`${switchLinkClass} justify-self-start`}>ورود با رمز عبور<ChevronLeft size={15} /></Button>}
        <div className="grid gap-2">
          <OtpCodeInput value={otp} onChange={(value) => { setOtp(value); clearFieldError("code"); }} isDisabled={loading} />
          {fieldErrors.code && <p role="alert" className="m-0 text-center text-[11px] font-normal text-[var(--danger)]">{fieldErrors.code}</p>}
        </div>
        {error && <InlineAlert status="danger">{error}</InlineAlert>}
        <Button type="submit" variant="primary" fullWidth className={submitClass} isPending={loading} isDisabled={otp.length !== 6}>
          {({ isPending }) => <LoadingLabel isPending={isPending}>تأیید کد</LoadingLabel>}
        </Button>
        <OtpResendCountdown key={resendKey} onResend={() => resendOtp(purpose)} isResending={altLoading} />
        <Button type="button" variant="ghost" onPress={backToPhone} className={`${switchLinkClass} justify-self-center`}>تغییر شماره موبایل</Button>
      </form>
    );
  }

  return null;
}
