"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Input, Spinner, toast } from "@heroui/react";
import { OtpCodeInput } from "@/components/otp-code-input";
import { OtpResendCountdown } from "@/components/otp-resend-countdown";
import { PasswordInput } from "@/components/password-input";

const fieldClass = "w-full min-h-12 rounded-lg border border-[#e0dfda] bg-white px-[14px] text-sm outline-none transition focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/15";
const labelClass = "text-[#4b5160] text-[0.84rem] font-bold";
const submitClass = "min-h-12 px-6 inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--brand-primary)] text-[var(--brand-primary-foreground)] border border-[var(--brand-primary)] transition hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed";
const switchLinkClass = "min-h-9 min-w-0 gap-0.5 rounded-lg px-2 text-[13px] font-bold text-[var(--brand-accent)] hover:bg-[var(--brand-accent)]/8";

function StepHeader({ title, subtitle }: { title: string; subtitle: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <h2 className="m-0 text-[17px] font-bold text-[#1f1f1f]">{title}</h2>
      <p className="m-0 text-[13px] leading-6 text-[#848484]">{subtitle}</p>
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
  const [loading, setLoading] = useState(false);
  const [altLoading, setAltLoading] = useState(false);

  async function requestCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const submittedPhone = String(new FormData(event.currentTarget).get("phone") ?? "").trim();
    const { ok, result } = await postJson("/api/auth/forgot-password", { phone: submittedPhone });
    setLoading(false);
    if (!ok) { setError(result?.message ?? "ارسال کد بازیابی انجام نشد."); return; }
    setPhone(submittedPhone);
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
    setResendKey((value) => value + 1);
    toast.success("کد جدید ارسال شد");
  }

  async function resetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirmPassword = String(form.get("confirmPassword") ?? "");
    if (password !== confirmPassword) { setError("رمز عبور جدید و تکرار آن یکسان نیستند."); return; }
    setLoading(true);
    const { ok, result } = await postJson("/api/auth/reset-password", { phone, code: otp, password });
    setLoading(false);
    if (!ok) { setError(result?.message ?? "بازیابی رمز عبور انجام نشد."); return; }
    toast.success("رمز عبور تغییر کرد", { description: "با موفقیت وارد حساب کاربری شدید.", timeout: 4000 });
    router.push("/account");
    router.refresh();
  }

  if (step === "request") {
    return (
      <form className="grid gap-5" onSubmit={requestCode}>
        <StepHeader title="بازیابی رمز عبور" subtitle="شماره موبایل حساب خود را وارد کنید تا کد بازیابی برایتان پیامک شود" />
        <div className="grid gap-[7px]">
          <label htmlFor="phone" className={labelClass}>شماره موبایل</label>
          <Input id="phone" name="phone" inputMode="tel" dir="ltr" placeholder="09123456789" required fullWidth variant="secondary" className={fieldClass} autoFocus />
        </div>
        {error && <Alert status="danger"><Alert.Description>{error}</Alert.Description></Alert>}
        <Button type="submit" variant="primary" fullWidth className={submitClass} isPending={loading}>
          {({ isPending }) => <>{isPending && <Spinner color="current" size="sm" />}{isPending ? "در حال ارسال..." : "ارسال کد بازیابی"}</>}
        </Button>
      </form>
    );
  }

  return (
    <form className="grid gap-5" onSubmit={resetPassword}>
      <StepHeader title="کد تایید را وارد کنید" subtitle={<>کد تایید برای شماره <strong dir="ltr">{phone}</strong> پیامک شد</>} />
      <OtpCodeInput value={otp} onChange={setOtp} isDisabled={loading} />
      <div className="grid gap-[7px]">
        <label htmlFor="password" className={labelClass}>رمز عبور جدید</label>
        <PasswordInput id="password" name="password" minLength={8} required fullWidth variant="secondary" className={fieldClass} />
      </div>
      <div className="grid gap-[7px]">
        <label htmlFor="confirmPassword" className={labelClass}>تکرار رمز عبور جدید</label>
        <PasswordInput id="confirmPassword" name="confirmPassword" minLength={8} required fullWidth variant="secondary" className={fieldClass} />
      </div>
      {error && <Alert status="danger"><Alert.Description>{error}</Alert.Description></Alert>}
      <Button type="submit" variant="primary" fullWidth className={submitClass} isPending={loading} isDisabled={otp.length !== 6}>
        {({ isPending }) => <>{isPending && <Spinner color="current" size="sm" />}{isPending ? "در حال بررسی..." : "تغییر رمز عبور"}</>}
      </Button>
      <OtpResendCountdown key={resendKey} onResend={resendCode} isResending={altLoading} />
      <Button type="button" variant="ghost" isDisabled={loading} onPress={() => { setStep("request"); setOtp(""); setError(""); }} className={`${switchLinkClass} justify-self-center`}>
        تغییر شماره موبایل
      </Button>
    </form>
  );
}
