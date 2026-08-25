"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, toast } from "@heroui/react";
import { LoadingLabel } from "@/components/loading-label";
import { OtpCodeInput } from "@/components/otp-code-input";
import { OtpResendCountdown } from "@/components/otp-resend-countdown";
import { PasswordField } from "@/components/password-input";
import { newPasswordSchema, phoneSchema } from "@/modules/auth/schemas";
import { authFieldLimits } from "@/modules/auth/schemas";
import { TextField } from "@/components/form-field";

type FieldName = "phone" | "code" | "password" | "confirmPassword";

const submitClass = "min-h-12 px-6 inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--brand-primary)] text-[var(--brand-primary-foreground)] border border-[var(--brand-primary)] !text-sm !font-medium transition hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed";
const switchLinkClass = "min-h-9 min-w-0 gap-0.5 rounded-lg px-2 !text-xs !font-bold text-[var(--brand-accent)] hover:bg-[var(--brand-accent)]/8";

function StepHeader({ title, subtitle }: { title: string; subtitle: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <h2 className="m-0 text-base font-bold text-[#1f1f1f]">{title}</h2>
      <p className="m-0 text-xs leading-6 text-[#848484]">{subtitle}</p>
    </div>
  );
}

async function postJson(url: string, body: unknown) {
  const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const result = await response.json().catch(() => null);
  return { ok: response.ok, result: result as { message?: string } | null };
}

export function ForgotPasswordForm() {
  const router = useRouter();
  const [step, setStep] = useState<"request" | "verify">("request");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [resendKey, setResendKey] = useState(0);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [loading, setLoading] = useState(false);
  const [altLoading, setAltLoading] = useState(false);

  function clearFieldError(field: FieldName) {
    setFieldErrors((current) => (current[field] ? { ...current, [field]: undefined } : current));
  }


  async function requestCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const submittedPhone = String(new FormData(event.currentTarget).get("phone") ?? "").trim();
    const parsed = phoneSchema.safeParse(submittedPhone);
    if (!parsed.success) { setFieldErrors({ phone: parsed.error.issues[0]?.message }); return; }
    setFieldErrors({});
    setLoading(true);
    const { ok, result } = await postJson("/api/auth/forgot-password", { phone: parsed.data });
    setLoading(false);
    if (!ok) { setError(result?.message ?? "ارسال کد بازیابی انجام نشد."); return; }
    setPhone(parsed.data);
    setOtp("");
    setResendKey((value) => value + 1);
    setStep("verify");
    toast.success("کد بازیابی ارسال شد", { description: result?.message, timeout: 6000 });
  }

  async function resendCode() {
    setAltLoading(true);
    setError("");
    const { ok, result } = await postJson("/api/auth/forgot-password", { phone });
    setAltLoading(false);
    if (!ok) { setError(result?.message ?? "ارسال دوباره کد انجام نشد."); return; }
    setOtp("");
    setFieldErrors({});
    setResendKey((value) => value + 1);
    toast.success("کد جدید ارسال شد");
  }

  async function resetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirmPassword = String(form.get("confirmPassword") ?? "");
    const nextFieldErrors: Partial<Record<FieldName, string>> = {};
    const passwordCheck = newPasswordSchema.safeParse(password);
    if (!passwordCheck.success) nextFieldErrors.password = passwordCheck.error.issues[0]?.message;
    else if (confirmPassword !== password) nextFieldErrors.confirmPassword = "رمز عبور جدید و تکرار آن یکسان نیستند.";
    if (Object.keys(nextFieldErrors).length) { setFieldErrors(nextFieldErrors); return; }
    setFieldErrors({});
    setLoading(true);
    const { ok, result } = await postJson("/api/auth/reset-password", { phone, code: otp, password });
    setLoading(false);
    if (!ok) { setFieldErrors({ code: result?.message ?? "بازیابی رمز عبور انجام نشد." }); return; }
    toast.success("رمز عبور تغییر کرد", { description: "با موفقیت وارد حساب کاربری شدید.", timeout: 4000 });
    router.push("/account");
    router.refresh();
  }

  if (step === "request") {
    return (
      <form className="grid gap-5" onSubmit={requestCode} noValidate>
        <StepHeader title="بازیابی رمز عبور" subtitle="شماره موبایل حساب خود را وارد کنید تا کد بازیابی برایتان پیامک شود" />
        <TextField tone="auth" label="شماره موبایل" error={fieldErrors.phone} id="phone" name="phone" inputMode="tel" dir="ltr" maxLength={authFieldLimits.phone} placeholder="09123456789" onChange={() => clearFieldError("phone")} autoFocus />
        {error && <Alert status="danger"><Alert.Description>{error}</Alert.Description></Alert>}
        <Button type="submit" variant="primary" fullWidth className={submitClass} isPending={loading}>
          {({ isPending }) => <LoadingLabel isPending={isPending}>ارسال کد بازیابی</LoadingLabel>}
        </Button>
      </form>
    );
  }

  return (
    <form className="grid gap-5" onSubmit={resetPassword} noValidate>
      <StepHeader title="کد تایید را وارد کنید" subtitle={<>کد تایید برای شماره <strong dir="ltr">{phone}</strong> پیامک شد</>} />
      <div className="grid gap-2">
        <OtpCodeInput value={otp} onChange={(value) => { setOtp(value); clearFieldError("code"); }} isDisabled={loading} />
        {fieldErrors.code && <p role="alert" className="m-0 text-center text-[11px] font-normal text-[var(--danger)]">{fieldErrors.code}</p>}
      </div>
      <PasswordField tone="auth" label="رمز عبور جدید" error={fieldErrors.password} id="password" name="password" maxLength={authFieldLimits.password} onChange={() => clearFieldError("password")} />
      <PasswordField tone="auth" label="تکرار رمز عبور جدید" error={fieldErrors.confirmPassword} id="confirmPassword" name="confirmPassword" maxLength={authFieldLimits.password} onChange={() => clearFieldError("confirmPassword")} />
      {error && <Alert status="danger"><Alert.Description>{error}</Alert.Description></Alert>}
      <Button type="submit" variant="primary" fullWidth className={submitClass} isPending={loading} isDisabled={otp.length !== 6}>
        {({ isPending }) => <LoadingLabel isPending={isPending}>تغییر رمز عبور</LoadingLabel>}
      </Button>
      <OtpResendCountdown key={resendKey} onResend={resendCode} isResending={altLoading} />
      <Button type="button" variant="ghost" isDisabled={loading} onPress={() => { setStep("request"); setOtp(""); setError(""); setFieldErrors({}); }} className={`${switchLinkClass} justify-self-center`}>
        تغییر شماره موبایل
      </Button>
    </form>
  );
}
