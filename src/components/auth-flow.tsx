"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Alert, Button, Input, Spinner, toast } from "@heroui/react";
import { AdminCheckbox } from "@/components/admin-checkbox";
import { OtpCodeInput } from "@/components/otp-code-input";
import { OtpResendCountdown } from "@/components/otp-resend-countdown";
import { PasswordInput } from "@/components/password-input";

type Step = "phone" | "password" | "login-otp" | "register-otp" | "register-complete";
type OtpPurpose = "LOGIN" | "REGISTER";

const fieldClass = "w-full min-h-12 rounded-lg border border-[#e0dfda] bg-white px-[14px] text-sm outline-none transition focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/15";
const labelClass = "text-[#4b5160] text-[0.84rem] font-bold";
const submitClass = "min-h-12 px-6 inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--brand-primary)] text-[var(--brand-primary-foreground)] border border-[var(--brand-primary)] transition hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed";
const secondaryActionClass = "min-h-11 gap-1 rounded-lg text-[13px] font-bold text-[var(--brand-accent)] hover:bg-[var(--brand-accent)]/8";
const switchLinkClass = "min-h-9 min-w-0 gap-0.5 rounded-lg px-2 text-[13px] font-bold text-[var(--brand-accent)] hover:bg-[var(--brand-accent)]/8";

function StepHeader({ title, subtitle }: { title: string; subtitle?: ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <h2 className="m-0 text-[17px] font-bold text-[#1f1f1f]">{title}</h2>
      {subtitle && <p className="m-0 text-[13px] leading-6 text-[#848484]">{subtitle}</p>}
    </div>
  );
}

