import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftRight, Clock3, CreditCard, FileText, ListChecks, ShoppingBag, UserRound, Wallet } from "lucide-react";
import { AdminPageHeader } from "@/components/admin-ui";
import { BpKicker } from "@/components/admin/blueprint/ui/card";
import { BpTable, BpTd, BpTh } from "@/components/admin/blueprint/ui/table";
import { BpTag } from "@/components/admin/blueprint/ui/tag";
import { db } from "@/lib/db";
import { formatDateTime, formatMoney } from "@/lib/format";
import { orderStatusLabels, orderStatusTones, paymentStatusLabels, paymentStatusTones } from "@/modules/admin/labels";
import { sanitizeAuditMetadata } from "@/modules/audit/audit-log";
import { requirePermission } from "@/modules/auth/session";
import { paymentProviderLabel } from "@/modules/payments/admin-payments";

type Context = { params: Promise<{ id: string }> };

export default async function PaymentDetailPage({ params }: Context) {
  await requirePermission("orders:manage");
  const { id } = await params;

  const payment = await db.payment.findUnique({
    where: { id },
    include: {
      order: {
        include: {
          user: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } },
          items: { select: { id: true, name: true, sku: true, quantity: true, unitPrice: true, total: true } },
          invoice: { select: { invoiceNumber: true, status: true, issuedAt: true } },
          payments: { select: { id: true, provider: true, amount: true, status: true, paidAt: true, createdAt: true }, orderBy: { createdAt: "asc" } },
        },
      },
    },
  });
  if (!payment) notFound();

  const { order } = payment;
  const customerName = [order.user.firstName, order.user.lastName].filter(Boolean).join(" ") || "کاربر بدون نام";
  const amountMatchesOrder = Number(payment.amount) === Number(order.total);
  const siblingPayments = order.payments.filter((row) => row.id !== payment.id);
  // Redact any credential-shaped keys before showing the raw gateway payload.
  const providerData = payment.providerData == null ? null : sanitizeAuditMetadata(payment.providerData);

  return (
    <>
      <AdminPageHeader
        title={`جزئیات پرداخت سفارش ${order.orderNumber}`}
        description="اطلاعات کامل تراکنش، تطبیق مبلغ با سفارش، اقلام و داده خام درگاه."
        backHref="/admin/payments"
        backLabel="بازگشت به فهرست پرداخت‌ها"
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid content-start gap-4">
          <section className="bp-frame relative p-[18px]">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <span className="flex items-center gap-3">
                <span className="grid size-11 place-items-center border border-[var(--bp-divider)] text-[var(--bp-accent)]"><CreditCard size={19} /></span>
                <span><BpKicker>درگاه پرداخت</BpKicker><strong className="mt-1 block text-[14px]">{paymentProviderLabel(payment.provider)}</strong></span>
              </span>
              <BpTag tone={paymentStatusTones[payment.status]} withDot>{paymentStatusLabels[payment.status]}</BpTag>
            </div>
            <dl className="grid gap-3 border border-[var(--bp-divider)] bg-[var(--bp-bg)] p-3 sm:grid-cols-2">
              <DetailItem label="مبلغ پرداخت" value={formatMoney(payment.amount.toString())} />
              <DetailItem label="کد فنی درگاه" value={payment.provider} ltr />
              <DetailItem label="شناسه مرجع تراکنش" value={payment.referenceId ?? "ثبت نشده"} ltr />
              <DetailItem label="کد Authority" value={payment.authority ?? "ثبت نشده"} ltr />
              <DetailItem label="شناسه پرداخت" value={payment.id} ltr />
              <DetailItem label="زمان پرداخت موفق" value={payment.paidAt ? formatDateTime(payment.paidAt) : "پرداخت نشده"} />
            </dl>
            <div className={`mt-3 flex items-start gap-2 border p-3 text-[12px] leading-6 ${amountMatchesOrder ? "border-[var(--bp-success)] bg-[var(--bp-success-bg)] text-[var(--bp-success)]" : "border-[var(--bp-warning)] bg-[var(--bp-warning-bg)] text-[var(--bp-warning)]"}`}>
              <ArrowLeftRight size={15} className="mt-0.5 shrink-0" />
              <span>
                {amountMatchesOrder
                  ? "مبلغ این پرداخت با مبلغ نهایی سفارش برابر است."
                  : `مغایرت مبلغ: پرداخت ${formatMoney(payment.amount.toString())} در برابر مبلغ سفارش ${formatMoney(order.total.toString())}.`}
              </span>
            </div>
          </section>

          <section className="bp-frame relative overflow-hidden">
            <div className="flex items-center gap-2 border-b border-[var(--bp-divider)] px-[18px] py-4">
              <ListChecks size={16} className="text-[var(--bp-accent)]" />
              <h2 className="m-0 text-[13px] font-bold">اقلام سفارش</h2>
              <span className="bp-muted text-[11px]">{order.items.length.toLocaleString("fa-IR")} قلم</span>
            </div>
            {order.items.length ? (
              <BpTable ariaLabel="اقلام سفارش این پرداخت" minWidth={520}>
                <thead>
                  <tr>
                    <BpTh className="w-10">#</BpTh>
                    <BpTh>نام کالا</BpTh>
                    <BpTh>SKU</BpTh>
                    <BpTh>تعداد</BpTh>
                    <BpTh>قیمت واحد</BpTh>
                    <BpTh>جمع</BpTh>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item, index) => (
                    <tr key={item.id}>
                      <BpTd className="bp-muted">{(index + 1).toLocaleString("fa-IR")}</BpTd>
                      <BpTd className="max-w-[220px] truncate text-[13px]">{item.name}</BpTd>
                      <BpTd className="text-[13px]"><span dir="ltr">{item.sku}</span></BpTd>
                      <BpTd className="text-[13px]">{item.quantity.toLocaleString("fa-IR")}</BpTd>
                      <BpTd className="whitespace-nowrap text-[13px]">{formatMoney(item.unitPrice.toString())}</BpTd>
                      <BpTd className="whitespace-nowrap text-[13px] font-bold">{formatMoney(item.total.toString())}</BpTd>
                    </tr>
                  ))}
                </tbody>
              </BpTable>
            ) : (
              <p className="bp-muted m-0 px-[18px] py-8 text-center text-[13px]">این سفارش قلمی ندارد.</p>
            )}
          </section>

          <section className="bp-frame relative p-[18px]">
            <div className="mb-3 flex items-center gap-2"><FileText size={16} className="text-[var(--bp-accent)]" /><h2 className="m-0 text-[13px] font-bold">داده خام درگاه</h2></div>
            {providerData != null ? (
              <pre dir="ltr" className="m-0 max-h-96 overflow-auto whitespace-pre-wrap break-words border border-[var(--bp-divider)] bg-[var(--bp-bg)] p-3 text-left font-mono text-[11px] leading-6">
                {JSON.stringify(providerData, null, 2)}
              </pre>
            ) : (
              <p className="bp-muted m-0 border border-[var(--bp-divider)] bg-[var(--bp-bg)] px-4 py-8 text-center text-[13px]">درگاه برای این تراکنش داده‌ای ذخیره نکرده است.</p>
            )}
          </section>
        </div>

        <aside className="grid content-start gap-4">
          <section className="bp-frame relative p-[18px]">
            <div className="mb-3 flex items-center gap-2"><ShoppingBag size={16} className="text-[var(--bp-accent)]" /><h2 className="m-0 text-[13px] font-bold">سفارش مرتبط</h2></div>
            <dl className="grid gap-3">
              <div className="min-w-0">
                <span className="bp-muted block text-[11px] font-bold">شماره سفارش</span>
                <Link href={`/admin/orders/${order.id}`} dir="ltr" className="mt-1 block break-all text-left font-mono text-[12px] font-bold text-[var(--bp-accent)] hover:underline">{order.orderNumber}</Link>
              </div>
              <div className="min-w-0">
                <span className="bp-muted block text-[11px] font-bold">وضعیت سفارش</span>
                <span className="mt-1 block"><BpTag tone={orderStatusTones[order.status]} withDot>{orderStatusLabels[order.status]}</BpTag></span>
              </div>
              <DetailItem label="جمع کالاها" value={formatMoney(order.subtotal.toString())} />
              <DetailItem label="تخفیف" value={formatMoney(order.discount.toString())} />
              <DetailItem label="هزینه ارسال" value={formatMoney(order.shipping.toString())} />
              <DetailItem label="مالیات" value={formatMoney(order.tax.toString())} />
              <DetailItem label="مبلغ نهایی سفارش" value={formatMoney(order.total.toString())} />
              <DetailItem label="تاریخ ثبت سفارش" value={formatDateTime(order.createdAt)} />
            </dl>
          </section>

          <section className="bp-frame relative p-[18px]">
            <div className="mb-3 flex items-center gap-2"><UserRound size={16} className="text-[var(--bp-accent)]" /><h2 className="m-0 text-[13px] font-bold">مشتری</h2></div>
            <dl className="grid gap-3">
              <DetailItem label="نام" value={customerName} />
              <DetailItem label="شماره همراه" value={order.user.phone ?? "ثبت نشده"} ltr />
              <DetailItem label="ایمیل" value={order.user.email ?? "ثبت نشده"} ltr />
              <DetailItem label="شناسه کاربر" value={order.user.id} ltr />
            </dl>
          </section>

          <section className="bp-frame relative p-[18px]">
            <div className="mb-3 flex items-center gap-2"><Clock3 size={16} className="text-[var(--bp-accent)]" /><h2 className="m-0 text-[13px] font-bold">زمان‌ها</h2></div>
            <dl className="grid gap-3">
              <DetailItem label="ایجاد تراکنش" value={formatDateTime(payment.createdAt)} />
              <DetailItem label="آخرین به‌روزرسانی" value={formatDateTime(payment.updatedAt)} />
              <DetailItem label="زمان پرداخت موفق" value={payment.paidAt ? formatDateTime(payment.paidAt) : "—"} />
            </dl>
          </section>

          {order.invoice && (
            <section className="bp-frame relative p-[18px]">
              <div className="mb-3 flex items-center gap-2"><Wallet size={16} className="text-[var(--bp-accent)]" /><h2 className="m-0 text-[13px] font-bold">فاکتور</h2></div>
              <dl className="grid gap-3">
                <DetailItem label="شماره فاکتور" value={order.invoice.invoiceNumber} ltr />
                <DetailItem label="وضعیت فاکتور" value={order.invoice.status === "ISSUED" ? "صادرشده" : "باطل‌شده"} />
                <DetailItem label="تاریخ صدور" value={formatDateTime(order.invoice.issuedAt)} />
              </dl>
            </section>
          )}

          {siblingPayments.length > 0 && (
            <section className="bp-frame relative p-[18px]">
              <div className="mb-3 flex items-center gap-2"><CreditCard size={16} className="text-[var(--bp-accent)]" /><h2 className="m-0 text-[13px] font-bold">سایر تراکنش‌های این سفارش</h2></div>
              <ul className="m-0 grid list-none gap-2 p-0">
                {siblingPayments.map((row) => (
                  <li key={row.id}>
                    <Link href={`/admin/payments/${row.id}`} className="flex items-center justify-between gap-2 border border-[var(--bp-divider)] bg-[var(--bp-bg)] p-2.5 text-[12px] hover:border-[var(--bp-accent)]">
                      <span className="flex min-w-0 flex-col gap-1">
                        <span className="font-bold">{formatMoney(row.amount.toString())}</span>
                        <span className="bp-muted">{paymentProviderLabel(row.provider)} · {formatDateTime(row.createdAt)}</span>
                      </span>
                      <BpTag tone={paymentStatusTones[row.status]} withDot>{paymentStatusLabels[row.status]}</BpTag>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>
    </>
  );
}

function DetailItem({ label, value, ltr = false }: { label: string; value: string; ltr?: boolean }) {
  return (
    <div className="min-w-0">
      <span className="bp-muted block text-[11px] font-bold">{label}</span>
      <span dir={ltr ? "ltr" : "rtl"} className={`mt-1 block break-all text-[13px] font-bold ${ltr ? "text-left font-mono text-[11px]" : ""}`}>{value}</span>
    </div>
  );
}
