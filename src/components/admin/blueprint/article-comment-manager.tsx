"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "@heroui/react";
import { Check, MessageCircleReply, Save, ShieldCheck, Trash2, X } from "lucide-react";
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";
import { commentFieldLimits } from "@/modules/article-comments/schemas";
import { articleCommentStatusLabels } from "@/modules/admin/labels";
import { BpButton } from "./ui/button";
import { BpKicker } from "./ui/card";
import { BpTag } from "./ui/tag";
import { BpTextarea } from "./ui/input";

type Props = { commentId: string; status: "PENDING" | "APPROVED" | "REJECTED"; excerpt: string; initialNote?: string; canReply: boolean };

const statusTone = { PENDING: "warning", APPROVED: "success", REJECTED: "danger" } as const;

async function message(response: Response) {
  const payload = await response.json().catch(() => null) as { message?: string } | null;
  return payload?.message ?? "عملیات انجام نشد.";
}

export function BlueprintArticleCommentManager(props: Props) {
  const router = useRouter();
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const busy = busyAction !== null;
  const [note, setNote] = useState(props.initialNote ?? "");
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

  async function moderate(status: "APPROVED" | "REJECTED") {
    await request(`/api/admin/article-comments/${props.commentId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status, note }) }, `moderate-${status}`);
  }

  async function submitReply() {
    if (await request(`/api/admin/article-comments/${props.commentId}/reply`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body: reply }) }, "reply")) setReply("");
  }

  async function remove() {
    if (await request(`/api/admin/article-comments/${props.commentId}`, { method: "DELETE" }, "delete")) {
      setDeleteOpen(false);
      router.push("/admin/article-comments");
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
          <BpTag tone={statusTone[props.status]}>{articleCommentStatusLabels[props.status]}</BpTag>
        </div>
      </div>

      <div className="p-[18px]">
        {error && <p role="alert" className="m-0 mb-4 border border-[var(--bp-danger)] bg-[var(--bp-danger-bg)] p-3 text-[12px] leading-6 text-[var(--bp-danger)]">{error}</p>}

        <BpTextarea label="یادداشت مدیریت" value={note} onChange={(event) => setNote(event.target.value)} maxLength={commentFieldLimits.moderationNote} rows={4} placeholder="دلیل تأیید یا رد را برای سابقه بررسی بنویسید" className="min-h-28" />

        <div className="mt-3 grid grid-cols-2 gap-2">
          <BpButton variant="primary" isPending={busyAction === "moderate-APPROVED"} disabled={busy || props.status === "APPROVED"} onClick={() => void moderate("APPROVED")} className="gap-1.5"><Check size={15} />تأیید انتشار</BpButton>
          <BpButton variant="danger" isPending={busyAction === "moderate-REJECTED"} disabled={busy || props.status === "REJECTED"} onClick={() => void moderate("REJECTED")} className="gap-1.5"><X size={15} />رد دیدگاه</BpButton>
        </div>

        {props.canReply && (
          <div className="mt-5 border-t border-[var(--bp-divider)] pt-4">
            <div className="mb-2 flex items-center gap-2"><MessageCircleReply size={15} className="text-[var(--bp-accent)]" /><strong className="text-[12px]">پاسخ رسمی فروشگاه</strong></div>
            <BpTextarea aria-label="متن پاسخ رسمی" value={reply} onChange={(event) => setReply(event.target.value)} maxLength={commentFieldLimits.body} rows={6} placeholder="پاسخ مدیریت به دیدگاه کاربر" className="min-h-36" />
            <BpButton variant="primary" fullWidth isPending={busyAction === "reply"} disabled={busy || reply.trim().length < 3} onClick={() => void submitReply()} className="mt-2 gap-2"><Save size={15} />ثبت پاسخ مدیریت</BpButton>
          </div>
        )}

        <div className="mt-5 border-t border-[var(--bp-divider)] pt-4">
          <p className="bp-muted m-0 mb-3 text-[11px] leading-5">حذف دیدگاه، پاسخ‌ها و رأی‌های مرتبط قابل بازگشت نیست.</p>
          <BpButton variant="danger" fullWidth disabled={busy} onClick={() => setDeleteOpen(true)} className="gap-2"><Trash2 size={15} />حذف کامل دیدگاه</BpButton>
        </div>
      </div>

      <DeleteConfirmDialog open={deleteOpen} title="حذف دیدگاه" itemName={props.excerpt} description="دیدگاه، تمام پاسخ‌ها و رأی‌های آن برای همیشه حذف می‌شوند." error={error} loading={busyAction === "delete"} onClose={() => setDeleteOpen(false)} onConfirm={() => void remove()} />
    </section>
  );
}
