"use client";

import { useState, type FormEvent } from "react";
import { Alert, Button, Input, Spinner, TextArea, toast } from "@heroui/react";
import { Send } from "lucide-react";

const fieldClass = "w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-3 outline-none focus:border-[var(--brand-accent)] focus:ring-2 focus:ring-[var(--brand-accent)]/20";
const labelClass = "grid gap-2 text-xs font-bold text-[var(--foreground)]";

export function ContactForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const form = event.currentTarget;
    const data = new FormData(form);
    const body = {
      name: String(data.get("name") ?? ""),
      email: String(data.get("email") ?? ""),
      phone: String(data.get("phone") ?? "") || undefined,
      subject: String(data.get("subject") ?? ""),
      message: String(data.get("message") ?? ""),
    };
    try {
      const response = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.message ?? "ارسال پیام انجام نشد.");
      form.reset();
      setSent(true);
      toast.success("پیام شما ارسال شد", { description: result?.message, timeout: 5000 });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "ارسال پیام انجام نشد.");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return <Alert status="success"><Alert.Description>پیام شما با موفقیت ارسال شد؛ تیم پشتیبانی به‌زودی پاسخ می‌دهد.</Alert.Description></Alert>;
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={labelClass}>نام و نام خانوادگی<Input name="name" required minLength={2} fullWidth variant="secondary" className={fieldClass} /></label>
        <label className={labelClass}>ایمیل<Input name="email" type="email" dir="ltr" required fullWidth variant="secondary" className={fieldClass} /></label>
        <label className={labelClass}>شماره تماس (اختیاری)<Input name="phone" dir="ltr" inputMode="tel" fullWidth variant="secondary" className={fieldClass} /></label>
        <label className={labelClass}>موضوع<Input name="subject" required minLength={3} fullWidth variant="secondary" className={fieldClass} /></label>
      </div>
      <label className={labelClass}>متن پیام<TextArea name="message" required minLength={10} rows={5} variant="secondary" className={fieldClass} /></label>
      {error && <Alert status="danger"><Alert.Description>{error}</Alert.Description></Alert>}
      <Button type="submit" variant="primary" isPending={loading} className="min-h-11 justify-self-start gap-2 bg-[var(--brand-primary)] px-6 text-sm font-bold text-[var(--brand-primary-foreground)]">
        {({ isPending }) => <>{isPending ? <Spinner color="current" size="sm" /> : <Send size={16} />}{isPending ? "در حال ارسال..." : "ارسال پیام"}</>}
      </Button>
    </form>
  );
}
