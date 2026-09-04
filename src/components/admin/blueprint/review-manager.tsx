"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "@heroui/react";
import { Check, MessageCircleReply, Save, ShieldCheck, Trash2, X } from "lucide-react";
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";
import { reviewFieldLimits } from "@/modules/reviews/schemas";
import { reviewStatusLabels } from "@/modules/admin/labels";
import { BpButton } from "./ui/button";
import { BpKicker } from "./ui/card";
import { BpTag } from "./ui/tag";
import { BpTextarea } from "./ui/input";

type Props =
  | { mode: "review"; reviewId: string; status: "PENDING" | "APPROVED" | "REJECTED"; title: string; initialNote?: string; canReply: boolean }
  | { mode: "report"; reviewId: string; report: { id: string; status: "PENDING" | "RESOLVED" | "DISMISSED" } };

const statusTone = { PENDING: "warning", APPROVED: "success", REJECTED: "danger" } as const;

async function message(response: Response) {
  const payload = await response.json().catch(() => null) as { message?: string } | null;
  return payload?.message ?? "عملیات انجام نشد.";
}

export function BlueprintReviewManager(props: Props) {
  const router = useRouter();
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const busy = busyAction !== null;
  const [note, setNote] = useState(props.mode === "review" ? props.initialNote ?? "" : "");
  const [reply, setReply] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [error, setError] = useState("");

  async function request(url: string, init: RequestInit, action: string) {
    setBusyAction(action);
    setError("");
    try {
      const response = await fetch(url, init);
      const result = await message(response);
      if (!response.ok) throw new Error(result);
      toast.success(result);
      router.refresh();
      return true;
    } catch (caught) {
      const text = caught instanceof Error ? caught.message : "عملیات انجام نشد.";
      setError(text);
      toast.danger(text);
      return false;
    } finally {
      setBusyAction(null);
    }
  }

  if (props.mode === "report") {
    if (props.report.status !== "PENDING") {
      return <BpTag tone={props.report.status === "RESOLVED" ? "success" : "neutral"} className="mt-3">{props.report.status === "RESOLVED" ? "رسیدگی این گزارش تکمیل شده است" : "این گزارش رد شده است"}</BpTag>;
    }
    return (
      <div className="mt-3 flex flex-wrap gap-2 border-t border-[var(--bp-divider)] pt-3">
        <BpButton size="sm" isPending={busyAction === "resolve-report"} disabled={busy} onClick={() => void request(`/api/admin/review-reports/${props.report.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "RESOLVED" }) }, "resolve-report")} className="gap-1.5 text-[var(--bp-success)]"><ShieldCheck size={14} />تأیید رسیدگی</BpButton>
        <BpButton size="sm" isPending={busyAction === "dismiss-report"} disabled={busy} onClick={() => void request(`/api/admin/review-reports/${props.report.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "DISMISSED" }) }, "dismiss-report")} className="gap-1.5"><X size={14} />رد گزارش</BpButton>
      </div>
    );
  }

  async function moderate(status: "APPROVED" | "REJECTED") {
    await request(`/api/admin/reviews/${props.reviewId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status, note }) }, `moderate-${status}`);
  }

  async function submitReply() {
    if (await request(`/api/admin/reviews/${props.reviewId}/reply`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body: reply }) }, "reply")) setReply("");
  }

  async function remove() {
    if (await request(`/api/admin/reviews/${props.reviewId}`, { method: "DELETE" }, "delete")) {
      setDeleteOpen(false);
      router.push("/admin/reviews");
    }
  }

  return (
    <section className="bp-frame sticky top-5 overflow-hidden">
      <div className="border-b border-[var(--bp-divider)] p-[18px]">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center border border-[var(--bp-divider)] text-[var(--bp-accent)]"><ShieldCheck size={18} /></span>
          <div className="min-w-0 flex-1"><BpKicker>مدیریت دیدگاه</BpKicker><p className="bp-muted m-0 mt-1 text-[12px] leading-5">وضعیت انتشار و پاسخ رسمی فروشگاه را مدیریت کنید.</p></div>
        </div>
        <div className="mt-3 flex items-center justify-between border border-[var(--bp-divider)] px-3 py-2.5">
          <span className="bp-muted text-[12px]">وضعیت فعلی</span>
          <BpTag tone={statusTone[props.status]}>{reviewStatusLabels[props.status]}</BpTag>
        </div>
      </div>

      <div className="p-[18px]">
        {error && <p role="alert" className="m-0 mb-4 border border-[var(--bp-danger)] bg-[var(--bp-danger-bg)] p-3 text-[12px] leading-6 text-[var(--bp-danger)]">{error}</p>}

        <BpTextarea label="یادداشت مدیریت" value={note} onChange={(event) => setNote(event.target.value)} maxLength={reviewFieldLimits.moderationNote} rows={4} placeholder="دلیل تأیید یا رد را برای سابقه بررسی بنویسید" className="min-h-28" />

        <div className="mt-3 grid grid-cols-2 gap-2">
          <BpButton variant="primary" isPending={busyAction === "moderate-APPROVED"} disabled={busy || props.status === "APPROVED"} onClick={() => void moderate("APPROVED")} className="gap-1.5"><Check size={15} />تأیید انتشار</BpButton>
          <BpButton variant="danger" isPending={busyAction === "moderate-REJECTED"} disabled={busy || props.status === "REJECTED"} onClick={() => void moderate("REJECTED")} className="gap-1.5"><X size={15} />رد دیدگاه</BpButton>
        </div>

        {props.canReply && (
          <div className="mt-5 border-t border-[var(--bp-divider)] pt-4">
            <div className="mb-2 flex items-center gap-2"><MessageCircleReply size={15} className="text-[var(--bp-accent)]" /><strong className="text-[12px]">پاسخ رسمی فروشگاه</strong></div>
            <BpTextarea aria-label="متن پاسخ رسمی" value={reply} onChange={(event) => setReply(event.target.value)} maxLength={reviewFieldLimits.body} rows={6} placeholder="پاسخ مدیریت به دیدگاه کاربر" className="min-h-36" />
            <BpButton variant="primary" fullWidth isPending={busyAction === "reply"} disabled={busy || reply.trim().length < 3} onClick={() => void submitReply()} className="mt-2 gap-2"><Save size={15} />ثبت پاسخ مدیریت</BpButton>
          </div>
        )}

        <div className="mt-5 border-t border-[var(--bp-divider)] pt-4">
          <p className="bp-muted m-0 mb-3 text-[11px] leading-5">حذف دیدگاه، پاسخ‌ها، رأی‌ها و گزارش‌های مرتبط قابل بازگشت نیست.</p>
          <BpButton variant="danger" fullWidth disabled={busy} onClick={() => setDeleteOpen(true)} className="gap-2"><Trash2 size={15} />حذف کامل دیدگاه</BpButton>
        </div>
      </div>

      <DeleteConfirmDialog open={deleteOpen} title="حذف دیدگاه" itemName={props.title} description="دیدگاه، تمام پاسخ‌ها، رأی‌ها و گزارش‌های آن برای همیشه حذف می‌شوند." error={error} loading={busyAction === "delete"} onClose={() => setDeleteOpen(false)} onConfirm={() => void remove()} />
    </section>
  );
}
