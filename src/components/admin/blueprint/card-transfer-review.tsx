"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "@heroui/react";
import { ArrowLeftRight, Check, ExternalLink, FileText, ImageIcon, X } from "lucide-react";
import { formatDateTime, formatMoney } from "@/lib/format";
import { formatCardNumber } from "@/modules/account/bank-card";
import { cardToCardLimits, type AdminCardTransfer } from "@/modules/payments/card-to-card-shared";
import { BpButton, BpDialog, BpTag, BpTextarea, type BpTagTone } from "./ui";

const statusTag: Record<AdminCardTransfer["status"], { label: string; tone: BpTagTone }> = {
  INITIATED: { label: "در انتظار ارسال رسید", tone: "neutral" },
  PENDING: { label: "در انتظار تأیید شما", tone: "warning" },
  SUCCESS: { label: "تأییدشده", tone: "success" },
  FAILED: { label: "ردشده", tone: "danger" },
  CANCELLED: { label: "لغوشده", tone: "neutral" },
  REFUNDED: { label: "بازپرداخت‌شده", tone: "info" },
};

function Fact({ label, children, ltr = false }: { label: string; children: React.ReactNode; ltr?: boolean }) {
  return (
    <div className="min-w-0 border border-[var(--bp-divider)] px-3 py-2">
      <dt className="bp-muted text-[11px]">{label}</dt>
      <dd dir={ltr ? "ltr" : undefined} className="m-0 mt-0.5 break-words text-[13px] font-bold">{children || "—"}</dd>
    </div>
  );
}

/**
 * One card-to-card transfer as the admin reviews it: the proof the customer sent (receipt image or
 * source card + tracking code), what the transfer should be worth, and — while it is still waiting —
 * the two decisions. Approving settles the order exactly as a gateway payment would; rejecting
 * needs a reason, which the customer sees.
 */
