"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@heroui/react";
import { Check, CheckCheck, X, type LucideIcon } from "lucide-react";
import type { RefundMethod, ReturnStatus } from "@generated/prisma/enums";
import { BpButton } from "@/components/admin/blueprint/ui/button";
import { BpTextarea } from "@/components/admin/blueprint/ui/input";
import { BpTag } from "@/components/admin/blueprint/ui/tag";
import { requestErrorMessage, requestJson } from "@/lib/api-request";
import { returnStatusLabels, returnStatusTones } from "@/modules/admin/labels";

type DecisionStatus = "APPROVED" | "REJECTED" | "COMPLETED";

const actionsByStatus: Record<ReturnStatus, { status: DecisionStatus; label: string; variant: "primary" | "danger"; icon: LucideIcon }[]> = {
  PENDING: [
    { status: "APPROVED", label: "تأیید", variant: "primary", icon: Check },
    { status: "REJECTED", label: "رد", variant: "danger", icon: X },
  ],
  APPROVED: [
    { status: "COMPLETED", label: "تکمیل", variant: "primary", icon: CheckCheck },
    { status: "REJECTED", label: "رد", variant: "danger", icon: X },
  ],
  REJECTED: [],
  COMPLETED: [],
};

export function ReturnStatusPanel({ returnId, status, adminNote, noteMaxLength, refundMethod, refundAmountLabel, refunded }: { returnId: string; status: ReturnStatus; adminNote: string | null; noteMaxLength: number; refundMethod: RefundMethod; refundAmountLabel: string; refunded: boolean }) {
  const router = useRouter();
  const [note, setNote] = useState(adminNote ?? "");
  const [pending, setPending] = useState<DecisionStatus | null>(null);
  const actions = actionsByStatus[status];
  const isTerminal = actions.length === 0;
  const canComplete = actions.some((action) => action.status === "COMPLETED");

  async function submit(target: DecisionStatus) {
    setPending(target);
    try {
      await requestJson(`/api/admin/returns/${returnId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: target, adminNote: note.trim() ? note.trim() : null }),
      }, { fallbackMessage: "تغییر وضعیت انجام نشد." });
      toast.success(`درخواست مرجوعی «${returnStatusLabels[target]}» شد`);
      router.refresh();
    } catch (error) {
      toast.danger("تغییر وضعیت انجام نشد", { description: requestErrorMessage(error, "ارتباط با سرور برقرار نشد.") });
    } finally {
      setPending(null);
    }
  }

  return (
    <section className="bp-frame relative p-[18px]">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="m-0 text-[13px] font-bold">مدیریت درخواست</h2>
        <BpTag tone={returnStatusTones[status]} withDot>{returnStatusLabels[status]}</BpTag>
      </div>

      {isTerminal ? (
        <>
          <span className="bp-muted block text-[12px] font-bold">یادداشت مدیر</span>
          <p className="m-0 mt-1 whitespace-pre-wrap break-words border border-[var(--bp-divider)] bg-[var(--bp-bg)] p-3 text-[13px] leading-7">{adminNote?.trim() || "یادداشتی ثبت نشده است."}</p>
          <p className="bp-muted m-0 mt-3 text-[11px] leading-5">این درخواست در وضعیت نهایی است و تغییر بیشتری روی آن ممکن نیست.</p>
        </>
      ) : (
        <>
          <BpTextarea
            label="یادداشت مدیر"
            value={note}
            maxLength={noteMaxLength}
            onChange={(event) => setNote(event.target.value)}
            hint="این یادداشت همراه تصمیم شما ذخیره می‌شود."
            placeholder="توضیح تصمیم برای سوابق داخلی…"
            disabled={pending !== null}
          />
          {canComplete && !refunded && (
            <p className="m-0 mt-2 border border-[var(--bp-divider)] bg-[var(--bp-bg)] p-3 text-[11px] leading-6">
              {refundMethod === "WALLET"
                ? <>با «تکمیل»، مبلغ <b>{refundAmountLabel}</b> بلافاصله به کیف پول مشتری اضافه می‌شود.</>
                : <>پیش از «تکمیل»، مبلغ <b>{refundAmountLabel}</b> را دستی به کارت مشتری واریز کنید؛ تکمیل فقط وضعیت را نهایی می‌کند.</>}
            </p>
          )}
          <div className="mt-2 flex flex-wrap gap-2">
            {actions.map((action) => (
              <BpButton
                key={action.status}
                variant={action.variant}
                isPending={pending === action.status}
                disabled={pending !== null}
                onClick={() => void submit(action.status)}
                className="gap-2"
              >
                {pending !== action.status && <action.icon size={15} />}
                {action.label}
              </BpButton>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
