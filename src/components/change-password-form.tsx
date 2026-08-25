"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Modal, toast } from "@heroui/react";
import { KeyRound, X } from "lucide-react";
import { authFieldLimits } from "@/modules/auth/schemas";
import { TextField } from "@/components/form-field";

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
                <TextField name="currentPassword" label="رمز عبور فعلی" type="password" dir="ltr" required maxLength={authFieldLimits.password} />
                <TextField name="newPassword" label="رمز عبور جدید" type="password" dir="ltr" required minLength={8} maxLength={authFieldLimits.password} hint="حداقل ۸ نویسه، شامل حرف انگلیسی و رقم" />
                <TextField name="confirmPassword" label="تکرار رمز عبور جدید" type="password" dir="ltr" required minLength={8} maxLength={authFieldLimits.password} />
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