export function BlueprintCardTransferReview({ orderId, transfer }: { orderId: string; transfer: AdminCardTransfer }) {
  const router = useRouter();
  const [dialog, setDialog] = useState<"approve" | "reject" | null>(null);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState("");
  const [pending, setPending] = useState(false);
  const tag = statusTag[transfer.status];
  const waiting = transfer.status === "PENDING";

  function close() {
    if (pending) return;
    setDialog(null);
    setReasonError("");
  }

  async function decide(action: "approve" | "reject") {
    if (action === "reject" && reason.trim().length < 3) {
      setReasonError("دلیل رد را وارد کنید تا مشتری بداند چه چیزی را باید اصلاح کند.");
      return;
    }
    setPending(true);
    try {
      const response = await fetch(`/api/admin/orders/${orderId}/card-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action === "approve" ? { action, paymentId: transfer.paymentId } : { action, paymentId: transfer.paymentId, reason: reason.trim() }),
      });
      const result = await response.json().catch(() => null) as { message?: string; issues?: { reason?: string[] } } | null;
      if (!response.ok) {
        if (result?.issues?.reason?.[0]) setReasonError(result.issues.reason[0]);
        throw new Error(result?.message ?? "ثبت تصمیم انجام نشد.");
      }
      toast.success(action === "approve" ? "پرداخت تأیید شد" : "پرداخت رد شد", { description: action === "approve" ? "سفارش پرداخت‌شده ثبت و فاکتور آن صادر شد." : "دلیل رد برای مشتری ارسال شد و می‌تواند دوباره رسید بفرستد." });
      setDialog(null);
      setReason("");
      router.refresh();
    } catch (error) {
      toast.danger(action === "approve" ? "تأیید پرداخت انجام نشد" : "رد پرداخت انجام نشد", { description: error instanceof Error ? error.message : "خطای ناشناخته" });
    } finally {
      setPending(false);
    }
  }

  return (
    <article className={`border ${waiting ? "border-[var(--bp-warning)]" : "border-[var(--bp-divider)]"}`}>
      <div className={`flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 ${waiting ? "bg-[var(--bp-warning-bg)]" : "bg-[var(--bp-hover)]"}`}>
        <div className="flex items-center gap-2">
          <span className="text-[var(--bp-muted)]"><ArrowLeftRight size={16} /></span>
          <div>
            <span className="bp-muted block text-[11px]">مبلغ مورد انتظار واریز</span>
            <strong className="mt-0.5 block text-[13px]">{formatMoney(transfer.amount)}</strong>
          </div>
        </div>
        <BpTag tone={tag.tone} withDot>{tag.label}</BpTag>
      </div>

      <div className="grid gap-3 border-t border-[var(--bp-divider)] p-3 md:grid-cols-[minmax(0,220px)_minmax(0,1fr)]">
        {transfer.receipt ? (
          <a href={transfer.receipt.url} target="_blank" rel="noopener noreferrer" aria-label="مشاهدهٔ رسید در اندازهٔ کامل" className="group relative block h-56 overflow-hidden border border-[var(--bp-divider)] bg-white md:h-full md:min-h-52">
            <Image src={transfer.receipt.url} alt="رسید پرداخت مشتری" fill unoptimized sizes="220px" className="object-contain p-1" />
            <span className="absolute bottom-1.5 start-1.5 inline-flex items-center gap-1 bg-[var(--bp-bg)]/90 px-2 py-1 text-[11px] font-bold opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"><ExternalLink size={12} />اندازهٔ کامل</span>
          </a>
        ) : (
          <div className="bp-muted flex min-h-24 flex-col items-center justify-center gap-1.5 border border-dashed border-[var(--bp-divider)] p-4 text-center text-[12px]">
            <FileText size={22} />
            مشتری رسید بارگذاری نکرده و اطلاعات پرداخت را وارد کرده است.
          </div>
        )}
        <dl className="m-0 grid content-start gap-2 sm:grid-cols-2">
          <Fact label="نوع اطلاعات ارسالی">{transfer.receipt ? <span className="inline-flex items-center gap-1.5"><ImageIcon size={14} />تصویر رسید</span> : <span className="inline-flex items-center gap-1.5"><FileText size={14} />شماره کارت و کد رهگیری</span>}</Fact>
          <Fact label="زمان ارسال">{transfer.submittedAt ? formatDateTime(transfer.submittedAt) : ""}</Fact>
          {!transfer.receipt && <Fact label="شماره کارت مبدأ" ltr>{transfer.sourceCardNumber ? formatCardNumber(transfer.sourceCardNumber) : ""}</Fact>}
          {!transfer.receipt && <Fact label="کد رهگیری پرداخت" ltr>{transfer.trackingCode}</Fact>}
          {transfer.reviewedAt && <Fact label="زمان بررسی">{formatDateTime(transfer.reviewedAt)}</Fact>}
          {transfer.rejectionReason && <div className="sm:col-span-2"><Fact label="دلیل رد">{transfer.rejectionReason}</Fact></div>}
        </dl>
      </div>

      {waiting && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--bp-divider)] p-3">
          <p className="bp-muted m-0 text-[12px] leading-6">پس از مطابقت‌دادن رسید با حساب بانکی، پرداخت را تأیید یا رد کنید.</p>
          <div className="flex gap-2">
            <BpButton variant="danger" onClick={() => setDialog("reject")}><X size={15} />رد پرداخت</BpButton>
            <BpButton variant="primary" onClick={() => setDialog("approve")}><Check size={15} />تأیید پرداخت</BpButton>
          </div>
        </div>
      )}

      <BpDialog
        open={dialog === "approve"}
        onClose={close}
        title="تأیید پرداخت کارت‌به‌کارت"
        description={`با تأیید، این پرداخت موفق ثبت می‌شود، سفارش «پرداخت‌شده» می‌شود و فاکتور صادر می‌گردد. مطمئن هستید مبلغ ${formatMoney(transfer.amount)} به حساب فروشگاه واریز شده است؟`}
        actions={<>
          <BpButton variant="ghost" onClick={close} disabled={pending}>انصراف</BpButton>
          <BpButton variant="primary" isPending={pending} onClick={() => void decide("approve")}>تأیید و ثبت پرداخت</BpButton>
        </>}
      />

      <BpDialog
        open={dialog === "reject"}
        onClose={close}
        title="رد پرداخت کارت‌به‌کارت"
        description="دلیل رد برای مشتری نمایش داده می‌شود و او می‌تواند رسید یا اطلاعات درست را دوباره ارسال کند."
        actions={<>
          <BpButton variant="ghost" onClick={close} disabled={pending}>انصراف</BpButton>
          <BpButton variant="danger" isPending={pending} onClick={() => void decide("reject")}>رد پرداخت</BpButton>
        </>}
      >
        <BpTextarea
          label="دلیل رد"
          required
          rows={4}
          maxLength={cardToCardLimits.rejectionReasonMax}
          value={reason}
          error={reasonError}
          placeholder="مثلاً مبلغ رسید با مبلغ سفارش مطابقت ندارد یا واریزی در حساب فروشگاه دیده نمی‌شود."
          onChange={(event) => { setReason(event.target.value); setReasonError(""); }}
        />
      </BpDialog>
    </article>
  );
}
