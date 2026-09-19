import Link from "next/link";
import { Check, Circle } from "lucide-react";
import type { PublicSmsProviderConfig } from "@/modules/communications/sms-config";
import { BpTag } from "./ui";

/**
 * The steps between "nothing configured" and "customers receive their login code", read from the
 * saved configuration only — no call to Faraz, so the hub renders instantly. The live account
 * check (balance, lines, patterns) lives on the providers page. A finished step is plain text; an
 * unfinished one is a link straight to where it is fixed.
 */
export function SmsSetupStatus({ config, smsEnabled }: { config: PublicSmsProviderConfig | null; smsEnabled: boolean }) {
  const editHref = config ? `/admin/settings/notifications/providers/${config.provider}/edit` : "/admin/settings/notifications/providers/new";
  const steps = [
    { label: "اتصال فراز", done: Boolean(config), href: "/admin/settings/notifications/providers/new" },
    { label: "سرشماره", done: Boolean(config?.senderNumber), href: editHref },
    { label: "پترن کد تأیید", done: Boolean(config?.otp), href: editHref },
    { label: "ارائه‌دهنده فعال", done: Boolean(config?.isActive), href: "/admin/settings/notifications/providers" },
    { label: "کانال پیامک روشن", done: smsEnabled, href: "/admin/settings/notifications/preferences" },
  ];
  const doneCount = steps.filter((step) => step.done).length;
  const complete = doneCount === steps.length;
  return (
    <section aria-label="وضعیت راه‌اندازی پیامک" className="bp-frame relative mb-3 flex flex-wrap items-center gap-x-5 gap-y-2 px-3 py-2.5">
      <span className="flex items-center gap-2">
        <strong className="text-[12px]">راه‌اندازی</strong>
        <BpTag tone={complete ? "success" : "warning"}>{complete ? "آماده ارسال" : `${doneCount.toLocaleString("fa-IR")} از ${steps.length.toLocaleString("fa-IR")}`}</BpTag>
      </span>
      <ol className="m-0 flex list-none flex-wrap gap-x-4 gap-y-1 p-0">
        {steps.map((step) => (
          <li key={step.label}>
            {step.done
              ? <span className="bp-muted inline-flex items-center gap-1.5 text-[12px]"><Check size={13} className="text-[var(--bp-success)]" />{step.label}</span>
              : <Link href={step.href} className="inline-flex items-center gap-1.5 text-[12px] font-bold text-[var(--bp-warning)]"><Circle size={13} />{step.label}</Link>}
          </li>
        ))}
      </ol>
    </section>
  );
}
