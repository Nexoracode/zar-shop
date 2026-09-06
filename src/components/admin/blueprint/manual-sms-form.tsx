"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@heroui/react";
import { Send, Trash2, UserRound, Users } from "lucide-react";
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";
import { AdminBulkCheckbox, AdminBulkEditor } from "@/components/admin-bulk-editor";
import { AdminEmptyState, AdminPanel } from "@/components/admin-ui";
import { normalizeNumericValue } from "@/lib/persian-numbers";
import { smsAudienceOptions, type SmsAudience } from "@/modules/communications/sms-audiences";
import { smsFieldLimits } from "@/modules/communications/limits";
import { BpButton, BpCheckbox, BpInput, BpKicker, BpSelect, BpTable, BpTag, BpTd, BpTextarea, BpTh } from "./ui";

export type SmsCampaignListItem = { id: string; audience: string; message: string; recipientCount: number; successfulCount: number; failedCount: number; status: string; createdAt: string };

function statusLabel(status: string) {
  return status === "SENT" ? "ارسال شد" : status === "FAILED" ? "ناموفق" : "در حال ارسال";
}

export function BlueprintManualSmsForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"AUDIENCE" | "DIRECT">("AUDIENCE");
  const [audience, setAudience] = useState<SmsAudience>("ALL_OPTED_IN");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [count, setCount] = useState<number | null>(null);
  const [sending, setSending] = useState(false);
  const phoneIsValid = /^09\d{9}$/.test(phone);

  useEffect(() => {
    if (mode !== "AUDIENCE") return;
    const controller = new AbortController();
    fetch(`/api/admin/sms/manual?audience=${audience}`, { signal: controller.signal })
      .then((response) => response.json())
      .then((result) => setCount(typeof result.count === "number" ? result.count : 0))
      .catch(() => undefined);
    return () => controller.abort();
  }, [audience, mode]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!confirmed) return;
    setSending(true);
    try {
      const body = mode === "DIRECT" ? { mode, phone, message } : { mode, audience, message };
      const response = await fetch("/api/admin/sms/manual", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.message ?? "ارسال انجام نشد.");
      toast.success("ارسال پیامک ثبت شد", { description: `${result.recipientCount.toLocaleString("fa-IR")} گیرنده` });
      router.push("/admin/settings/notifications/manual");
      router.refresh();
    } catch (error) {
      toast.danger("ارسال انجام نشد", { description: error instanceof Error ? error.message : "خطای ناشناخته" });
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-2">
      <section className="bp-frame relative p-[16px]">
        <BpKicker>ارسال دستی پیامک</BpKicker>
        <p className="bp-muted m-0 mt-1 text-[12px] leading-6">ارسال گروهی بر اساس رضایت کاربران یا ارسال مستقیم به یک شماره</p>

        <div className="mt-3 flex flex-wrap justify-start gap-2">
          <BpButton type="button" variant={mode === "AUDIENCE" ? "primary" : "secondary"} onClick={() => { setMode("AUDIENCE"); setCount(null); setConfirmed(false); }} className="gap-2"><Users size={16} />ارسال گروهی</BpButton>
          <BpButton type="button" variant={mode === "DIRECT" ? "primary" : "secondary"} onClick={() => { setMode("DIRECT"); setCount(1); setConfirmed(false); }} className="gap-2"><UserRound size={16} />ارسال به مخاطب خاص</BpButton>
        </div>

        <div className="mt-3 grid items-start gap-3 lg:grid-cols-2">
          <div className="grid gap-3">
            {mode === "AUDIENCE" ? (
              <>
                <BpSelect label="گروه مخاطبان" value={audience} onChange={(event) => { setCount(null); setAudience(event.target.value as SmsAudience); }} options={[...smsAudienceOptions]} />
                <p className="m-0 border border-[var(--bp-accent)] bg-[var(--bp-accent-100)] p-3 text-[12px] leading-6 text-[var(--bp-accent-800)]">{count === null ? "در حال محاسبه مخاطبان..." : `${count.toLocaleString("fa-IR")} کاربر واجد شرایط و دارای رضایت پیامک`}</p>
              </>
            ) : (
              <>
                <BpInput
                  label="شماره همراه"
                  required
                  inputMode="tel"
                  dir="ltr"
                  minLength={smsFieldLimits.phone}
                  maxLength={smsFieldLimits.phone}
                  value={phone}
                  onChange={(event) => setPhone(normalizeNumericValue(event.target.value, false).slice(0, smsFieldLimits.phone))}
                  placeholder="09123456789"
                />
                <p className={`m-0 border p-3 text-[12px] leading-6 ${phone && !phoneIsValid ? "border-[var(--bp-danger)] bg-[var(--bp-danger-bg)] text-[var(--bp-danger)]" : "border-[var(--bp-accent)] bg-[var(--bp-accent-100)] text-[var(--bp-accent-800)]"}`}>{phone && !phoneIsValid ? "شماره همراه باید ۱۱ رقم و با 09 شروع شود." : "پیام فقط برای همین شماره همراه ارسال می‌شود."}</p>
              </>
            )}
          </div>
          <div className="grid gap-3">
            <BpTextarea label="متن پیامک" required minLength={3} rows={5} maxLength={smsFieldLimits.message} value={message} onChange={(event) => setMessage(event.target.value)} />
            <BpCheckbox isSelected={confirmed} onChange={() => setConfirmed((value) => !value)} className="w-full items-center gap-3 border border-[var(--bp-divider)] bg-[var(--bp-bg)] p-3">
              <strong className="text-[13px] font-bold">{mode === "DIRECT" ? "شماره همراه و متن پیام را بررسی کردم" : "تعداد مخاطبان و متن پیام را بررسی کردم"}</strong>
            </BpCheckbox>
            <BpButton type="submit" variant="primary" fullWidth isPending={sending} disabled={!confirmed || !message.trim() || (mode === "DIRECT" ? !phoneIsValid : !count)} className="gap-2"><Send size={16} />ارسال پیامک</BpButton>
          </div>
        </div>
      </section>
    </form>
  );
}

