"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Input, Spinner, toast } from "@heroui/react";
import { AdminCheckbox } from "@/components/admin-checkbox";
import { OtpCodeInput } from "@/components/otp-code-input";
import { OtpResendCountdown } from "@/components/otp-resend-countdown";

type Step = "phone" | "password" | "login-otp" | "register-otp" | "register-complete";
type OtpPurpose = "LOGIN" | "REGISTER";

const fieldClass = "w-full border border-[#e7e6e2] rounded-sm bg-white px-[13px] py-3 outline-none focus:border-[var(--brand-accent)] focus:ring-2 focus:ring-[var(--brand-accent)]/20";
const labelClass = "text-[#4b5160] text-[0.84rem] font-bold";
const submitClass = "min-h-[46px] px-6 py-[9px] inline-flex items-center justify-center bg-[var(--brand-primary)] text-[var(--brand-primary-foreground)] border border-[var(--brand-primary)] rounded-sm transition-all hover:-translate-y-[2px] hover:brightness-110 hover:shadow-[0_8px_20px_rgba(20,35,61,0.12)] disabled:opacity-60 disabled:cursor-not-allowed";
const linkButtonClass = "text-[var(--brand-accent)] hover:underline";

function maskPhone(phone: string) {
  return phone.length === 11 ? `${phone.slice(0, 4)}***${phone.slice(7)}` : phone;
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
// OTP-verified registration), so there is no separate "mode" prop.
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
      <form className="grid gap-4" onSubmit={submitPhone}>
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
      <form className="grid gap-4" onSubmit={submitPassword}>
        <p className="m-0 text-sm text-[#4b5160]">ورود با شماره <strong dir="ltr">{phone}</strong> — <button type="button" onClick={backToPhone} className={linkButtonClass}>تغییر شماره</button></p>
        <div className="grid gap-[7px]">
          <label htmlFor="password" className={labelClass}>رمز عبور</label>
          <Input id="password" name="password" type="password" dir="ltr" required fullWidth variant="secondary" className={fieldClass} autoFocus />
        </div>
        {error && <Alert status="danger"><Alert.Description>{error}</Alert.Description></Alert>}
        <Button type="submit" variant="primary" fullWidth className={submitClass} isPending={loading}>
          {({ isPending }) => <>{isPending && <Spinner color="current" size="sm" />}{isPending ? "در حال بررسی..." : "ورود"}</>}
        </Button>
        <Button type="button" variant="ghost" fullWidth isPending={altLoading} isDisabled={loading} onPress={requestLoginOtp} className="min-h-10 text-xs font-bold text-[var(--brand-accent)]">
          {({ isPending }) => <>{isPending && <Spinner color="current" size="sm" />}{isPending ? "در حال ارسال..." : "ورود با کد یکبار مصرف"}</>}
        </Button>
      </form>
    );
  }

  if (step === "login-otp" || step === "register-otp") {
    const purpose: OtpPurpose = step === "login-otp" ? "LOGIN" : "REGISTER";
    const submit = step === "login-otp" ? submitLoginOtp : submitRegisterOtp;
    return (
      <form className="grid gap-4" onSubmit={submit}>
        <p className="m-0 text-sm leading-7 text-[#4b5160]">کد ۶ رقمی پیامک‌شده به شماره <strong dir="ltr">{maskPhone(phone)}</strong> را وارد کنید.</p>
        <OtpCodeInput value={otp} onChange={setOtp} isDisabled={loading} />
        {error && <Alert status="danger"><Alert.Description>{error}</Alert.Description></Alert>}
        <Button type="submit" variant="primary" fullWidth className={submitClass} isPending={loading} isDisabled={otp.length !== 6}>
          {({ isPending }) => <>{isPending && <Spinner color="current" size="sm" />}{isPending ? "در حال بررسی..." : "تأیید کد"}</>}
        </Button>
        <OtpResendCountdown key={resendKey} onResend={() => resendOtp(purpose)} isResending={altLoading} />
        <button type="button" onClick={backToPhone} className={`text-center text-xs font-bold ${linkButtonClass}`}>تغییر شماره موبایل</button>
      </form>
    );
  }

  return (
    <form className="grid gap-4" onSubmit={submitRegisterComplete}>
      <p className="m-0 text-sm text-[#4b5160]">شماره <strong dir="ltr">{phone}</strong> تأیید شد؛ برای تکمیل ثبت‌نام رمز عبور بسازید.</p>
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
      <AdminCheckbox isSelected={smsMarketingConsent} onChange={setSmsMarketingConsent} description="برای تخفیف‌ها و خبرهای فروشگاه؛ هر زمان قابل لغو است">مایلم پیامک‌های اطلاع‌رسانی فروشگاه را دریافت کنم</AdminCheckbox>
      <div className="grid gap-[7px]">
        <label htmlFor="password" className={labelClass}>رمز عبور</label>
        <Input id="password" name="password" type="password" dir="ltr" minLength={8} required fullWidth variant="secondary" className={fieldClass} />
      </div>
      {error && <Alert status="danger"><Alert.Description>{error}</Alert.Description></Alert>}
      <Button type="submit" variant="primary" fullWidth className={submitClass} isPending={loading}>
        {({ isPending }) => <>{isPending && <Spinner color="current" size="sm" />}{isPending ? "در حال ساخت حساب..." : "ساخت حساب"}</>}
      </Button>
    </form>
  );
}
