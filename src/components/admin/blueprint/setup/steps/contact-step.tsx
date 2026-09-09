"use client";

import { useState, type FormEvent } from "react";
import { toast } from "@heroui/react";
import { requestErrorMessage, requestJson } from "@/lib/api-request";
import { setupContactSchema } from "@/modules/settings/setup-schemas";
import { generalSettingsFieldLimits } from "@/modules/settings/settings-limits";
import { BpButton, BpInput, BpKicker, BpTextarea } from "../../ui";

type Props = {
  initial: { supportPhone: string; supportEmail: string; storeAddress: string; legalIdentifier: string; supportHours: string };
  onSaved: () => void;
};

export function SetupContactStep({ initial, onSaved }: Props) {
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  function set(field: keyof typeof values, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => (current[field] ? { ...current, [field]: "" } : current));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = setupContactSchema.safeParse(values);
    if (!parsed.success) {
      const found: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "form");
        if (!found[key]) found[key] = issue.message;
      }
      setErrors(found);
      return;
    }
    setSaving(true);
    try {
      await requestJson("/api/admin/setup", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: "contact", ...parsed.data }),
      }, { fallbackMessage: "ذخیره اطلاعات تماس انجام نشد." });
      toast.success("اطلاعات تماس و حقوقی ذخیره شد");
      setSaving(false);
      onSaved();
    } catch (reason) {
      toast.danger("ذخیره انجام نشد", { description: requestErrorMessage(reason, "ارتباط با سرور برقرار نشد.") });
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-2">
      <section className="bp-frame relative p-[16px]">
        <BpKicker>راه‌های ارتباطی و اطلاعات حقوقی</BpKicker>
        <p className="bp-muted m-0 mt-1 text-[12px] leading-6">شماره تماس، نشانی و شناسه اقتصادی روی فاکتور رسمی فروشگاه چاپ می‌شوند.</p>
        <div className="mt-3 grid gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <BpInput label="شماره تماس پشتیبانی" required dir="ltr" maxLength={generalSettingsFieldLimits.supportPhone} value={values.supportPhone} error={errors.supportPhone} onChange={(event) => set("supportPhone", event.target.value)} />
            <BpInput label="ایمیل پشتیبانی" type="email" dir="ltr" maxLength={generalSettingsFieldLimits.supportEmail} value={values.supportEmail} error={errors.supportEmail} onChange={(event) => set("supportEmail", event.target.value)} hint="اختیاری" />
          </div>
          <BpTextarea label="نشانی فروشگاه" required rows={2} maxLength={generalSettingsFieldLimits.storeAddress} value={values.storeAddress} error={errors.storeAddress} onChange={(event) => set("storeAddress", event.target.value)} />
          <div className="grid gap-3 sm:grid-cols-2">
            <BpInput label="شناسه ملی / کد اقتصادی" required maxLength={generalSettingsFieldLimits.legalIdentifier} value={values.legalIdentifier} error={errors.legalIdentifier} onChange={(event) => set("legalIdentifier", event.target.value)} />
            <BpInput label="ساعات پاسخ‌گویی" maxLength={generalSettingsFieldLimits.supportHours} value={values.supportHours} error={errors.supportHours} onChange={(event) => set("supportHours", event.target.value)} hint="اختیاری" />
          </div>
        </div>
      </section>

      <div className="flex justify-end">
        <BpButton type="submit" variant="primary" isPending={saving}>ذخیره و ادامه</BpButton>
      </div>
    </form>
  );
}