async function postJson(url: string, body: unknown) {
  const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const result = await response.json().catch(() => null);
  return { ok: response.ok, status: response.status, result: result as { message?: string; exists?: boolean } | null };
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
  const [loading, setLoading] = useState(false);
  const [altLoading, setAltLoading] = useState(false);
  const [otp, setOtp] = useState("");
  const [resendKey, setResendKey] = useState(0);
  const [smsMarketingConsent, setSmsMarketingConsent] = useState(false);

  function goToOtpStep(nextStep: "login-otp" | "register-otp") {
    setOtp("");
    setError("");
    setResendKey((value) => value + 1);
    setStep(nextStep);
  }

  function backToPhone() {
    setStep("phone");
    setOtp("");
    setError("");
  }

  async function submitPhone(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const submittedPhone = String(new FormData(event.currentTarget).get("phone") ?? "").trim();
    const { ok, status, result } = await postJson("/api/auth/phone/check", { phone: submittedPhone });
    setLoading(false);
    if (!ok) { reportFailure(setError, status, result?.message, "بررسی شماره موبایل انجام نشد."); return; }
    setPhone(submittedPhone);
    if (result?.exists) { setStep("password"); return; }
    goToOtpStep("register-otp");
  }

  async function submitPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const password = String(new FormData(event.currentTarget).get("password") ?? "");
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
    setResendKey((value) => value + 1);
    toast.success("کد جدید ارسال شد");
  }

  async function submitLoginOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const { ok, result } = await postJson("/api/auth/otp/verify", { phone, purpose: "LOGIN", code: otp });
    setLoading(false);
    if (!ok) { setError(result?.message ?? "کد وارد شده نادرست است."); return; }
    toast.success("ورود موفق بود", { description: "با موفقیت وارد حساب کاربری شدید.", timeout: 4000 });
    router.push("/account");
    router.refresh();
  }

  async function submitRegisterOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const { ok, result } = await postJson("/api/auth/otp/verify", { phone, purpose: "REGISTER", code: otp });
    setLoading(false);
    if (!ok) { setError(result?.message ?? "کد وارد شده نادرست است."); return; }
    setOtp("");
    setStep("register-complete");
  }

  async function submitRegisterComplete(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const body = {
      phone,
      firstName: String(form.get("firstName") ?? "").trim() || undefined,
      lastName: String(form.get("lastName") ?? "").trim() || undefined,
      password: String(form.get("password") ?? ""),
      smsMarketingConsent,
    };
    const { ok, result } = await postJson("/api/auth/register/complete", body);
    setLoading(false);
    if (!ok) { setError(result?.message ?? "ثبت‌نام انجام نشد."); return; }
    toast.success("حساب کاربری ساخته شد", { description: "حساب شما با موفقیت ایجاد شد.", timeout: 4000 });
    router.push("/");
    router.refresh();
  }

  if (step === "phone") {
    return (
      <form className="grid gap-5" onSubmit={submitPhone}>
        <StepHeader title="ورود یا ثبت‌نام" subtitle="لطفاً شماره موبایل خود را وارد کنید" />
        <div className="grid gap-[7px]">
          <label htmlFor="phone" className={labelClass}>شماره موبایل</label>
          <Input id="phone" name="phone" inputMode="tel" dir="ltr" placeholder="09123456789" required fullWidth variant="secondary" className={fieldClass} autoFocus />
        </div>
        {error && <Alert status="danger"><Alert.Description>{error}</Alert.Description></Alert>}
        <Button type="submit" variant="primary" fullWidth className={submitClass} isPending={loading}>
          {({ isPending }) => <>{isPending && <Spinner color="current" size="sm" />}{isPending ? "در حال بررسی..." : "ادامه"}</>}
        </Button>
      </form>
    );
  }

  if (step === "password") {
    return (
      <form className="grid gap-5" onSubmit={submitPassword}>
        <StepHeader title="رمز عبور را وارد کنید" subtitle={<>ورود با شماره <strong dir="ltr">{phone}</strong></>} />
        <div className="grid gap-[7px]">
          <label htmlFor="password" className={labelClass}>رمز عبور</label>
          <PasswordInput id="password" name="password" required fullWidth variant="secondary" className={fieldClass} autoFocus />
        </div>
        {error && <Alert status="danger"><Alert.Description>{error}</Alert.Description></Alert>}
        <Button type="submit" variant="primary" fullWidth className={submitClass} isPending={loading}>
          {({ isPending }) => <>{isPending && <Spinner color="current" size="sm" />}{isPending ? "در حال بررسی..." : "ورود"}</>}
        </Button>
        <div className="flex flex-wrap items-center gap-4 justify-self-start">
          <Button type="button" variant="ghost" isPending={altLoading} isDisabled={loading} onPress={requestLoginOtp} className={`${secondaryActionClass} px-2`}>
            {({ isPending }) => <>{isPending && <Spinner color="current" size="sm" />}{isPending ? "در حال ارسال..." : <><ChevronLeft size={15} />ورود با کد یکبار مصرف</>}</>}
          </Button>
          <Link href="/forgot-password" className={`${secondaryActionClass} inline-flex items-center px-2`}><ChevronLeft size={15} />فراموشی رمز عبور</Link>
        </div>
      </form>
    );
  }

  if (step === "login-otp" || step === "register-otp") {
    const purpose: OtpPurpose = step === "login-otp" ? "LOGIN" : "REGISTER";
    const submit = step === "login-otp" ? submitLoginOtp : submitRegisterOtp;
    return (
      <form className="grid gap-5" onSubmit={submit}>
        <StepHeader title="کد تایید را وارد کنید" subtitle={<>کد تایید برای شماره <strong dir="ltr">{phone}</strong> پیامک شد</>} />
        {step === "login-otp" && <Button type="button" variant="ghost" onPress={() => setStep("password")} className={`${switchLinkClass} justify-self-start`}><ChevronLeft size={15} />ورود با رمز عبور</Button>}
        <OtpCodeInput value={otp} onChange={setOtp} isDisabled={loading} />
        {error && <Alert status="danger"><Alert.Description>{error}</Alert.Description></Alert>}
        <Button type="submit" variant="primary" fullWidth className={submitClass} isPending={loading} isDisabled={otp.length !== 6}>
          {({ isPending }) => <>{isPending && <Spinner color="current" size="sm" />}{isPending ? "در حال بررسی..." : "تأیید کد"}</>}
        </Button>
        <OtpResendCountdown key={resendKey} onResend={() => resendOtp(purpose)} isResending={altLoading} />
        <Button type="button" variant="ghost" onPress={backToPhone} className={`${switchLinkClass} justify-self-center`}>تغییر شماره موبایل</Button>
      </form>
    );
  }

  return (
    <form className="grid gap-5" onSubmit={submitRegisterComplete}>
      <StepHeader title="تعیین رمز عبور" subtitle={<>شماره <strong dir="ltr">{phone}</strong> تأیید شد؛ برای تکمیل ثبت‌نام رمز عبور بسازید</>} />
      <div className="grid grid-cols-1 gap-[14px] sm:grid-cols-2">
        <div className="grid gap-[7px]">
          <label htmlFor="firstName" className={labelClass}>نام</label>
          <Input id="firstName" name="firstName" minLength={2} fullWidth variant="secondary" className={fieldClass} />
        </div>
        <div className="grid gap-[7px]">
          <label htmlFor="lastName" className={labelClass}>نام خانوادگی</label>
          <Input id="lastName" name="lastName" minLength={2} fullWidth variant="secondary" className={fieldClass} />
        </div>
      </div>
      <div className="grid gap-[7px]">
        <label htmlFor="password" className={labelClass}>رمز عبور</label>
        <PasswordInput id="password" name="password" minLength={8} required fullWidth variant="secondary" className={fieldClass} />
      </div>
      <AdminCheckbox isSelected={smsMarketingConsent} onChange={setSmsMarketingConsent} description="برای تخفیف‌ها و خبرهای فروشگاه؛ هر زمان قابل لغو است">مایلم پیامک‌های اطلاع‌رسانی فروشگاه را دریافت کنم</AdminCheckbox>
      {error && <Alert status="danger"><Alert.Description>{error}</Alert.Description></Alert>}
      <Button type="submit" variant="primary" fullWidth className={submitClass} isPending={loading}>
        {({ isPending }) => <>{isPending && <Spinner color="current" size="sm" />}{isPending ? "در حال ساخت حساب..." : "ساخت حساب"}</>}
      </Button>
    </form>
  );
}
