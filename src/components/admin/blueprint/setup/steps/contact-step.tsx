"use client";

import { useState, type FormEvent } from "react";
import { toast } from "@heroui/react";
import { ArrowLeft } from "lucide-react";
import { requestErrorMessage, requestJson } from "@/lib/api-request";
import { setupContactSchema } from "@/modules/settings/setup-schemas";
import { generalSettingsFieldLimits } from "@/modules/settings/settings-limits";
import { BpButton, BpInput, BpTextarea } from "../../ui";
import { SetupFooter, SetupSection } from "../setup-ui";

type Props = {
  initial: { supportPhone: string; supportEmail: string; storeAddress: string; legalIdentifier: string; supportHours: string };
  onBack?: () => void;
  onSaved: () => void;
};

export function SetupContactStep({ initial, onBack, onSaved }: Props) {
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
    <form onSubmit={submit} noValidate>
      <SetupSection title="چطور مشتری با شما تماس بگیرد؟" description="در صفحهٔ تماس و فوتر سایت نمایش داده می‌شود.">
        <div className="grid gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <BpInput label="شماره تماس پشتیبانی" required dir="ltr" maxLength={generalSettingsFieldLimits.supportPhone} value={values.supportPhone} error={errors.supportPhone} onChange={(event) => set("supportPhone", event.target.value)} />
            <BpInput label="ایمیل پشتیبانی" type="email" dir="ltr" maxLength={generalSettingsFieldLimits.supportEmail} value={values.supportEmail} error={errors.supportEmail} onChange={(event) => set("supportEmail", event.target.value)} hint="اختیاری" />
          </div>
          <BpInput label="ساعات پاسخ‌گویی" maxLength={generalSettingsFieldLimits.supportHours} value={values.supportHours} error={errors.supportHours} onChange={(event) => set("supportHours", event.target.value)} hint="اختیاری؛ مثلاً «شنبه تا پنجشنبه، ۹ تا ۱۷»" />
        </div>
      </SetupSection>

      <SetupSection title="اطلاعات حقوقی فروشگاه" description="روی فاکتور رسمی چاپ می‌شود؛ پس دقیق و مطابق مدارک ثبت‌شده وارد کنید.">
        <div className="grid gap-3">
          <BpTextarea label="نشانی فروشگاه" required rows={2} maxLength={generalSettingsFieldLimits.storeAddress} value={values.storeAddress} error={errors.storeAddress} onChange={(event) => set("storeAddress", event.target.value)} />
          <div className="sm:max-w-[calc(50%-6px)]">
            <BpInput label="شناسه ملی / کد اقتصادی" required maxLength={generalSettingsFieldLimits.legalIdentifier} value={values.legalIdentifier} error={errors.legalIdentifier} onChange={(event) => set("legalIdentifier", event.target.value)} />
          </div>
        </div>
      </SetupSection>

      <SetupFooter
        onBack={onBack}
        primary={<BpButton type="submit" variant="primary" isPending={saving} className="gap-1.5">ذخیره و ادامه{!saving && <ArrowLeft size={15} />}</BpButton>}
      />
    </form>
  );
}
