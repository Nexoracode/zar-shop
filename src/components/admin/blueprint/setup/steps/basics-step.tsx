"use client";

import { useState, type FormEvent } from "react";
import { toast } from "@heroui/react";
import { Gem, Store } from "lucide-react";
import type { StoreIndustry } from "@generated/prisma/enums";
import { requestErrorMessage, requestJson } from "@/lib/api-request";
import { setupBasicsSchema } from "@/modules/settings/setup-schemas";
import { generalSettingsFieldLimits } from "@/modules/settings/settings-limits";
import { BpButton, BpInput, BpKicker, BpTextarea } from "../../ui";

type Props = {
  initial: { industry: StoreIndustry; storeName: string; tagline: string; shortDescription: string };
  onSaved: () => void;
};

const industryOptions: Array<{ value: StoreIndustry; title: string; description: string; icon: typeof Store }> = [
  { value: "GENERAL", title: "فروشگاه عمومی", description: "کالای معمولی با قیمت ثابت", icon: Store },
  { value: "GOLD", title: "فروشگاه طلا", description: "قیمت‌گذاری با نرخ لحظه‌ای طلا، وزن و اجرت", icon: Gem },
];

export function SetupBasicsStep({ initial, onSaved }: Props) {
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
    <form onSubmit={submit} noValidate className="grid gap-2">
      <section className="bp-frame relative p-[16px]">
        <BpKicker>صنف فروشگاه</BpKicker>
        <p className="bp-muted m-0 mt-1 text-[12px] leading-6">این انتخاب تعیین می‌کند چه امکاناتی در فروشگاه و پنل نمایش داده شوند و پس از راه‌اندازی قابل تغییر نیست.</p>
        <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
          {industryOptions.map((option) => {
            const Icon = option.icon;
            const selected = industry === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setIndustry(option.value)}
                aria-pressed={selected}
                className={`flex items-start gap-3 border p-3 text-right ${selected ? "border-[var(--bp-accent)] bg-[var(--bp-accent-100)]" : "border-[var(--bp-divider)] bg-[var(--bp-bg)]"}`}
              >
                <span className={`grid size-10 shrink-0 place-items-center border ${selected ? "border-[var(--bp-accent)] text-[var(--bp-accent)]" : "border-[var(--bp-divider)] text-[var(--bp-muted)]"}`}><Icon size={18} /></span>
                <span className="min-w-0"><strong className="block text-[13px]">{option.title}</strong><span className="bp-muted mt-0.5 block text-[11px] leading-5">{option.description}</span></span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="bp-frame relative p-[16px]">
        <BpKicker>هویت فروشگاه</BpKicker>
        <p className="bp-muted m-0 mt-1 text-[12px] leading-6">این متن‌ها در هدر سایت، نتایج جستجو و فاکتور نمایش داده می‌شوند.</p>
        <div className="mt-3 grid gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <BpInput label="نام فروشگاه" required maxLength={generalSettingsFieldLimits.storeName} value={values.storeName} error={errors.storeName} onChange={(event) => set("storeName", event.target.value)} />
            <BpInput label="شعار کوتاه" required maxLength={generalSettingsFieldLimits.tagline} value={values.tagline} error={errors.tagline} onChange={(event) => set("tagline", event.target.value)} />
          </div>
          <BpTextarea label="توضیح کوتاه فروشگاه" required rows={3} maxLength={generalSettingsFieldLimits.shortDescription} value={values.shortDescription} error={errors.shortDescription} onChange={(event) => set("shortDescription", event.target.value)} />
        </div>
      </section>

      <div className="flex justify-end">
        <BpButton type="submit" variant="primary" isPending={saving}>ذخیره و ادامه</BpButton>
      </div>
    </form>
  );
}
