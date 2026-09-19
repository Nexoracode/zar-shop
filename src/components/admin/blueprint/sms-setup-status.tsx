import Link from "next/link";
import { CheckCircle2, Circle } from "lucide-react";
import type { PublicSmsProviderConfig } from "@/modules/communications/sms-config";
import { BpKicker, BpTag } from "./ui";

/**
 * The steps between "nothing configured" and "customers receive their login code", read from the
 * saved configuration only — no call to Faraz, so the hub renders instantly. The live account
 * check (balance, lines, patterns) lives on the providers page.
 */
export function SmsSetupStatus({ config, smsEnabled }: { config: PublicSmsProviderConfig | null; smsEnabled: boolean }) {
  const editHref = config ? `/admin/settings/notifications/providers/${config.provider}/edit` : "/admin/settings/notifications/providers/new";
  const steps = [
    { label: "اتصال به فراز اس‌ام‌اس", detail: "ثبت کلید API حساب", done: Boolean(config), href: "/admin/settings/notifications/providers/new" },
    { label: "سرشماره ارسال", detail: "خطی که پیامک‌ها با آن می‌روند", done: Boolean(config?.senderNumber), href: editHref },
    { label: "پترن کد تأیید", detail: "برای کد ورود و ثبت‌نام", done: Boolean(config?.otp), href: editHref },
    { label: "ارائه‌دهنده فعال", detail: "فراز به‌عنوان مسیر ارسال انتخاب شده باشد", done: Boolean(config?.isActive), href: "/admin/settings/notifications/providers" },
    { label: "کانال پیامک روشن", detail: "کلید کلی ارسال پیامک", done: smsEnabled, href: "/admin/settings/notifications/preferences" },
  ];
  const doneCount = steps.filter((step) => step.done).length;
  const complete = doneCount === steps.length;
  return (
    <section className="bp-frame relative mb-2 p-[16px]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <BpKicker>وضعیت راه‌اندازی پیامک</BpKicker>
        <BpTag tone={complete ? "success" : "warning"}>{complete ? "آماده ارسال" : `${doneCount.toLocaleString("fa-IR")} از ${steps.length.toLocaleString("fa-IR")} مرحله`}</BpTag>
      </div>
      <ol className="m-0 mt-3 grid list-none gap-2 p-0 md:grid-cols-2 xl:grid-cols-5">
        {steps.map((step) => (
          <li key={step.label} className={`flex items-start gap-2.5 border p-3 ${step.done ? "border-[var(--bp-divider)]" : "border-[var(--bp-warning)]"}`}>
            {step.done ? <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-[var(--bp-success)]" /> : <Circle size={16} className="mt-0.5 shrink-0 text-[var(--bp-warning)]" />}
            <div className="min-w-0">
              <strong className="block text-[12px]">{step.label}</strong>
              <span className="bp-muted mt-0.5 block text-[11px] leading-5">{step.detail}</span>
              {!step.done && <Link href={step.href} className="mt-1 inline-block text-[11px] font-bold text-[var(--bp-accent)]">تکمیل ←</Link>}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