export function BlueprintSmsCampaignList({ items }: { items: SmsCampaignListItem[] }) {
  const [campaigns, setCampaigns] = useState(items);
  const [pendingDelete, setPendingDelete] = useState<SmsCampaignListItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  async function remove() {
    if (!pendingDelete || deleting) return;
    setDeleting(true);
    setDeleteError("");
    try {
      const response = await fetch(`/api/admin/sms/manual?id=${encodeURIComponent(pendingDelete.id)}`, { method: "DELETE" });
      const result = response.status === 204 ? null : await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.message ?? "حذف پیام ناموفق بود.");
      setCampaigns((current) => current.filter((item) => item.id !== pendingDelete.id));
      setPendingDelete(null);
      toast.success("پیام از تاریخچه حذف شد");
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : "حذف پیام ناموفق بود.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <AdminPanel>
        {campaigns.length ? (
          <>
            <div className="md:hidden">
              {campaigns.map((item) => (
                <article key={item.id} className="border-b border-[var(--bp-row-line)] p-4 last:border-b-0">
                  <div className="flex items-start justify-between gap-3">
                    <p className="m-0 line-clamp-2 text-[13px] font-bold leading-6">{item.message}</p>
                    <BpTag className="shrink-0">{statusLabel(item.status)}</BpTag>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 border border-[var(--bp-divider)] bg-[var(--bp-bg)] p-3 text-[11px]">
                    <div><span className="bp-muted block">مخاطبان</span><strong className="mt-1 block">{item.recipientCount.toLocaleString("fa-IR")}</strong></div>
                    <div><span className="bp-muted block">موفق</span><strong className="mt-1 block text-[var(--bp-success)]">{item.successfulCount.toLocaleString("fa-IR")}</strong></div>
                    <div><span className="bp-muted block">ناموفق</span><strong className="mt-1 block text-[var(--bp-danger)]">{item.failedCount.toLocaleString("fa-IR")}</strong></div>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="bp-muted text-[10px]">{new Date(item.createdAt).toLocaleString("fa-IR")}</span>
                    <BpButton type="button" variant="ghost" className="bp-btn-danger-icon" isIconOnly size="sm" aria-label="حذف پیام از تاریخچه" onClick={() => { setDeleteError(""); setPendingDelete(item); }}><Trash2 size={15} strokeWidth={1.5} /></BpButton>
                  </div>
                </article>
              ))}
            </div>

            <AdminBulkEditor
              entity="smsCampaigns"
              entityLabel="رکورد پیامک"
              ids={campaigns.map((item) => item.id)}
              actions={[{ value: "delete", label: "حذف رکوردهای انتخاب‌شده", confirmation: { title: "حذف گروهی تاریخچه پیامک", description: "این عملیات فقط رکوردهای پنل را حذف می‌کند؛ پیامک‌های ارسال‌شده قابل لغو یا بازگردانی نیستند.", confirmLabel: "حذف از تاریخچه" } }]}
              onCompleted={({ ids }) => setCampaigns((current) => current.filter((item) => !ids.includes(item.id)))}
            >
              <BpTable ariaLabel="تاریخچه ارسال دستی پیامک" minWidth={880}>
                <thead>
                  <tr>
                    <BpTh className="w-10 text-center"><span className="sr-only">انتخاب</span></BpTh>
                    <BpTh>متن پیام</BpTh>
                    <BpTh>مخاطبان</BpTh>
                    <BpTh>موفق</BpTh>
                    <BpTh>ناموفق</BpTh>
                    <BpTh>وضعیت</BpTh>
                    <BpTh>زمان ارسال</BpTh>
                    <BpTh className="text-center">عملیات</BpTh>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((item) => (
                    <tr key={item.id}>
                      <BpTd className="w-10 text-center"><AdminBulkCheckbox id={item.id} label={`انتخاب پیام ${item.message.slice(0, 40)}`} /></BpTd>
                      <BpTd className="max-w-[280px] truncate font-bold" title={item.message}>{item.message}</BpTd>
                      <BpTd>{item.recipientCount.toLocaleString("fa-IR")}</BpTd>
                      <BpTd className="text-[var(--bp-success)]">{item.successfulCount.toLocaleString("fa-IR")}</BpTd>
                      <BpTd className="bp-btn-danger-icon">{item.failedCount.toLocaleString("fa-IR")}</BpTd>
                      <BpTd><BpTag>{statusLabel(item.status)}</BpTag></BpTd>
                      <BpTd className="bp-muted">{new Date(item.createdAt).toLocaleString("fa-IR")}</BpTd>
                      <BpTd className="text-center"><BpButton type="button" variant="ghost" className="bp-btn-danger-icon" isIconOnly size="sm" aria-label="حذف پیام از تاریخچه" onClick={() => { setDeleteError(""); setPendingDelete(item); }}><Trash2 size={15} strokeWidth={1.5} /></BpButton></BpTd>
                    </tr>
                  ))}
                </tbody>
              </BpTable>
            </AdminBulkEditor>
          </>
        ) : <AdminEmptyState title="ارسال دستی ثبت نشده" description="هنوز هیچ پیامک دستی‌ای برای فروشگاه ارسال نشده است." />}
      </AdminPanel>

      <DeleteConfirmDialog
        open={Boolean(pendingDelete)}
        title="حذف پیام از تاریخچه"
        itemName={pendingDelete?.message}
        description="این رکورد فقط از تاریخچه پنل حذف می‌شود و پیامکی که قبلاً ارسال شده قابل بازگردانی یا لغو نیست."
        error={deleteError}
        loading={deleting}
        onClose={() => { if (!deleting) setPendingDelete(null); }}
        onConfirm={() => void remove()}
      />
    </>
  );
}
