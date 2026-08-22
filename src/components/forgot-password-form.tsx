"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Input, Spinner, toast } from "@heroui/react";

const fieldClass = "w-full border border-[#e7e6e2] rounded-sm bg-white px-[13px] py-3 outline-none focus:border-[var(--brand-accent)] focus:ring-2 focus:ring-[var(--brand-accent)]/20";
const labelClass = "text-[#4b5160] text-[0.84rem] font-bold";
const submitClass = "min-h-[46px] px-6 py-[9px] inline-flex items-center justify-center bg-[var(--brand-primary)] text-[var(--brand-primary-foreground)] border border-[var(--brand-primary)] rounded-sm transition-all hover:-translate-y-[2px] hover:brightness-110 hover:shadow-[0_8px_20px_rgba(20,35,61,0.12)] disabled:opacity-60 disabled:cursor-not-allowed";

export function ForgotPasswordForm() {
  const router = useRouter();
  const [step, setStep] = useState<"request" | "verify">("request");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function requestCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const submittedEmail = String(form.get("email") ?? "").trim();
    const response = await fetch("/api/auth/forgot-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: submittedEmail }) });
    const result = await response.json().catch(() => null);
    setLoading(false);
    if (!response.ok) { setError(result?.message ?? "ارسال کد بازیابی انجام نشد."); return; }
    setEmail(submittedEmail);
    setStep("verify");
    toast.success("کد بازیابی ارسال شد", { description: result?.message, timeout: 6000 });
  }

  async function resetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirmPassword = String(form.get("confirmPassword") ?? "");
    if (password !== confirmPassword) { setError("رمز عبور جدید و تکرار آن یکسان نیستند."); return; }
    setLoading(true);
    const response = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code: String(form.get("code") ?? "").trim(), password }),
    });
    const result = await response.json().catch(() => null);
    setLoading(false);
    if (!response.ok) { setError(result?.message ?? "بازیابی رمز عبور انجام نشد."); return; }
    toast.success("رمز عبور تغییر کرد", { description: "با موفقیت وارد حساب کاربری شدید.", timeout: 4000 });
    router.push("/account");
    router.refresh();
  }

  if (step === "request") {
    return (
      <form className="grid gap-4" onSubmit={requestCode}>
        <div className="grid gap-[7px]">
          <label htmlFor="email" className={labelClass}>ایمیل حساب کاربری</label>
          <Input id="email" name="email" type="email" dir="ltr" required fullWidth variant="secondary" className={fieldClass} />
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
      <p className="m-0 text-sm leading-7 text-[#4b5160]">کد ۶ رقمی پیامک‌شده به شماره همراه حساب <strong dir="ltr">{email}</strong> را وارد کنید.</p>
      <div className="grid gap-[7px]">
        <label htmlFor="code" className={labelClass}>کد بازیابی</label>
        <Input id="code" name="code" inputMode="numeric" dir="ltr" placeholder="------" maxLength={6} required fullWidth variant="secondary" className={`${fieldClass} text-center tracking-[0.5em]`} />
      </div>
      <div className="grid gap-[7px]">
        <label htmlFor="password" className={labelClass}>رمز عبور جدید</label>
        <Input id="password" name="password" type="password" dir="ltr" minLength={8} required fullWidth variant="secondary" className={fieldClass} />
      </div>
      <div className="grid gap-[7px]">
        <label htmlFor="confirmPassword" className={labelClass}>تکرار رمز عبور جدید</label>
        <Input id="confirmPassword" name="confirmPassword" type="password" dir="ltr" minLength={8} required fullWidth variant="secondary" className={fieldClass} />
      </div>
      {error && <Alert status="danger"><Alert.Description>{error}</Alert.Description></Alert>}
      <Button type="submit" variant="primary" fullWidth className={submitClass} isPending={loading}>
        {({ isPending }) => <>{isPending && <Spinner color="current" size="sm" />}{isPending ? "در حال بررسی..." : "تغییر رمز عبور"}</>}
      </Button>
      <Button type="button" variant="ghost" fullWidth isDisabled={loading} onPress={() => { setStep("request"); setError(""); }} className="min-h-10 text-xs font-bold text-[var(--brand-accent)]">
        کد را دریافت نکردید؟ ارسال دوباره
      </Button>
    </form>
  );
}
