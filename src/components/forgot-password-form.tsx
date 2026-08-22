"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Input, Spinner, toast } from "@heroui/react";
import { OtpCodeInput } from "@/components/otp-code-input";
import { OtpResendCountdown } from "@/components/otp-resend-countdown";

const fieldClass = "w-full border border-[#e7e6e2] rounded-sm bg-white px-[13px] py-3 outline-none focus:border-[var(--brand-accent)] focus:ring-2 focus:ring-[var(--brand-accent)]/20";
const labelClass = "text-[#4b5160] text-[0.84rem] font-bold";
const submitClass = "min-h-[46px] px-6 py-[9px] inline-flex items-center justify-center bg-[var(--brand-primary)] text-[var(--brand-primary-foreground)] border border-[var(--brand-primary)] rounded-sm transition-all hover:-translate-y-[2px] hover:brightness-110 hover:shadow-[0_8px_20px_rgba(20,35,61,0.12)] disabled:opacity-60 disabled:cursor-not-allowed";

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
      <form className="grid gap-4" onSubmit={requestCode}>
        <div className="grid gap-[7px]">
          <label htmlFor="phone" className={labelClass}>شماره موبایل حساب کاربری</label>
          <Input id="phone" name="phone" inputMode="tel" dir="ltr" placeholder="09123456789" required fullWidth variant="secondary" className={fieldClass} />
        </div>
        {error && <Alert status="danger"><Alert.Description>{error}</Alert.Description></Alert>}
        <Button type="submit" variant="primary" fullWidth className={submitClass} isPending={loading}>
          {({ isPending }) => <>{isPending && <Spinner color="current" size="sm" />}{isPending ? "در حال ارسال..." : "ارسال کد بازیابی"}</>}
        </Button>
      </form>
    );
  }

  return (
    <form className="grid gap-4" onSubmit={resetPassword}>
      <p className="m-0 text-sm leading-7 text-[#4b5160]">کد ۶ رقمی پیامک‌شده به شماره <strong dir="ltr">{phone}</strong> را وارد کنید.</p>
      <OtpCodeInput value={otp} onChange={setOtp} isDisabled={loading} />
      <div className="grid gap-[7px]">
        <label htmlFor="password" className={labelClass}>رمز عبور جدید</label>
        <Input id="password" name="password" type="password" dir="ltr" minLength={8} required fullWidth variant="secondary" className={fieldClass} />
      </div>
      <div className="grid gap-[7px]">
        <label htmlFor="confirmPassword" className={labelClass}>تکرار رمز عبور جدید</label>
        <Input id="confirmPassword" name="confirmPassword" type="password" dir="ltr" minLength={8} required fullWidth variant="secondary" className={fieldClass} />
      </div>
      {error && <Alert status="danger"><Alert.Description>{error}</Alert.Description></Alert>}
      <Button type="submit" variant="primary" fullWidth className={submitClass} isPending={loading} isDisabled={otp.length !== 6}>
        {({ isPending }) => <>{isPending && <Spinner color="current" size="sm" />}{isPending ? "در حال بررسی..." : "تغییر رمز عبور"}</>}
      </Button>
      <OtpResendCountdown key={resendKey} onResend={resendCode} isResending={altLoading} />
      <Button type="button" variant="ghost" fullWidth isDisabled={loading} onPress={() => { setStep("request"); setOtp(""); setError(""); }} className="min-h-10 text-xs font-bold text-[var(--brand-accent)]">
        تغییر شماره موبایل
      </Button>
    </form>
  );
}
