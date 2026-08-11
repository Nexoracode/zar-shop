"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert, Button, Card, TextArea, toast } from "@heroui/react";
import { Check, MessageCircleReply, ShieldCheck, Trash2, X } from "lucide-react";
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";

type Props =
  | { mode: "review"; reviewId: string; status: "PENDING" | "APPROVED" | "REJECTED"; title: string; canReply: boolean }
  | { mode: "report"; reviewId: string; report: { id: string; status: "PENDING" | "RESOLVED" | "DISMISSED" } };

async function message(response: Response) { const payload = await response.json().catch(() => null) as { message?: string } | null; return payload?.message ?? "عملیات انجام نشد."; }

export function AdminReviewManager(props: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [reply, setReply] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [error, setError] = useState("");

  async function request(url: string, init: RequestInit) {
    setBusy(true); setError("");
    try {
      const response = await fetch(url, init);
      const result = await message(response);
      if (!response.ok) throw new Error(result);
      toast.success(result);
      router.refresh();
      return true;
    } catch (caught) { const text = caught instanceof Error ? caught.message : "عملیات انجام نشد."; setError(text); toast.danger(text); return false; }
    finally { setBusy(false); }
  }

  if (props.mode === "report") {
    if (props.report.status !== "PENDING") return <div className="mt-3 text-[10px] font-bold text-slate-400">وضعیت: {props.report.status === "RESOLVED" ? "رسیدگی‌شده" : "ردشده"}</div>;
    return <div className="mt-3 flex gap-2"><Button type="button" size="sm" variant="secondary" isDisabled={busy} onPress={() => void request(`/api/admin/review-reports/${props.report.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "RESOLVED" }) })} className="min-h-8 gap-1 bg-emerald-50 text-[10px] text-emerald-700"><ShieldCheck size={13} />رسیدگی شد</Button><Button type="button" size="sm" variant="secondary" isDisabled={busy} onPress={() => void request(`/api/admin/review-reports/${props.report.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "DISMISSED" }) })} className="min-h-8 gap-1 text-[10px]"><X size={13} />رد گزارش</Button></div>;
  }

  async function moderate(status: "APPROVED" | "REJECTED") { await request(`/api/admin/reviews/${props.reviewId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status, note }) }); }
  async function submitReply() { if (await request(`/api/admin/reviews/${props.reviewId}/reply`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body: reply }) })) setReply(""); }
  async function remove() { if (await request(`/api/admin/reviews/${props.reviewId}`, { method: "DELETE" })) { setDeleteOpen(false); router.push("/admin/reviews"); } }

  return <Card variant="secondary" className="sticky top-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm" dir="rtl">
    <h2 className="text-sm font-black">مدیریت دیدگاه</h2><p className="mb-5 mt-1 text-xs text-[var(--muted)]">نتیجه بررسی و پاسخ رسمی فروشگاه را از این بخش ثبت کنید.</p>
    {error && <Alert status="danger" className="mb-4"><Alert.Description>{error}</Alert.Description></Alert>}
    <label className="grid gap-1.5 text-xs font-bold text-slate-600">یادداشت مدیریت<TextArea value={note} onChange={(event) => setNote(event.target.value)} maxLength={500} rows={3} variant="secondary" placeholder="اختیاری؛ دلیل تأیید یا رد" /></label>
    <div className="mt-4 grid grid-cols-2 gap-2"><Button type="button" variant="primary" isPending={busy} onPress={() => void moderate("APPROVED")} className="min-h-10 gap-1.5 bg-emerald-600 text-xs text-white"><Check size={15} />تأیید</Button><Button type="button" variant="danger-soft" isDisabled={busy} onPress={() => void moderate("REJECTED")} className="min-h-10 gap-1.5 text-xs"><X size={15} />رد</Button></div>
    {props.canReply && <div className="mt-6 border-t border-slate-200 pt-5"><label className="grid gap-1.5 text-xs font-bold text-slate-600">پاسخ رسمی<TextArea value={reply} onChange={(event) => setReply(event.target.value)} minLength={3} maxLength={3000} rows={5} variant="secondary" placeholder="پاسخ مدیریت به دیدگاه" /></label><Button type="button" variant="primary" isPending={busy} isDisabled={reply.trim().length < 3} onPress={() => void submitReply()} className="mt-3 min-h-10 w-full gap-2 text-xs"><MessageCircleReply size={15} />ثبت پاسخ مدیریت</Button></div>}
    <Button type="button" variant="danger-soft" isDisabled={busy} onPress={() => setDeleteOpen(true)} className="mt-6 min-h-10 w-full gap-2 border-t border-rose-100 text-xs"><Trash2 size={15} />حذف کامل دیدگاه</Button>
    <DeleteConfirmDialog open={deleteOpen} title="حذف دیدگاه" itemName={props.title} description="دیدگاه، تمام پاسخ‌ها، رأی‌ها و گزارش‌های آن برای همیشه حذف می‌شوند." error={error} loading={busy} onClose={() => setDeleteOpen(false)} onConfirm={() => void remove()} />
  </Card>;
}
