import Link from "next/link";
import { notFound } from "next/navigation";
import { ClipboardList, CreditCard, ListChecks, Paperclip, ShoppingBag, UserRound, Wallet } from "lucide-react";
import { AdminPageHeader } from "@/components/admin-ui";
import { ReturnStatusPanel } from "@/components/admin/blueprint/return-status-panel";
import { BpTable, BpTd, BpTh } from "@/components/admin/blueprint/ui/table";
import { db } from "@/lib/db";
import { formatCardNumber, detectBankName, formatSheba } from "@/modules/account/bank-card";
import { formatDateTime, formatMoney } from "@/lib/format";
import { requirePermission } from "@/modules/auth/session";
import { returnAdminNoteMaxLength } from "@/modules/orders/returns";

type Context = { params: Promise<{ id: string }> };

function DetailItem({ label, value, ltr = false }: { label: string; value: string; ltr?: boolean }) {
  return (
    <div className="min-w-0">
      <span className="bp-muted block text-[11px] font-bold">{label}</span>
      <span dir={ltr ? "ltr" : "rtl"} className={`mt-1 block break-all text-[13px] font-bold ${ltr ? "text-left font-mono text-[11px]" : ""}`}>{value}</span>
    </div>
  );
}

export default async function AdminReturnDetailPage({ params }: Context) {
  await requirePermission("orders:manage");
  const { id } = await params;

  const returnRequest = await db.return.findUnique({
    where: { id },
    include: {
      order: {
        select: { id: true, orderNumber: true, total: true, createdAt: true },
      },
      items: {
        include: { orderItem: { select: { name: true, sku: true, quantity: true, total: true, unitPrice: true } } },
      },
      attachments: { select: { id: true, url: true, mimeType: true, originalName: true }, orderBy: { createdAt: "asc" } },
      user: { select: { firstName: true, lastName: true, phone: true, email: true } },
    },
  });
  if (!returnRequest) notFound();

  const { order } = returnRequest;
  const customerName = [returnRequest.user.firstName, returnRequest.user.lastName].filter(Boolean).join(" ") || "کاربر بدون نام";

  const computedRefund = returnRequest.items.reduce((sum, line) => sum + Math.min(line.quantity, line.orderItem.quantity) * Number(line.orderItem.unitPrice), 0);
  const refundAmount = returnRequest.refundAmount != null ? Number(returnRequest.refundAmount) : computedRefund;
  const isCardRefund = returnRequest.refundMethod === "BANK_CARD";

  return (
    <>
      <AdminPageHeader
        title={`درخواست مرجوعی سفارش ${order.orderNumber}`}
        description="اطلاعات مشتری و سفارش، دلیل کامل مرجوعی و مدیریت وضعیت درخواست."
        backHref="/admin/returns"
        backLabel="بازگشت به فهرست مرجوعی‌ها"
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid content-start gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <section className="bp-frame relative p-[18px]">
              <div className="mb-3 flex items-center gap-2"><UserRound size={16} className="text-[var(--bp-accent)]" /><h2 className="m-0 text-[13px] font-bold">مشتری</h2></div>
              <dl className="grid gap-3">
                <DetailItem label="نام" value={customerName} />
                <DetailItem label="شماره همراه" value={returnRequest.user.phone ?? "ثبت نشده"} ltr />
                <DetailItem label="ایمیل" value={returnRequest.user.email ?? "ثبت نشده"} ltr />
              </dl>
            </section>

            <section className="bp-frame relative p-[18px]">
              <div className="mb-3 flex items-center gap-2"><ShoppingBag size={16} className="text-[var(--bp-accent)]" /><h2 className="m-0 text-[13px] font-bold">سفارش مرتبط</h2></div>
              <dl className="grid gap-3">
                <div className="min-w-0">
                  <span className="bp-muted block text-[11px] font-bold">شماره سفارش</span>
                  <Link href={`/admin/orders/${order.id}`} dir="ltr" className="mt-1 block break-all text-left font-mono text-[12px] font-bold text-[var(--bp-accent)] hover:underline">{order.orderNumber}</Link>
                </div>
                <DetailItem label="مبلغ نهایی سفارش" value={formatMoney(order.total.toString())} />
                <DetailItem label="تاریخ ثبت سفارش" value={formatDateTime(order.createdAt)} />
                <DetailItem label="تاریخ ثبت درخواست" value={formatDateTime(returnRequest.createdAt)} />
                {returnRequest.resolvedAt && <DetailItem label="تاریخ رسیدگی" value={formatDateTime(returnRequest.resolvedAt)} />}
              </dl>
            </section>
          </div>

          <section className="bp-frame relative p-[18px]">
            <div className="mb-3 flex items-center gap-2">{isCardRefund ? <CreditCard size={16} className="text-[var(--bp-accent)]" /> : <Wallet size={16} className="text-[var(--bp-accent)]" />}<h2 className="m-0 text-[13px] font-bold">روش بازگرداندن وجه</h2></div>
            <dl className="grid gap-3 sm:grid-cols-2">
              <DetailItem label="روش انتخابی مشتری" value={isCardRefund ? "واریز به کارت بانکی" : "افزودن به کیف پول"} />
              <DetailItem label={returnRequest.refundedAt ? "مبلغ بازگردانده‌شده" : "مبلغ قابل بازگشت"} value={formatMoney(refundAmount.toString())} />
              {isCardRefund && (
                <>
                  <DetailItem label="شمارهٔ کارت" value={returnRequest.refundCardNumber ? `${formatCardNumber(returnRequest.refundCardNumber)}${detectBankName(returnRequest.refundCardNumber) ? ` — ${detectBankName(returnRequest.refundCardNumber)}` : ""}` : "ثبت نشده"} ltr />
                  <DetailItem label="نام صاحب کارت" value={returnRequest.refundCardHolder ?? "ثبت نشده"} />
                  {returnRequest.refundCardSheba && <DetailItem label="شمارهٔ شبا" value={formatSheba(returnRequest.refundCardSheba)} ltr />}
                </>
              )}
              {returnRequest.refundedAt && <DetailItem label="تاریخ بازگشت وجه" value={formatDateTime(returnRequest.refundedAt)} />}
            </dl>
            {isCardRefund && !returnRequest.refundedAt && (
              <p className="m-0 mt-3 rounded border border-[var(--bp-warning)] bg-[var(--bp-warning-bg)] p-3 text-[11px] leading-6 text-[var(--bp-warning)]">این مرجوعی باید به‌صورت دستی به کارت مشتری واریز شود. پس از واریز، دکمهٔ «تکمیل» را بزنید.</p>
            )}
          </section>

          <section className="bp-frame relative p-[18px]">
            <div className="mb-3 flex items-center gap-2"><ClipboardList size={16} className="text-[var(--bp-accent)]" /><h2 className="m-0 text-[13px] font-bold">دلیل مرجوعی</h2></div>
            <p className="m-0 whitespace-pre-wrap break-words text-[13px] leading-8">{returnRequest.reason}</p>
          </section>

          {returnRequest.attachments.length > 0 && (
            <section className="bp-frame relative p-[18px]">
              <div className="mb-3 flex items-center gap-2">
                <Paperclip size={16} className="text-[var(--bp-accent)]" />
                <h2 className="m-0 text-[13px] font-bold">عکس و فیلم پیوست مشتری</h2>
                <span className="bp-muted text-[11px]">{returnRequest.attachments.length.toLocaleString("fa-IR")} فایل</span>
              </div>
              <div className="flex flex-wrap gap-3">
                {returnRequest.attachments.map((file) => (
                  file.mimeType.startsWith("video/") ? (
                    <video key={file.id} src={file.url} controls preload="metadata" className="h-40 w-40 rounded border border-[var(--bp-divider)] bg-black object-cover" />
                  ) : (
                    <a key={file.id} href={file.url} target="_blank" rel="noreferrer" title={file.originalName} className="block h-40 w-40 overflow-hidden rounded border border-[var(--bp-divider)]">
                      {/* eslint-disable-next-line @next/next/no-img-element -- arbitrary user upload */}
                      <img src={file.url} alt={file.originalName} className="h-full w-full object-cover" />
                    </a>
                  )
                ))}
              </div>
            </section>
          )}

          <section className="bp-frame relative overflow-hidden">
            <div className="flex items-center gap-2 border-b border-[var(--bp-divider)] px-[18px] py-4">
              <ListChecks size={16} className="text-[var(--bp-accent)]" />
              <h2 className="m-0 text-[13px] font-bold">اقلام درخواست‌شده برای مرجوعی</h2>
              <span className="bp-muted text-[11px]">{returnRequest.items.length.toLocaleString("fa-IR")} قلم</span>
            </div>
            {returnRequest.items.length ? (
              <BpTable ariaLabel="اقلام درخواست مرجوعی" minWidth={520}>
                <thead>
                  <tr>
                    <BpTh className="w-10">#</BpTh>
                    <BpTh>نام کالا</BpTh>
                    <BpTh>SKU</BpTh>
                    <BpTh>تعداد مرجوعی</BpTh>
                    <BpTh>تعداد در سفارش</BpTh>
                  </tr>
                </thead>
                <tbody>
                  {returnRequest.items.map((item, index) => (
                    <tr key={item.id}>
                      <BpTd className="bp-muted">{(index + 1).toLocaleString("fa-IR")}</BpTd>
                      <BpTd className="max-w-[220px] truncate text-[13px]">{item.orderItem.name}</BpTd>
                      <BpTd className="text-[13px]"><span dir="ltr">{item.orderItem.sku}</span></BpTd>
                      <BpTd className="text-[13px] font-bold">{item.quantity.toLocaleString("fa-IR")}</BpTd>
                      <BpTd className="bp-muted text-[13px]">{item.orderItem.quantity.toLocaleString("fa-IR")}</BpTd>
                    </tr>
                  ))}
                </tbody>
              </BpTable>
            ) : (
              <p className="bp-muted m-0 px-[18px] py-8 text-center text-[13px]">قلمی برای این درخواست ثبت نشده است.</p>
            )}
          </section>
        </div>

        <aside className="grid content-start gap-4">
          <ReturnStatusPanel returnId={returnRequest.id} status={returnRequest.status} adminNote={returnRequest.adminNote} noteMaxLength={returnAdminNoteMaxLength} refundMethod={returnRequest.refundMethod} refundAmountLabel={formatMoney(refundAmount.toString())} refunded={Boolean(returnRequest.refundedAt)} />
        </aside>
      </div>
    </>
  );
}
