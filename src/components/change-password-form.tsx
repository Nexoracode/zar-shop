"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Input, Modal, toast } from "@heroui/react";
import { KeyRound, X } from "lucide-react";
import { authFieldLimits } from "@/modules/auth/schemas";

export function ChangePasswordForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    const currentPassword = String(form.get("currentPassword") ?? "");
    const newPassword = String(form.get("newPassword") ?? "");
    const confirmPassword = String(form.get("confirmPassword") ?? "");
    if (newPassword !== confirmPassword) { setError("رمز عبور جدید و تکرار آن یکسان نیستند."); return; }
    setSaving(true);
    try {
      const response = await fetch("/api/account/password", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ currentPassword, newPassword }) });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.message ?? "تغییر رمز عبور انجام نشد.");
      setOpen(false);
      toast.success("رمز عبور تغییر کرد", { description: "برای امنیت حساب، سایر دستگاه‌های واردشده از حساب شما خارج شدند.", timeout: 5000 });
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "تغییر رمز عبور انجام نشد.");
    } finally {
      setSaving(false);
    }
  }

  const fieldClass = "w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-3 focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/15";

  return (
    <>
      <section className="mt-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
        <header className="flex items-center justify-between gap-3 p-5">
          <div><h2 className="m-0 text-base font-bold">رمز عبور</h2><p className="mb-0 mt-1 text-xs text-[var(--muted)]">برای ورود امن به حساب کاربری خود، رمز عبور را دوره‌ای تغییر دهید.</p></div>
          <Button type="button" variant="ghost" onPress={() => { setError(""); setOpen(true); }} className="shrink-0 gap-2 text-[var(--brand-primary)]"><KeyRound size={16} />تغییر رمز عبور</Button>
        </header>
      </section>
      <Modal.Backdrop isOpen={open} onOpenChange={(next) => { if (!saving) setOpen(next); }} variant="blur">
        <Modal.Container placement="center" size="lg">
          <Modal.Dialog aria-label="تغییر رمز عبور" dir="rtl" className="mx-3 bg-[var(--surface)]">
            <Modal.Header className="flex-row items-center justify-between border-b border-[var(--border)] p-5">
              <Modal.Heading className="text-base font-bold">تغییر رمز عبور</Modal.Heading>
              <Modal.CloseTrigger aria-label="بستن" className="grid size-9 place-items-center rounded-lg"><X size={18} /></Modal.CloseTrigger>
            </Modal.Header>
            <Modal.Body className="p-5">
              <form onSubmit={submit} className="grid gap-4">
                <label className="grid gap-2 text-xs font-bold">رمز عبور فعلی<Input name="currentPassword" type="password" dir="ltr" required maxLength={authFieldLimits.password} className={fieldClass} /></label>
                <label className="grid gap-2 text-xs font-bold">رمز عبور جدید<Input name="newPassword" type="password" dir="ltr" minLength={8} maxLength={authFieldLimits.password} required className={fieldClass} /></label>
                <label className="grid gap-2 text-xs font-bold">تکرار رمز عبور جدید<Input name="confirmPassword" type="password" dir="ltr" minLength={8} maxLength={authFieldLimits.password} required className={fieldClass} /></label>
                {error && <Alert status="danger"><Alert.Description>{error}</Alert.Description></Alert>}
                <div className="flex justify-end gap-2 border-t border-[var(--border)] pt-4">
                  <Button type="submit" variant="primary" isPending={saving}>ذخیره رمز عبور جدید</Button>
                  <Button type="button" variant="secondary" isDisabled={saving} onPress={() => setOpen(false)}>انصراف</Button>
                </div>
              </form>
            </Modal.Body>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </>
  );
}
