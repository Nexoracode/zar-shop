"use client";

import { useState, type FormEvent } from "react";
import { Alert, Button, Modal, toast } from "@heroui/react";
import { Pencil, X } from "lucide-react";
import { profileFieldLimits } from "@/modules/account/schemas";
import { TextField } from "@/components/form-field";

type Profile = { firstName: string | null; lastName: string | null; email: string | null; phone: string | null; nationalId: string | null };

export function ProfileEditor({ initialProfile }: { initialProfile: Profile }) {
  const [profile, setProfile] = useState(initialProfile);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError("");
    const payload = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const response = await fetch("/api/account/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.message ?? "ویرایش پروفایل انجام نشد.");
      setProfile(result.user); setOpen(false); toast.success("اطلاعات حساب به‌روزرسانی شد");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "ویرایش پروفایل انجام نشد."); }
    finally { setSaving(false); }
  }

  const values = [{ label: "نام و نام خانوادگی", value: `${profile.firstName ?? ""} ${profile.lastName ?? ""}`.trim() || "ثبت نشده" }, { label: "کد ملی", value: profile.nationalId ?? "ثبت نشده", ltr: true }, { label: "شماره موبایل", value: profile.phone ?? "ثبت نشده", ltr: true }, { label: "ایمیل", value: profile.email ?? "ثبت نشده", ltr: true }];

  return <><section id="personal-info" className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm"><header className="flex items-center justify-between border-b border-[var(--border)] p-5"><div><h2 className="m-0 text-base font-bold">اطلاعات حساب کاربری</h2><p className="mb-0 mt-1 text-xs text-[var(--muted)]">اطلاعات هویتی و راه‌های ارتباطی شما</p></div><Button type="button" variant="ghost" onPress={() => setOpen(true)} className="gap-2 text-[var(--brand-primary)]"><Pencil size={16} />ویرایش</Button></header><dl className="grid sm:grid-cols-2">{values.map((item) => <div key={item.label} className="border-b border-[var(--border)] p-5 odd:sm:border-l"><dt className="text-xs text-[var(--muted)]">{item.label}</dt><dd className="mb-0 mt-2 text-sm font-bold" dir={item.ltr ? "ltr" : "rtl"}>{item.value}</dd></div>)}</dl></section><Modal.Backdrop isOpen={open} onOpenChange={setOpen} variant="blur"><Modal.Container placement="center" size="lg"><Modal.Dialog aria-label="ویرایش اطلاعات حساب" dir="rtl" className="mx-3 bg-[var(--surface)]"><Modal.Header className="flex-row items-center justify-between border-b border-[var(--border)] p-5"><Modal.Heading className="text-base font-bold">ویرایش اطلاعات حساب</Modal.Heading><Modal.CloseTrigger aria-label="بستن" className="grid size-9 place-items-center rounded-lg"><X size={18} /></Modal.CloseTrigger></Modal.Header><Modal.Body className="p-5"><form onSubmit={submit} className="grid gap-2 sm:grid-cols-2">
                <TextField name="firstName" label="نام" required defaultValue={profile.firstName ?? ""} maxLength={profileFieldLimits.firstName} />
                <TextField name="lastName" label="نام خانوادگی" required defaultValue={profile.lastName ?? ""} maxLength={profileFieldLimits.lastName} />
                <TextField name="phone" label="شماره موبایل" required dir="ltr" inputMode="tel" defaultValue={profile.phone ?? ""} maxLength={profileFieldLimits.phone} hint="با الگوی 09xxxxxxxxx" />
                <TextField name="nationalId" label="کد ملی" dir="ltr" inputMode="numeric" defaultValue={profile.nationalId ?? ""} minLength={profileFieldLimits.nationalId} maxLength={profileFieldLimits.nationalId} hint="۱۰ رقم، اختیاری" />
                <TextField name="email" label="ایمیل" type="email" dir="ltr" defaultValue={profile.email ?? ""} maxLength={profileFieldLimits.email} wrapperClassName="sm:col-span-2" />
                {error && <Alert status="danger" className="sm:col-span-2"><Alert.Description>{error}</Alert.Description></Alert>}<div className="flex justify-end gap-2 border-t border-[var(--border)] pt-4 sm:col-span-2"><Button type="submit" variant="primary" isPending={saving}>ذخیره تغییرات</Button><Button type="button" variant="secondary" onPress={() => setOpen(false)}>انصراف</Button></div></form></Modal.Body></Modal.Dialog></Modal.Container></Modal.Backdrop></>;
}
