import Image from "next/image";
import Link from "next/link";
import type { Prisma } from "@generated/prisma/client";
import { ArrowLeftRight, Banknote, CalendarDays, CreditCard, FileText, MapPin, Package, StickyNote, TriangleAlert, Truck, UserRound } from "lucide-react";
import { AdminPageHeader, AdminStatusBadge } from "@/components/admin-ui";
import { AdminOrderTrackingField } from "@/components/admin-order-tracking-field";
import { BlueprintCardTransferReview } from "@/components/admin/blueprint/card-transfer-review";
import { BpLinkButton } from "@/components/admin/blueprint/ui/button";
import { BpTag } from "@/components/admin/blueprint/ui/tag";
import { formatDateTime, formatMoney } from "@/lib/format";
import {
  paymentStatusLabel,
  paymentStatusTones,
} from "@/modules/admin/labels";
import { paymentProviderLabel } from "@/modules/payments/admin-payments";
import { CARD_TO_CARD_PROVIDER, type AdminCardTransfer } from "@/modules/payments/card-to-card-shared";
import { optionEntries } from "@/modules/products/options";
import { AdminOrderStatusSelect } from "@/components/admin-order-status-select";

type OrderDetail = Prisma.OrderGetPayload<{
  include: {
    user: true;
    items: { include: { product: { select: { slug: true; media: { include: { media: true } } } } } };
    payments: { include: { cardTransferProof: true } };
    invoice: true;
    promotionRedemptions: { include: { promotion: { select: { title: true; type: true; code: true } } } };
  };
}>;

type ShippingAddress = { recipient: string; phone: string; province: string; city: string; postalCode: string; addressLine: string };

function readShippingAddress(value: Prisma.JsonValue): ShippingAddress | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const address = value as Prisma.JsonObject;
  const read = (key: keyof ShippingAddress) => (typeof address[key] === "string" ? (address[key] as string) : "");
  return { recipient: read("recipient"), phone: read("phone"), province: read("province"), city: read("city"), postalCode: read("postalCode"), addressLine: read("addressLine") };
}

/** Every block on the page is one of these: a titled card whose body the caller lays out. */
function Card({ icon, title, meta, children }: { icon: React.ReactNode; title: string; /** A short note at the far end of the heading, such as a count. */ meta?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="bp-frame relative overflow-hidden">
      <div className="flex items-center gap-2 border-b border-[var(--bp-divider)] px-4 py-3">
        <span className="text-[var(--bp-muted)]" aria-hidden>{icon}</span>
        <h2 className="m-0 text-[14px] font-bold">{title}</h2>
        {meta && <span className="bp-muted ms-auto text-[12px]">{meta}</span>}
      </div>
      {children}
    </section>
  );
}

/** A label and its value on one line, separated from the next pair by a hairline. */
function Row({ label, children, ltr = false }: { label: string; children?: React.ReactNode; ltr?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-[var(--bp-row-line)] py-2.5 first:pt-0 last:border-b-0 last:pb-0">
      <dt className="bp-muted shrink-0 text-[12px]">{label}</dt>
      <dd dir={ltr ? "ltr" : undefined} className="m-0 min-w-0 break-words text-[13px]">{children || <span className="bp-muted">—</span>}</dd>
    </div>
  );
}

/** A label above a longer value — for text that would not fit beside its label. */
function StackedRow({ label, children }: { label: string; children?: React.ReactNode }) {
  return (
    <div className="border-b border-[var(--bp-row-line)] py-2.5 first:pt-0 last:border-b-0 last:pb-0">
      <dt className="bp-muted text-[12px]">{label}</dt>
      <dd className="m-0 mt-1 break-words text-[13px] leading-7">{children || <span className="bp-muted">—</span>}</dd>
    </div>
  );
}

/** One figure in the summary strip: a small labelled heading, the value, and an optional line under it. */
function Figure({ icon, label, children, note }: { icon: React.ReactNode; label: string; children: React.ReactNode; note?: React.ReactNode }) {
  return (
    <div className="bg-[var(--bp-card)] p-4">
      <span className="bp-muted flex items-center gap-1.5 text-[12px]"><span aria-hidden>{icon}</span>{label}</span>
      <div className="mt-2 text-[14px] font-bold">{children}</div>
      {note && <p className="bp-muted m-0 mt-1 text-[12px] leading-5">{note}</p>}
    </div>
  );
}

