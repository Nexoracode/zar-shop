"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { LogIn, ShieldCheck } from "lucide-react";
import type { UserRole } from "@generated/prisma/enums";
import { loginSchema, authFieldLimits } from "@/modules/auth/schemas";
import { isAdminRole } from "@/modules/auth/permissions";
import { normalizeNumericValue } from "@/lib/persian-numbers";
import { BpButton, BpInput } from "./ui";

type FieldErrors = { phone?: string; password?: string };

export function AdminLoginForm() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const phoneRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const parsed = loginSchema.safeParse({ phone, password });
    if (!parsed.success) {
      const issues: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (key === "phone" && !issues.phone) issues.phone = issue.message;
        if (key === "password" && !issues.password) issues.password = password ? issue.message : "رمز عبور را وارد کنید.";
      }
      setFieldErrors(issues);
      (issues.phone ? phoneRef : passwordRef).current?.focus();
      return;
    }
    setFieldErrors({});

    setSubmitting(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const result = await response.json().catch(() => null) as { message?: string; user?: { role: UserRole } } | null;
      if (!response.ok) {
        setFormError(result?.message ?? "ورود انجام نشد؛ دوباره تلاش کنید.");
        passwordRef.current?.focus();
        return;
      }
      if (!result?.user || !isAdminRole(result.user.role)) {
        await fetch("/api/auth/logout", { method: "POST" });
        setFormError("این حساب دسترسی به پنل مدیریت را ندارد.");
        passwordRef.current?.focus();
        return;
      }
      router.push("/admin");
      router.refresh();
    } catch {
      setFormError("ارتباط با سرور برقرار نشد؛ دوباره تلاش کنید.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-1">
      <BpInput
        ref={phoneRef}
        label="شماره موبایل"
        required
        dir="ltr"
        inputMode="numeric"
        maxLength={authFieldLimits.phone}
        value={phone}
        onChange={(event) => setPhone(normalizeNumericValue(event.target.value, false))}
        placeholder="09xxxxxxxxx"
        error={fieldErrors.phone}
        wrapperClassName="mt-1"
      />
      <BpInput
        ref={passwordRef}
        label="رمز عبور"
        required
        secret
        maxLength={authFieldLimits.password}
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        error={fieldErrors.password}
        wrapperClassName="mt-1"
      />
      {formError && <p role="alert" className="m-0 mt-1 text-[12px] font-bold text-[var(--bp-danger)]">{formError}</p>}
      <BpButton type="submit" variant="primary" fullWidth isPending={submitting} className="mt-3 gap-2">
        {submitting ? "در حال ورود" : <><LogIn size={16} />ورود به پنل</>}
      </BpButton>
      <p className="bp-muted m-0 mt-3 flex items-center justify-center gap-1.5 text-[11px]"><ShieldCheck size={13} />این صفحه فقط برای کارکنان فروشگاه است.</p>
    </form>
  );
}
