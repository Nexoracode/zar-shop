"use client";

import { useRef, useState, type FormEvent } from "react";
import { Alert, Button, Spinner, toast } from "@heroui/react";
import { Send } from "lucide-react";
import { TextAreaField, TextField } from "@/components/form-field";
import { requestErrorMessage, requestJson } from "@/lib/api-request";
import { normalizeNumericValue } from "@/lib/persian-numbers";

type Field = "name" | "email" | "phone" | "subject" | "message";
type Values = Record<Field, string>;

const emptyValues: Values = { name: "", email: "", phone: "", subject: "", message: "" };

/**
 * Client-side validation mirrors `contactMessageSchema` on the server. It exists for the reader's
 * benefit only — the server schema is still what decides whether a message is accepted.
 */
function validate(values: Values): Partial<Record<Field, string>> {
  const errors: Partial<Record<Field, string>> = {};
  if (values.name.trim().length < 2) errors.name = "نام باید حداقل ۲ نویسه باشد.";
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(values.email.trim())) errors.email = "ایمیل معتبر نیست.";
  const phone = normalizeNumericValue(values.phone, false);
  if (phone && !/^\d{8,15}$/.test(phone)) errors.phone = "شماره تماس باید بین ۸ تا ۱۵ رقم باشد.";
  if (values.subject.trim().length < 3) errors.subject = "موضوع باید حداقل ۳ نویسه باشد.";
  if (values.message.trim().length < 10) errors.message = "متن پیام باید حداقل ۱۰ نویسه باشد.";
  return errors;
}

export function ContactForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [values, setValues] = useState<Values>(emptyValues);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  function set(field: Field, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    // Clear a field's error as soon as the reader starts fixing it.
    setErrors((current) => (current[field] ? { ...current, [field]: undefined } : current));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = validate(values);
    if (Object.keys(found).length) {
      setErrors(found);
      // Focus the first field in error, in the order they appear in the form.
      const order: Field[] = ["name", "email", "phone", "subject", "message"];
      const first = order.find((field) => found[field]);
      if (first) formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
      return;
    }
    setLoading(true);
    try {
      const result = await requestJson<{ message?: string }>("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: values.name.trim(),
          email: values.email.trim(),
          phone: normalizeNumericValue(values.phone, false) || undefined,
          subject: values.subject.trim(),
          message: values.message.trim(),
        }),
      }, { fallbackMessage: "ارسال پیام انجام نشد." });
      setValues(emptyValues);
      setSent(true);
      toast.success("پیام شما ارسال شد", { description: result?.message, timeout: 5000 });
    } catch (reason) {
      toast.danger("ارسال پیام انجام نشد", { description: requestErrorMessage(reason, "ارسال پیام انجام نشد.") });
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return <Alert status="success"><Alert.Description>پیام شما با موفقیت ارسال شد؛ تیم پشتیبانی به‌زودی پاسخ می‌دهد.</Alert.Description></Alert>;
  }

  return (
    <form ref={formRef} onSubmit={submit} noValidate className="grid gap-2">
      <div className="grid gap-2 sm:grid-cols-2">
        <TextField name="name" label="نام و نام خانوادگی" required maxLength={150} value={values.name} error={errors.name} onChange={(event) => set("name", event.target.value)} />
        <TextField name="email" label="ایمیل" type="email" dir="ltr" required maxLength={150} value={values.email} error={errors.email} onChange={(event) => set("email", event.target.value)} />
        <TextField name="phone" label="شماره تماس" dir="ltr" inputMode="tel" maxLength={15} value={values.phone} error={errors.phone} hint="اختیاری — فقط رقم، بین ۸ تا ۱۵ رقم" onChange={(event) => set("phone", event.target.value)} />
        <TextField name="subject" label="موضوع" required maxLength={191} value={values.subject} error={errors.subject} onChange={(event) => set("subject", event.target.value)} />
      </div>
      <TextAreaField name="message" label="متن پیام" required rows={5} maxLength={3000} value={values.message} error={errors.message} hint="حداقل ۱۰ نویسه" onChange={(event) => set("message", event.target.value)} />
      <Button type="submit" variant="primary" isPending={loading} className="min-h-11 justify-self-start gap-2 bg-[var(--brand-primary)] px-6 text-sm font-bold text-[var(--brand-primary-foreground)]">
        {({ isPending }) => <>{isPending ? <Spinner color="current" size="sm" /> : <Send size={16} />}{isPending ? "در حال ارسال..." : "ارسال پیام"}</>}
      </Button>
    </form>
  );
}
