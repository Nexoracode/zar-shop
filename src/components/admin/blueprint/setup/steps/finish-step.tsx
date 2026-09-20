"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@heroui/react";
import { CheckCircle2, CircleAlert, Pencil, Rocket } from "lucide-react";
import { requestErrorMessage, requestJson } from "@/lib/api-request";
import type { SetupStepId } from "@/modules/settings/setup-schemas";
import { BpButton, BpTag } from "../../ui";
import { SetupFooter, SetupSection } from "../setup-ui";

type Props = {
  steps: Record<SetupStepId, boolean>;
  labels: Record<SetupStepId, string>;
  order: SetupStepId[];
  allStepsSatisfied: boolean;
  onBack?: () => void;
  onGoToStep: (step: SetupStepId) => void;
};

export function SetupFinishStep({ steps, labels, order, allStepsSatisfied, onBack, onGoToStep }: Props) {
  const router = useRouter();
  const [activating, setActivating] = useState(false);
  const missing = order.filter((id) => !steps[id]);

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
    <div>
      <SetupSection
        title={allStepsSatisfied ? "همه‌چیز آماده است" : `${missing.length.toLocaleString("fa-IR")} گام هنوز کامل نشده`}
        description={allStepsSatisfied
          ? "همهٔ گام‌ها کامل‌اند. اگر می‌خواهید چیزی را عوض کنید روی «ویرایش» بزنید؛ وگرنه فروشگاه را فعال کنید."
          : "تا هر گام ناقص را کامل نکنید، فروشگاه فعال نمی‌شود. روی «تکمیل» کنار هر گام بزنید تا به همان‌جا بروید."}
      >
        <ul className="m-0 grid list-none gap-2 p-0">
          {order.map((id) => {
            const done = steps[id];
            return (
              <li key={id} className={`flex flex-wrap items-center gap-3 rounded-[var(--bp-radius-sm)] border p-3 ${done ? "border-[var(--bp-divider)] bg-[var(--bp-bg)]" : "border-[var(--bp-warning)] bg-[var(--bp-warning-bg)]"}`}>
                {done
                  ? <CheckCircle2 size={18} className="shrink-0 text-[var(--bp-success)]" aria-hidden />
                  : <CircleAlert size={18} className="shrink-0 text-[var(--bp-warning)]" aria-hidden />}
                <strong className="min-w-0 flex-1 text-[13px]">{labels[id]}</strong>
                <BpTag tone={done ? "success" : "warning"}>{done ? "کامل" : "ناقص"}</BpTag>
                <BpButton type="button" size="sm" variant={done ? "ghost" : "secondary"} onClick={() => onGoToStep(id)} className="gap-1.5">
                  <Pencil size={13} aria-hidden />{done ? "ویرایش" : "تکمیل"}
                </BpButton>
              </li>
            );
          })}
        </ul>
      </SetupSection>

      <SetupSection title="بعد از فعال‌سازی چه می‌شود؟">
        <ul className="bp-muted m-0 grid list-disc gap-1.5 ps-5 text-[12.5px] leading-7">
          <li>سایت فروشگاه برای همهٔ بازدیدکننده‌ها باز می‌شود.</li>
          <li>پنل مدیریت کامل در دسترس شما و همکارانتان قرار می‌گیرد.</li>
          <li>محصولات، دسته‌بندی‌ها و بقیهٔ تنظیمات را بعداً از خود پنل مدیریت می‌کنید.</li>
        </ul>
      </SetupSection>

      <SetupFooter
        onBack={onBack}
        hint={allStepsSatisfied ? undefined : "ابتدا گام‌های ناقص را کامل کنید."}
        primary={
          <BpButton type="button" variant="primary" isPending={activating} disabled={!allStepsSatisfied} onClick={() => void activate()} className="gap-2 whitespace-nowrap">
            {!activating && <Rocket size={16} aria-hidden />}فعال‌سازی فروشگاه
          </BpButton>
        }
      />
    </div>
  );
}
