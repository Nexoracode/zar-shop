"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@heroui/react";
import { CheckCircle2, CircleDashed, Rocket } from "lucide-react";
import { requestErrorMessage, requestJson } from "@/lib/api-request";
import type { SetupStepId } from "@/modules/settings/setup-schemas";
import { BpButton, BpKicker } from "../../ui";

type Props = {
  steps: Record<SetupStepId, boolean>;
  labels: Record<SetupStepId, string>;
  order: SetupStepId[];
  allStepsSatisfied: boolean;
  onGoToStep: (step: SetupStepId) => void;
};

export function SetupFinishStep({ steps, labels, order, allStepsSatisfied, onGoToStep }: Props) {
  const router = useRouter();
  const [activating, setActivating] = useState(false);

  async function activate() {
    setActivating(true);
    try {
      await requestJson("/api/admin/setup/complete", { method: "POST" }, { fallbackMessage: "فعال‌سازی فروشگاه انجام نشد." });
      toast.success("فروشگاه فعال شد", { description: "پنل مدیریت و سایت اکنون در دسترس هستند." });
      router.push("/admin");
      router.refresh();
    } catch (reason) {
      toast.danger("فعال‌سازی انجام نشد", { description: requestErrorMessage(reason, "همه گام‌ها را کامل کنید.") });
      setActivating(false);
    }
  }

  return (
    <div className="grid gap-3">
      <section className="bp-frame relative p-[16px]">
        <BpKicker>جمع‌بندی راه‌اندازی</BpKicker>
        <p className="bp-muted m-0 mt-1 text-[12px] leading-6">تا وقتی همهٔ گام‌ها کامل نشده باشند، فروشگاه فعال نمی‌شود.</p>
        <ul className="m-0 mt-3 grid list-none gap-2 p-0">
          {order.map((id) => (
            <li key={id}>
              <button
                type="button"
                onClick={() => onGoToStep(id)}
                className="flex w-full items-center gap-2.5 border border-[var(--bp-divider)] bg-[var(--bp-bg)] p-3 text-right text-[13px]"
              >
                {steps[id] ? <CheckCircle2 size={17} className="shrink-0 text-[var(--bp-success)]" /> : <CircleDashed size={17} className="bp-muted shrink-0" />}
                <span className="flex-1">{labels[id]}</span>
                <span className={`text-[11px] ${steps[id] ? "text-[var(--bp-success)]" : "bp-muted"}`}>{steps[id] ? "کامل" : "ناقص"}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="bp-frame relative flex flex-col gap-3 p-[16px] sm:flex-row sm:items-center sm:justify-between">
        <p className="bp-muted m-0 text-[12px] leading-6">با فعال‌سازی، سایت برای بازدیدکنندگان نمایش داده می‌شود و پنل کامل در دسترس قرار می‌گیرد.</p>
        <BpButton type="button" variant="primary" isPending={activating} disabled={!allStepsSatisfied} onClick={() => void activate()} className="gap-2 whitespace-nowrap">
          {!activating && <Rocket size={16} />}پایان و فعال‌سازی فروشگاه
        </BpButton>
      </section>
    </div>
  );
}
