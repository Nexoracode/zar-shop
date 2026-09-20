"use client";

import { useState, type FormEvent } from "react";
import { toast } from "@heroui/react";
import { ArrowLeft, Check, Gem, Store } from "lucide-react";
import type { StoreIndustry } from "@generated/prisma/enums";
import { requestErrorMessage, requestJson } from "@/lib/api-request";
import { setupBasicsSchema } from "@/modules/settings/setup-schemas";
import { generalSettingsFieldLimits } from "@/modules/settings/settings-limits";
import { BpButton, BpInput, BpTextarea } from "../../ui";
import { SetupFooter, SetupSection } from "../setup-ui";

type Props = {
  initial: { industry: StoreIndustry; storeName: string; tagline: string; shortDescription: string };
  onBack?: () => void;
  onSaved: () => void;
};

const industryOptions: Array<{ value: StoreIndustry; title: string; description: string; icon: typeof Store }> = [
  { value: "GENERAL", title: "فروشگاه عمومی", description: "کالای معمولی با قیمت ثابت", icon: Store },
  { value: "GOLD", title: "فروشگاه طلا", description: "قیمت‌گذاری با نرخ لحظه‌ای طلا، وزن و اجرت", icon: Gem },
];

export function SetupBasicsStep({ initial, onBack, onSaved }: Props) {
  const [industry, setIndustry] = useState<StoreIndustry>(initial.industry);
  const [values, setValues] = useState({ storeName: initial.storeName, tagline: initial.tagline, shortDescription: initial.shortDescription });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  function set(field: keyof typeof values, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => (current[field] ? { ...current, [field]: "" } : current));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = setupBasicsSchema.safeParse({ industry, ...values });
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
        body: JSON.stringify({ step: "basics", ...parsed.data }),
      }, { fallbackMessage: "ذخیره اطلاعات پایه انجام نشد." });
      toast.success("اطلاعات پایه ذخیره شد");
      setSaving(false);
      onSaved();
    } catch (reason) {
      toast.danger("ذخیره انجام نشد", { description: requestErrorMessage(reason, "ارتباط با سرور برقرار نشد.") });
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate>
      <SetupSection
        title="فروشگاه شما چه چیزی می‌فروشد؟"
        description={<>یکی را انتخاب کنید. این انتخاب مشخص می‌کند چه امکاناتی در سایت و پنل باشد و <strong>بعد از راه‌اندازی قابل تغییر نیست.</strong></>}
      >
        <div role="radiogroup" aria-label="صنف فروشگاه" className="grid gap-2.5 sm:grid-cols-2">
          {industryOptions.map((option) => {
            const Icon = option.icon;
            const selected = industry === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setIndustry(option.value)}
                className={`relative flex items-start gap-3 rounded-[var(--bp-radius)] border p-3.5 text-right transition-colors ${selected ? "border-[var(--bp-accent)] bg-[var(--bp-accent-100)]" : "border-[var(--bp-divider)] bg-[var(--bp-bg)] hover:border-[var(--bp-accent-400)]"}`}
              >
                <span className={`grid size-10 shrink-0 place-items-center rounded-[var(--bp-radius-sm)] border ${selected ? "border-[var(--bp-accent)] bg-[var(--bp-accent)] text-white" : "border-[var(--bp-divider)] text-[var(--bp-muted)]"}`}><Icon size={18} /></span>
                <span className="min-w-0 flex-1"><strong className="block text-[13px]">{option.title}</strong><span className="bp-muted mt-0.5 block text-[11.5px] leading-5">{option.description}</span></span>
                {selected && <span aria-hidden className="grid size-5 shrink-0 place-items-center rounded-full bg-[var(--bp-accent)] text-white"><Check size={12} strokeWidth={3} /></span>}
              </button>
            );
          })}
        </div>
      </SetupSection>

      <SetupSection title="نام و معرفی فروشگاه" description="در بالای سایت، نتایج جستجو و روی فاکتور نمایش داده می‌شود.">
        <div className="grid gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <BpInput label="نام فروشگاه" required maxLength={generalSettingsFieldLimits.storeName} value={values.storeName} error={errors.storeName} onChange={(event) => set("storeName", event.target.value)} />
            <BpInput label="شعار کوتاه" required hint="یک جملهٔ کوتاه، مثلاً «انتخاب مطمئن شما»" maxLength={generalSettingsFieldLimits.tagline} value={values.tagline} error={errors.tagline} onChange={(event) => set("tagline", event.target.value)} />
          </div>
          <BpTextarea label="توضیح کوتاه فروشگاه" required rows={3} maxLength={generalSettingsFieldLimits.shortDescription} value={values.shortDescription} error={errors.shortDescription} onChange={(event) => set("shortDescription", event.target.value)} />
        </div>
      </SetupSection>

      <SetupFooter
        onBack={onBack}
        primary={<BpButton type="submit" variant="primary" isPending={saving} className="gap-1.5">ذخیره و ادامه{!saving && <ArrowLeft size={15} />}</BpButton>}
      />
    </form>
  );
}
