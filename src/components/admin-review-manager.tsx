"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert, Button, Card, Label, TextArea, toast } from "@heroui/react";
import { Check, MessageCircleReply, Save, ShieldCheck, Trash2, X } from "lucide-react";
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";

type Props =
  | { mode: "review"; reviewId: string; status: "PENDING" | "APPROVED" | "REJECTED"; title: string; initialNote?: string; canReply: boolean }
  | { mode: "report"; reviewId: string; report: { id: string; status: "PENDING" | "RESOLVED" | "DISMISSED" } };

const statusLabel = { PENDING: "در انتظار بررسی", APPROVED: "تأییدشده", REJECTED: "ردشده" } as const;
const statusClass = { PENDING: "bg-amber-50 text-amber-700", APPROVED: "bg-emerald-50 text-emerald-700", REJECTED: "bg-rose-50 text-rose-700" } as const;

async function message(response: Response) {
  const payload = await response.json().catch(() => null) as { message?: string } | null;
  return payload?.message ?? "عملیات انجام نشد.";
}

export function AdminReviewManager(props: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState(props.mode === "review" ? props.initialNote ?? "" : "");
  const [reply, setReply] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [error, setError] = useState("");

  async function request(url: string, init: RequestInit) {
    setBusy(true);
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
      setBusy(false);
    }
  }

  if (props.mode === "report") {
    if (props.report.status !== "PENDING") {
      return <div className={`mt-4 inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold ${props.report.status === "RESOLVED" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{props.report.status === "RESOLVED" ? "رسیدگی این گزارش تکمیل شده است" : "این گزارش رد شده است"}</div>;
    }
    return (
      <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
        <Button type="button" size="sm" variant="secondary" isDisabled={busy} onPress={() => void request(`/api/admin/review-reports/${props.report.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "RESOLVED" }) })} className="min-h-9 gap-1.5 bg-emerald-50 text-xs font-bold text-emerald-700"><ShieldCheck size={14} />تأیید رسیدگی</Button>
        <Button type="button" size="sm" variant="secondary" isDisabled={busy} onPress={() => void request(`/api/admin/review-reports/${props.report.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "DISMISSED" }) })} className="min-h-9 gap-1.5 text-xs font-bold"><X size={14} />رد گزارش</Button>
      </div>
    );
  }

  async function moderate(status: "APPROVED" | "REJECTED") {
    await request(`/api/admin/reviews/${props.reviewId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status, note }) });
  }

  async function submitReply() {
    if (await request(`/api/admin/reviews/${props.reviewId}/reply`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body: reply }) })) setReply("");
  }

  async function remove() {
    if (await request(`/api/admin/reviews/${props.reviewId}`, { method: "DELETE" })) {
      setDeleteOpen(false);
      router.push("/admin/reviews");
    }
  }

  return (
    <Card variant="secondary" className="sticky top-5 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm" dir="rtl">
      <div className="border-b border-slate-100 p-5">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--accent)]/10 text-[var(--accent)]"><ShieldCheck size={19} /></span>
          <div className="min-w-0 flex-1"><h2 className="m-0 text-sm font-bold text-slate-800">مدیریت دیدگاه</h2><p className="mb-0 mt-1 text-xs leading-5 text-[var(--muted)]">وضعیت انتشار و پاسخ رسمی فروشگاه را مدیریت کنید.</p></div>
        </div>
        <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5"><span className="text-xs text-slate-400">وضعیت فعلی</span><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${statusClass[props.status]}`}>{statusLabel[props.status]}</span></div>
      </div>

      <div className="p-5">
        {error && <Alert status="danger" className="mb-4"><Alert.Description>{error}</Alert.Description></Alert>}
        <div className="grid gap-1.5">
          <Label className="text-xs font-bold text-slate-600">یادداشت مدیریت</Label>
          <TextArea value={note} onChange={(event) => setNote(event.target.value)} maxLength={500} rows={4} variant="secondary" placeholder="دلیل تأیید یا رد را برای سابقه بررسی بنویسید" className="min-h-28" />
          <span className="text-left text-[10px] text-slate-400" dir="ltr">{note.length.toLocaleString("fa-IR")} / ۵۰۰</span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button type="button" variant="primary" isPending={busy} isDisabled={busy || props.status === "APPROVED"} onPress={() => void moderate("APPROVED")} className="min-h-10 gap-1.5 bg-emerald-600 text-xs font-bold text-white"><Check size={15} />تأیید انتشار</Button>
          <Button type="button" variant="danger-soft" isDisabled={busy || props.status === "REJECTED"} onPress={() => void moderate("REJECTED")} className="min-h-10 gap-1.5 text-xs font-bold"><X size={15} />رد دیدگاه</Button>
        </div>

        {props.canReply && <div className="mt-6 border-t border-slate-100 pt-5"><div className="mb-3 flex items-center gap-2"><MessageCircleReply size={16} className="text-[var(--accent)]" /><strong className="text-xs text-slate-700">پاسخ رسمی فروشگاه</strong></div><div className="grid gap-1.5"><Label className="sr-only">متن پاسخ رسمی</Label><TextArea value={reply} onChange={(event) => setReply(event.target.value)} minLength={3} maxLength={3000} rows={6} variant="secondary" placeholder="پاسخ مدیریت به دیدگاه کاربر" className="min-h-36" /></div><Button type="button" variant="primary" isPending={busy} isDisabled={busy || reply.trim().length < 3} onPress={() => void submitReply()} className="mt-3 min-h-10 w-full gap-2 text-xs font-bold"><Save size={15} />ثبت پاسخ مدیریت</Button></div>}

        <div className="mt-6 border-t border-rose-100 pt-5"><p className="mb-3 text-[11px] leading-5 text-slate-400">حذف دیدگاه، پاسخ‌ها، رأی‌ها و گزارش‌های مرتبط قابل بازگشت نیست.</p><Button type="button" variant="danger-soft" isDisabled={busy} onPress={() => setDeleteOpen(true)} className="min-h-10 w-full gap-2 text-xs font-bold"><Trash2 size={15} />حذف کامل دیدگاه</Button></div>
      </div>

      <DeleteConfirmDialog open={deleteOpen} title="حذف دیدگاه" itemName={props.title} description="دیدگاه، تمام پاسخ‌ها، رأی‌ها و گزارش‌های آن برای همیشه حذف می‌شوند." error={error} loading={busy} onClose={() => setDeleteOpen(false)} onConfirm={() => void remove()} />
    </Card>
  );
}