/** One line of the amounts summary: discounts read as savings, everything else stays neutral. */
function TotalRow({ label, value, saving = false }: { label: string; value: string; saving?: boolean }) {
  return (
    <div className={`flex items-baseline justify-between gap-4 text-[13px] ${saving ? "text-[var(--bp-success)]" : ""}`}>
      <dt className={saving ? "" : "bp-muted"}>{label}</dt>
      <dd className="m-0">{value}</dd>
    </div>
  );
}

export function BlueprintOrderDetail({ order, industry, optionColors = {}, warningMinutes }: { order: OrderDetail; industry: "GOLD" | "GENERAL"; /** Minutes before a pending order expires at which its countdown turns to a warning. */ warningMinutes: number; /** The swatch colour of each colour choice, keyed «رنگ: مشکی». */ optionColors?: Record<string, string> }) {
  const customerName = [order.user.firstName, order.user.lastName].filter(Boolean).join(" ") || "کاربر بدون نام";
  const address = readShippingAddress(order.shippingAddress);
  const successfulPayment = order.payments.find((payment) => payment.status === "SUCCESS");
  const isPickup = order.deliveryMethod === "STORE_PICKUP";
  // Every card-to-card attempt that reached the store, newest first — the one waiting for a decision leads.
  const cardTransfers: AdminCardTransfer[] = order.payments.flatMap((payment) => {
    const proof = payment.cardTransferProof;
    if (payment.provider !== CARD_TO_CARD_PROVIDER || !proof) return [];
    return [{
      paymentId: payment.id,
      status: payment.status,
      amount: payment.amount.toString(),
      submittedAt: proof.submittedAt.toISOString(),
      receipt: proof.receiptUrl ? { url: proof.receiptUrl, name: proof.receiptOriginalName } : null,
      sourceCardNumber: proof.sourceCardNumber,
      trackingCode: proof.trackingCode,
      rejectionReason: proof.rejectionReason,
      reviewedAt: proof.reviewedAt?.toISOString() ?? null,
    }];
  });
  const itemsCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
  // What was applied to the order and is worth a glance next to the amounts: promotions and, in a gold store, the rate.
  const hasAppliedNotes = order.promotionRedemptions.length > 0 || industry === "GOLD";

  return (
    <div className="flex flex-col gap-3">
      <AdminPageHeader
        flush
        title={`سفارش ${order.orderNumber}`}
        description={`ثبت‌شده در ${formatDateTime(order.createdAt)} توسط ${customerName}`}
        backHref="/admin/orders"
        backLabel="بازگشت به سفارش‌ها"
        // The status is changed right here, with the same control and the same allowed moves as the list —
        // no need to go back to the orders table for it. A transfer waiting for review has its own clock.
        action={<div className="w-[190px]"><AdminOrderStatusSelect key={order.status} orderId={order.id} initialStatus={order.status} expiresAt={cardTransfers.some((transfer) => transfer.reviewedAt === null) ? null : order.expiresAt?.toISOString() ?? null} warningMinutes={warningMinutes} /></div>}
      />

      {successfulPayment && !order.inventoryReserved && (
        <p className="m-0 flex items-start gap-2 border border-[var(--bp-danger)] bg-[var(--bp-danger-bg)] p-3 text-[12px] leading-6 text-[var(--bp-danger)]">
          <TriangleAlert size={15} className="mt-0.5 shrink-0" aria-hidden />
          پرداخت این سفارش تأیید شده، اما موجودی آن به‌طور کامل رزرو نشده است. پیش از پردازش یا ارسال، موجودی اقلام را بررسی و تعیین تکلیف کنید.
        </p>
      )}

      {/* The four things to know at a glance. One card with hairlines between the cells, not four tiles. */}
      <section aria-label="خلاصهٔ سفارش" className="bp-frame overflow-hidden">
        <div className="grid grid-cols-2 gap-px bg-[var(--bp-divider)] lg:grid-cols-4">
          <Figure icon={<Banknote size={14} />} label="مبلغ نهایی" note={`${itemsCount.toLocaleString("fa-IR")} عدد کالا`}>
            <span className="text-[18px]">{formatMoney(order.total.toString())}</span>
          </Figure>
          <Figure icon={<CreditCard size={14} />} label="وضعیت پرداخت" note={successfulPayment?.paidAt ? formatDateTime(successfulPayment.paidAt) : "هنوز پرداخت موفقی ثبت نشده است"}>
            <BpTag tone={successfulPayment ? "success" : "warning"} withDot>{successfulPayment ? "پرداخت‌شده" : "پرداخت‌نشده"}</BpTag>
          </Figure>
          <Figure icon={<CalendarDays size={14} />} label="تاریخ ثبت سفارش">{formatDateTime(order.createdAt)}</Figure>
          <Figure icon={<Truck size={14} />} label="روش تحویل" note={`آماده‌سازی تخمینی: ${order.estimatedReadyAt ? formatDateTime(order.estimatedReadyAt) : `${order.preparationDaysSnapshot.toLocaleString("fa-IR")} روز`}`}>
            {isPickup ? "تحویل حضوری" : "ارسال بیمه‌شده"}
          </Figure>
        </div>
      </section>

      <div className="grid items-start gap-3 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-3">
          {cardTransfers.length > 0 && (
            <Card icon={<ArrowLeftRight size={16} />} title="پرداخت کارت‌به‌کارت">
              <div className="grid gap-3 p-4">
                {cardTransfers.map((transfer) => <BlueprintCardTransferReview key={transfer.paymentId} orderId={order.id} transfer={transfer} />)}
              </div>
            </Card>
          )}

          <Card icon={<Package size={16} />} title="محصولات سفارش" meta={`${order.items.length.toLocaleString("fa-IR")} ردیف`}>
            <div>
              {order.items.map((item) => {
                const media = item.product?.media[0]?.media;
                const options = optionEntries(item.selectedOptions);
                return (
                  <article key={item.id} className="grid grid-cols-[56px_minmax(0,1fr)] items-center gap-x-3 gap-y-3 border-b border-[var(--bp-row-line)] p-4 last:border-b-0 sm:grid-cols-[56px_minmax(0,1fr)_auto]">
                    <span className="relative size-14 shrink-0 overflow-hidden border border-[var(--bp-divider)] bg-white">
                      {media?.type === "IMAGE" ? <Image src={media.url} alt={media.alt ?? item.name} fill sizes="56px" className="object-cover" /> : <Package className="absolute inset-0 m-auto text-[var(--bp-muted)]" size={22} />}
                    </span>
                    <div className="min-w-0">
                      {item.product ? <Link href={`/products/${item.product.slug}`} className="text-[13px] font-bold hover:text-[var(--bp-accent)]">{item.name}</Link> : <strong className="text-[13px]">{item.name}</strong>}
                      <p className="bp-muted m-0 mt-1 text-[12px]">کد: <span dir="ltr" className="inline-block">{item.sku}</span></p>
                      {(options.length > 0 || item.storeIndustry === "GOLD") && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {options.map(([name, value]) => {
                            const hex = optionColors[`${name}: ${value}`];
                            return <BpTag key={name}>{hex && <i aria-hidden className="size-2.5 shrink-0 rounded-full border border-black/15" style={{ backgroundColor: hex }} />}{name}: {value}</BpTag>;
                          })}
                          {item.storeIndustry === "GOLD" && <>
                            <BpTag>وزن: {Number(item.weightGrams).toLocaleString("fa-IR", { maximumFractionDigits: 3 })} گرم</BpTag>
                            <BpTag>عیار: {item.purity.toLocaleString("fa-IR")}</BpTag>
                          </>}
                        </div>
                      )}
                    </div>
                    <div className="col-span-full flex items-baseline justify-between gap-3 border-t border-dashed border-[var(--bp-row-line)] pt-3 sm:col-span-1 sm:flex-col sm:items-end sm:gap-1 sm:border-t-0 sm:pt-0">
                      <span className="bp-muted whitespace-nowrap text-[12px] sm:order-2">{item.quantity.toLocaleString("fa-IR")} × {formatMoney(item.unitPrice.toString())}</span>
                      <strong className="whitespace-nowrap text-[14px] sm:order-1">{formatMoney(item.total.toString())}</strong>
                      {Number(item.discountAmount) > 0 && <span className="whitespace-nowrap text-[12px] text-[var(--bp-success)] sm:order-3">تخفیف هر واحد: {formatMoney(item.discountAmount.toString())}</span>}
                    </div>
                  </article>
                );
              })}
            </div>

            {/* The amounts close the products card the way they close an invoice: the applied notes at the start, the sum at the end. */}
            <div className="flex flex-col gap-4 border-t border-[var(--bp-divider)] bg-[var(--bp-hover)] p-4 md:flex-row md:items-start">
              {hasAppliedNotes && (
                <div className="min-w-0 flex-1">
                  <h3 className="bp-muted m-0 mb-2 text-[12px] font-bold">موارد ثبت‌شده در سفارش</h3>
                  <dl className="m-0 grid gap-2">
                    {order.promotionRedemptions.map((redemption) => (
                      <div key={redemption.id} className="border border-[var(--bp-divider)] bg-[var(--bp-card)] px-3 py-2">
                        <dt className="text-[12px] font-bold">{redemption.promotion.title}</dt>
                        <dd className="bp-muted m-0 mt-0.5 text-[12px]">{redemption.promotion.code ? <>کد تخفیف: <span dir="ltr" className="inline-block">{redemption.promotion.code}</span></> : "اعمال خودکار"}</dd>
                      </div>
                    ))}
                    {industry === "GOLD" && (
                      <div className="border border-[var(--bp-divider)] bg-[var(--bp-card)] px-3 py-2">
                        <dt className="text-[12px] font-bold">نرخ طلای ثبت‌شده</dt>
                        <dd className="bp-muted m-0 mt-0.5 text-[12px]">{formatMoney(order.goldPriceSnapshot.toString())}</dd>
                      </div>
                    )}
                  </dl>
                </div>
              )}
              <dl className="m-0 grid w-full gap-2.5 md:ms-auto md:max-w-[340px]">
                <TotalRow label="جمع کالاها" value={formatMoney(order.subtotal.toString())} />
                {Number(order.productDiscount) > 0 && <TotalRow saving label="تخفیف محصولات" value={formatMoney(order.productDiscount.toString())} />}
                {Number(order.promotionDiscount) > 0 && <TotalRow saving label="تخفیف پروموشن" value={formatMoney(order.promotionDiscount.toString())} />}
                {Number(order.shippingDiscount) > 0 && <TotalRow saving label="تخفیف ارسال" value={formatMoney(order.shippingDiscount.toString())} />}
                <TotalRow label="هزینهٔ ارسال" value={formatMoney(order.shipping.toString())} />
                <TotalRow label="مالیات" value={formatMoney(order.tax.toString())} />
                <div className="flex items-baseline justify-between gap-4 border-t border-[var(--bp-divider)] pt-3">
                  <dt className="text-[13px] font-bold">مبلغ نهایی</dt>
                  <dd className="m-0 text-[16px] font-bold">{formatMoney(order.total.toString())}</dd>
                </div>
              </dl>
            </div>
          </Card>

          <Card icon={<CreditCard size={16} />} title="سوابق پرداخت" meta={order.payments.length ? `${order.payments.length.toLocaleString("fa-IR")} تراکنش` : undefined}>
            {order.payments.length ? (
              <div>
                {order.payments.map((payment, index) => (
                  <article key={payment.id} className="border-b border-[var(--bp-row-line)] p-4 last:border-b-0">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-baseline gap-2">
                        <strong className="text-[14px]">{formatMoney(payment.amount.toString())}</strong>
                        <span className="bp-muted text-[12px]">تراکنش {(index + 1).toLocaleString("fa-IR")}</span>
                      </div>
                      <AdminStatusBadge tone={paymentStatusTones[payment.status]}>{paymentStatusLabel(payment.provider, payment.status)}</AdminStatusBadge>
                    </div>
                    <dl className="m-0 mt-3 grid gap-x-4 gap-y-3 sm:grid-cols-2 xl:grid-cols-4">
                      <div className="min-w-0"><dt className="bp-muted text-[12px]">درگاه پرداخت</dt><dd className="m-0 mt-0.5 text-[13px]">{paymentProviderLabel(payment.provider)}</dd></div>
                      <div className="min-w-0"><dt className="bp-muted text-[12px]">زمان ایجاد تراکنش</dt><dd className="m-0 mt-0.5 text-[13px]">{formatDateTime(payment.createdAt)}</dd></div>
                      <div className="min-w-0"><dt className="bp-muted text-[12px]">زمان پرداخت</dt><dd className="m-0 mt-0.5 text-[13px]">{payment.paidAt ? formatDateTime(payment.paidAt) : <span className="bp-muted">—</span>}</dd></div>
                      <div className="min-w-0"><dt className="bp-muted text-[12px]">شناسه مرجع</dt><dd className="m-0 mt-0.5 break-all text-[13px]">{payment.referenceId ? <span dir="ltr" className="inline-block">{payment.referenceId}</span> : <span className="bp-muted">—</span>}</dd></div>
                      {payment.authority && <div className="min-w-0 sm:col-span-full"><dt className="bp-muted text-[12px]">شناسه درگاه</dt><dd className="m-0 mt-0.5 break-all text-[13px]"><span dir="ltr" className="inline-block">{payment.authority}</span></dd></div>}
                    </dl>
                  </article>
                ))}
              </div>
            ) : <p className="bp-muted m-0 px-4 py-8 text-center text-[13px]">هنوز تراکنشی برای این سفارش ثبت نشده است.</p>}
          </Card>

          {order.notes && (
            <Card icon={<StickyNote size={16} />} title="یادداشت سفارش">
              <p className="m-0 whitespace-pre-wrap break-words p-4 text-[13px] leading-7">{order.notes}</p>
            </Card>
          )}
        </div>

        <aside className="flex min-w-0 flex-col gap-3">
          {!isPickup && <AdminOrderTrackingField orderId={order.id} initialTrackingNumber={order.trackingNumber} />}

          <Card icon={<UserRound size={16} />} title="اطلاعات خریدار">
            <div className="p-4">
              <div className="mb-4 flex items-center gap-3">
                <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-full bg-[var(--bp-hover)] text-[15px] font-bold">{customerName.charAt(0)}</span>
                <strong className="min-w-0 break-words text-[14px]">{customerName}</strong>
              </div>
              <dl className="m-0">
                <Row label="شماره موبایل" ltr>{order.user.phone}</Row>
                <Row label="ایمیل" ltr>{order.user.email}</Row>
                <Row label="کد ملی" ltr>{order.user.nationalId}</Row>
              </dl>
            </div>
          </Card>

          <Card icon={<MapPin size={16} />} title={isPickup ? "تحویل سفارش" : "آدرس ارسال"}>
            <div className="p-4">
              {isPickup ? (
                <p className="bp-muted m-0 text-[13px] leading-7">این سفارش به‌صورت حضوری تحویل داده می‌شود و به آدرس ارسال نیازی ندارد.</p>
              ) : address ? (
                <dl className="m-0">
                  <Row label="تحویل‌گیرنده">{address.recipient}</Row>
                  <Row label="شماره تماس" ltr>{address.phone}</Row>
                  <Row label="استان و شهر">{[address.province, address.city].filter(Boolean).join("، ")}</Row>
                  <Row label="کد پستی" ltr>{address.postalCode}</Row>
                  <StackedRow label="نشانی">{address.addressLine}</StackedRow>
                </dl>
              ) : <p className="bp-muted m-0 text-[13px]">آدرس ارسال ثبت نشده است.</p>}
            </div>
          </Card>

          {order.invoice && (
            <Card icon={<FileText size={16} />} title="فاکتور رسمی">
              <div className="p-4">
                <dl className="m-0">
                  <Row label="شماره فاکتور" ltr>{order.invoice.invoiceNumber}</Row>
                  <Row label="تاریخ صدور">{formatDateTime(order.invoice.issuedAt)}</Row>
                </dl>
                <div className="mt-4"><BpLinkButton href={`/invoices/${order.id}?source=admin`} variant="primary" fullWidth>مشاهدهٔ فاکتور</BpLinkButton></div>
              </div>
            </Card>
          )}
        </aside>
      </div>
    </div>
  );
}
