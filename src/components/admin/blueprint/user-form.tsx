"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { toast } from "@heroui/react";
import type { UserRole } from "@generated/prisma/enums";
import { requestErrorMessage, requestJson } from "@/lib/api-request";
import { authFieldLimits } from "@/modules/auth/schemas";
import { userRoleLabels, userStatusLabels } from "@/modules/admin/labels";
import { adminCreateUserSchema, assignableUserStatuses, userFieldLimits } from "@/modules/users/schemas";
import { BpButton } from "./ui/button";
import { BpInput } from "./ui/input";
import { BpKicker } from "./ui/card";
import { BpSelect } from "./ui/select";

export function BlueprintUserForm({ roleOptions }: { roleOptions: readonly UserRole[] }) {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>(roleOptions[0]);
  const [status, setStatus] = useState<(typeof assignableUserStatuses)[number]>("ACTIVE");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  function clearError(field: string) {
    setErrors((current) => (current[field] ? { ...current, [field]: "" } : current));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validation = adminCreateUserSchema.safeParse({
      phone,
      firstName: firstName.trim() || undefined,
      lastName: lastName.trim() || undefined,
      email: email.trim() || undefined,
      password,
      role,
      status,
    });
    if (!validation.success) {
      const found: Record<string, string> = {};
      for (const issue of validation.error.issues) {
        const field = String(issue.path[0] ?? "form");
        if (!found[field]) found[field] = issue.message;
      }
      setErrors(found);
      return;
    }
    setSaving(true);
    try {
      await requestJson("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validation.data),
      }, { fallbackMessage: "ثبت کاربر ناموفق بود." });
      toast.success("کاربر جدید ثبت شد");
      router.push("/admin/users");
      router.refresh();
    } catch (reason) {
      toast.danger("ثبت کاربر انجام نشد", { description: requestErrorMessage(reason, "ارتباط با سرور برقرار نشد.") });
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-2">
      <section className="bp-frame relative p-[18px]">
        <BpKicker>اطلاعات حساب</BpKicker>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <BpInput label="شماره موبایل" required dir="ltr" maxLength={authFieldLimits.phone} value={phone} error={errors.phone} placeholder="09123456789" onChange={(event) => { setPhone(event.target.value); clearError("phone"); }} />
          <BpInput label="رمز عبور" required type="password" maxLength={authFieldLimits.password} value={password} error={errors.password} hint="حداقل ۸ کاراکتر، شامل حرف و عدد انگلیسی" placeholder="رمز عبور اولیه کاربر" onChange={(event) => { setPassword(event.target.value); clearError("password"); }} />
          <BpInput label="نام" maxLength={authFieldLimits.firstName} value={firstName} error={errors.firstName} placeholder="اختیاری" onChange={(event) => { setFirstName(event.target.value); clearError("firstName"); }} />
          <BpInput label="نام خانوادگی" maxLength={authFieldLimits.lastName} value={lastName} error={errors.lastName} placeholder="اختیاری" onChange={(event) => { setLastName(event.target.value); clearError("lastName"); }} />
          <BpInput label="ایمیل" dir="ltr" maxLength={userFieldLimits.email} value={email} error={errors.email} placeholder="اختیاری" onChange={(event) => { setEmail(event.target.value); clearError("email"); }} />
        </div>
      </section>

      <section className="bp-frame relative p-[18px]">
        <BpKicker>نقش و وضعیت</BpKicker>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <BpSelect
            label="نقش"
            required
            value={role}
            error={errors.role}
            options={roleOptions.map((item) => ({ value: item, label: userRoleLabels[item] }))}
            onChange={(event) => { setRole(event.target.value as UserRole); clearError("role"); }}
          />
          <BpSelect
            label="وضعیت حساب"
            value={status}
            options={assignableUserStatuses.map((item) => ({ value: item, label: userStatusLabels[item] }))}
            onChange={(event) => setStatus(event.target.value as (typeof assignableUserStatuses)[number])}
          />
        </div>
      </section>

      <section className="bp-frame relative flex flex-col gap-3 p-[18px] sm:flex-row sm:items-center sm:justify-between">
        <p className="bp-muted m-0 text-[12px]">این رمز عبور اولیه کاربر است؛ کاربر می‌تواند بعداً از حساب خودش آن را تغییر دهد.</p>
        <BpButton type="submit" variant="primary" isPending={saving}>ثبت کاربر</BpButton>
      </section>
    </form>
  );
}
