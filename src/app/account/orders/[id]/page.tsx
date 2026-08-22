import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Prisma } from "@generated/prisma/client";
import { ArrowRight, FileCheck2, FileText, ImageIcon, ShieldCheck, Truck } from "lucide-react";
import { AccountPaymentHistory, type AccountPaymentHistoryItem } from "@/components/account-payment-history";
import { OrderCancelButton } from "@/components/order-cancel-button";
import { OrderItemReviewAction } from "@/components/order-item-review-action";
import { db } from "@/lib/db";
import { formatDate, formatMoney } from "@/lib/format";
import { orderStatusLabels, paymentStatusLabels } from "@/modules/admin/labels";
import { requireUser } from "@/modules/auth/session";
import { expirePendingOrders } from "@/modules/orders/expiration";
import { optionEntries } from "@/modules/products/options";
import { getGeneralStoreSettings } from "@/modules/settings/general-settings";

export const dynamic = "force-dynamic";

type JsonRecord = Record<string, Prisma.JsonValue>;

function asRecord(value: Prisma.JsonValue | null | undefined): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

function value(record: JsonRecord, key: string) {
  const candidate = record[key];
  return typeof candidate === "string" && candidate.trim() ? candidate : "";
}

const paymentStatusClasses: Record<string, string> = {
  SUCCESS: "font-bold text-emerald-700",
  PENDING: "font-bold text-amber-700",
  INITIATED: "font-bold text-sky-700",
  FAILED: "font-bold text-rose-600",
  CANCELLED: "font-bold text-slate-500",
  REFUNDED: "font-bold text-slate-600",
};

