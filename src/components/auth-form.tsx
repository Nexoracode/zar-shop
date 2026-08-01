"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Input, Spinner, toast } from "@heroui/react";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const body = Object.fromEntries(form);
    const response = await fetch(`/api/auth/${mode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const result = await response.json();
    if (!response.ok) { setError(result.message ?? "خطایی رخ داد."); setLoading(false); return; }
    toast.success(mode === "login" ? "ورود موفق بود" : "حساب کاربری ساخته شد", { description: mode === "login" ? "با موفقیت وارد حساب کاربری شدید." : "حساب شما با موفقیت ایجاد شد.", timeout: 4000 });
    router.push(mode === "login" ? "/account" : "/");
    router.refresh();
  }

  const fieldClass = "w-full border border-[#e7e6e2] rounded-sm bg-white px-[13px] py-3 outline-none focus:border-[var(--brand-accent)] focus:ring-2 focus:ring-[var(--brand-accent)]/20";
  const labelClass = "text-[#4b5160] text-[0.84rem] font-bold";

  return (
    <form className="grid gap-4" onSubmit={submit}>
      {mode === "register" && (
        <div className="grid grid-cols-1 gap-[14px] sm:grid-cols-2">
          <div className="grid gap-[7px]">
            <label htmlFor="firstName" className={labelClass}>نام</label>
            <Input id="firstName" name="firstName" required minLength={2} fullWidth variant="secondary" className={fieldClass} />
          </div>
          <div className="grid gap-[7px]">
            <label htmlFor="lastName" className={labelClass}>نام خانوادگی</label>
            <Input id="lastName" name="lastName" required minLength={2} fullWidth variant="secondary" className={fieldClass} />
          </div>
        </div>
      )}

      <div className="grid gap-[7px]">
        <label htmlFor="email" className={labelClass}>ایمیل</label>
        <Input id="email" name="email" type="email" dir="ltr" required fullWidth variant="secondary" className={fieldClass} />
      </div>

      {mode === "register" && (
        <div className="grid gap-[7px]">
          <label htmlFor="phone" className={labelClass}>شماره موبایل</label>
          <Input id="phone" name="phone" inputMode="tel" dir="ltr" placeholder="09123456789" required fullWidth variant="secondary" className={fieldClass} />
        </div>
      )}

      <div className="grid gap-[7px]">
        <label htmlFor="password" className={labelClass}>رمز عبور</label>
        <Input id="password" name="password" type="password" dir="ltr" minLength={8} required fullWidth variant="secondary" className={fieldClass} />
      </div>

      {error && <Alert status="danger"><Alert.Description>{error}</Alert.Description></Alert>}

      <Button
        type="submit"
        variant="primary"
        fullWidth
        className="min-h-[46px] px-6 py-[9px] inline-flex items-center justify-center bg-[var(--brand-primary)] text-[var(--brand-primary-foreground)] border border-[var(--brand-primary)] rounded-sm transition-all hover:-translate-y-[2px] hover:brightness-110 hover:shadow-[0_8px_20px_rgba(20,35,61,0.12)] disabled:opacity-60 disabled:cursor-not-allowed"
        isPending={loading}
      >
        {({ isPending }) => <>{isPending && <Spinner color="current" size="sm" />}{isPending ? "در حال بررسی..." : mode === "login" ? "ورود امن" : "ساخت حساب"}</>}
      </Button>
    </form>
  );
}