function deliveryState(status: string) {
  if (status === "DELIVERED") return { label: "تحویل مرسوله به مشتری", progress: 100, className: "bg-emerald-500 text-emerald-700" };
  if (status === "SHIPPED") return { label: "مرسوله در مسیر ارسال است", progress: 82, className: "bg-sky-500 text-sky-700" };
  if (status === "PROCESSING") return { label: "در حال آماده‌سازی مرسوله", progress: 58, className: "bg-amber-500 text-amber-700" };
  if (status === "PAID") return { label: "پرداخت تأیید و سفارش ثبت شد", progress: 34, className: "bg-sky-500 text-sky-700" };
  return { label: orderStatusLabels[status as keyof typeof orderStatusLabels] ?? "در انتظار بررسی", progress: 12, className: "bg-slate-400 text-slate-600" };
}

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  await expirePendingOrders();
  const { id } = await params;
  const [order, settings] = await Promise.all([
    db.order.findFirst({
      where: { id, userId: user.id },
      include: {
        invoice: { select: { id: true } },
        payments: { orderBy: { createdAt: "desc" } },
        items: {
          include: {
            product: {
              select: {
                id: true,
                slug: true,
                media: { orderBy: [{ isCover: "desc" }, { position: "asc" }], take: 1, include: { media: true } },
              },
            },
          },
        },
      },
    }),
    getGeneralStoreSettings(),
  ]);
  if (!order) notFound();

  const address = asRecord(order.shippingAddress);
  const recipient = value(address, "recipient") || "—";
  const phone = value(address, "phone") || "—";
  const fullAddress = [value(address, "province"), value(address, "city"), value(address, "addressLine"), value(address, "plaque") ? `پلاک ${value(address, "plaque")}` : "", value(address, "unit") ? `واحد ${value(address, "unit")}` : ""].filter(Boolean).join("، ") || "—";
  const payment = order.payments.find((item) => item.status === "SUCCESS") ?? order.payments[0];
  const delivery = deliveryState(order.status);
  const paymentHistory: AccountPaymentHistoryItem[] = order.payments.map((item) => ({
    id: item.id,
    status: paymentStatusLabels[item.status],
    statusClassName: paymentStatusClasses[item.status] ?? "text-[var(--muted)]",
    amount: formatMoney(item.amount.toString(), settings.currency),
    date: formatDate(item.createdAt),
    referenceId: item.referenceId,
    gateway: item.provider === "zarinpal" ? "پرداخت اینترنتی زرین‌پال" : "پرداخت اینترنتی",
    isSuccessful: item.status === "SUCCESS",
  }));

  return <article className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]" dir="rtl">
    <header className="flex min-h-20 items-center gap-3 border-b border-[var(--border)] px-4 sm:px-6">
      <Link href="/account/orders" aria-label="بازگشت به سفارش‌ها" className="grid size-10 shrink-0 place-items-center rounded-lg text-slate-700 transition hover:bg-[var(--surface-secondary)]"><ArrowRight size={22} /></Link>
      <h1 className="m-0 text-lg font-bold sm:text-xl">جزئیات سفارش</h1>
      <div className="mr-auto flex items-center gap-3">
        {order.status === "PENDING_PAYMENT" ? <OrderCancelButton orderId={order.id} orderNumber={order.orderNumber} /> : null}
        {order.invoice ? <Link href={`/invoices/${order.id}`} className="inline-flex min-h-10 items-center gap-2 text-xs font-bold text-[var(--brand-primary)]"><FileText size={17} />مشاهده فاکتور</Link> : null}
      </div>
    </header>

    <section className="grid gap-4 border-b border-[var(--border)] px-4 py-5 text-sm sm:px-6">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-[var(--muted)]"><span>کد پیگیری سفارش <b className="text-[var(--foreground)]" dir="ltr">{order.orderNumber}</b></span><span className="text-slate-300">•</span><span>تاریخ ثبت سفارش <b className="text-[var(--foreground)]">{formatDate(order.createdAt)}</b></span></div>
      <div className="grid gap-3 border-t border-[var(--border)] pt-4 text-xs leading-7"><p className="m-0"><span className="ml-2 text-[var(--muted)]">تحویل‌گیرنده</span><b>{recipient}</b><span className="mx-3 text-slate-300">•</span><span className="ml-2 text-[var(--muted)]">شماره موبایل</span><b dir="ltr">{phone}</b></p><p className="m-0"><span className="ml-2 text-[var(--muted)]">آدرس</span><b>{fullAddress}</b></p></div>
    </section>

    <section className="grid gap-3 border-b border-[var(--border)] px-4 py-4 sm:px-6">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm"><span className="text-[var(--muted)]">مبلغ</span><b>{formatMoney(order.total.toString(), settings.currency)}</b><span className="text-slate-300">•</span><span className="text-[var(--muted)]">{payment?.provider === "zarinpal" ? "پرداخت اینترنتی زرین‌پال" : "پرداخت اینترنتی"}</span>{payment ? <span className={paymentStatusClasses[payment.status]}>{paymentStatusLabels[payment.status]}</span> : null}<span className="basis-full text-xs text-[var(--muted)]">هزینه ارسال {formatMoney(order.shipping.toString(), settings.currency)}</span></div>
      <AccountPaymentHistory items={paymentHistory} />
    </section>

    <section className="p-4 sm:p-6">
      <div className="rounded-xl border border-[var(--border)] p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-3 text-xs"><strong>مرسوله ۱ از ۱</strong><span className="text-slate-300">•</span><span className="inline-flex items-center gap-2 font-bold text-[var(--danger)]"><Truck size={17} />{order.deliveryMethod === "STORE_PICKUP" ? "تحویل حضوری" : "ارسال بیمه‌شده"}</span></div>
        <div className="mt-5"><strong className={`block text-sm ${delivery.className.split(" ")[1]}`}>{delivery.label}</strong><span className="mt-3 block h-1.5 overflow-hidden rounded-full bg-slate-100"><span className={`block h-full rounded-full ${delivery.className.split(" ")[0]}`} style={{ width: `${delivery.progress}%` }} /></span></div>
        <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-xs"><span><span className="text-[var(--muted)]">هزینه ارسال:</span> <b>{formatMoney(order.shipping.toString(), settings.currency)}</b></span><span className="text-slate-300">•</span><span><span className="text-[var(--muted)]">مبلغ مرسوله:</span> <b>{formatMoney(order.total.toString(), settings.currency)}</b></span><span className="sm:mr-auto"><span className="text-[var(--muted)]">کد پیگیری مرسوله:</span> <b dir={order.trackingNumber ? "ltr" : undefined}>{order.trackingNumber ?? (order.status === "SHIPPED" || order.status === "DELIVERED" ? "در انتظار ثبت فروشگاه" : "پس از ارسال نمایش داده می‌شود")}</b></span></div>

        <div className="mt-5 divide-y divide-[var(--border)] border-t border-[var(--border)]">{order.items.map((item) => {
          const media = item.product?.media[0]?.media;
          const productImage = <div className="relative grid size-24 place-items-center overflow-hidden rounded-lg bg-white sm:size-28">{media ? <Image src={media.url} alt={media.alt ?? item.name} fill sizes="112px" className="object-contain p-2" /> : <ImageIcon size={34} className="text-slate-300" />}</div>;
          return <div key={item.id} className="py-5 first:pt-5 last:pb-0"><div className="grid grid-cols-[6rem_minmax(0,1fr)] items-start gap-x-4 gap-y-5 sm:grid-cols-[7rem_minmax(0,1fr)]">
            {item.product ? <Link href={`/products/${item.product.slug}`} aria-label={`مشاهده ${item.name}`} className="rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-primary)]">{productImage}</Link> : productImage}
            <div className="min-w-0"><h2 className="m-0 text-sm font-bold leading-7">{item.name}</h2><div className="mt-2 grid gap-1 text-[11px] text-[var(--muted)]">{optionEntries(item.selectedOptions).map(([name, optionValue]) => <span key={name}>{name}: <b className="text-[var(--foreground)]">{optionValue}</b></span>)}<span className="inline-flex items-center gap-1.5"><ShieldCheck size={14} />ضمانت اصالت و سلامت فیزیکی کالا</span><span className="inline-flex items-center gap-1.5"><FileCheck2 size={14} />تعداد: {item.quantity.toLocaleString("fa-IR")}</span></div><strong className="mt-3 block text-sm">{formatMoney(item.total.toString(), settings.currency)}</strong></div>
            {order.status === "DELIVERED" && item.product ? <><strong className="pt-2 text-center text-xs text-[var(--foreground)]">امتیاز دهید</strong><OrderItemReviewAction productId={item.product.id} productName={item.name} /></> : null}
          </div></div>;
        })}</div>
      </div>
    </section>
  </article>;
}
