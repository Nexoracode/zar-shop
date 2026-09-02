import Image from "next/image";
import Link from "next/link";
import type { Prisma } from "@generated/prisma/client";
import { CalendarDays, CreditCard, FileText, MapPin, Package, TriangleAlert, Truck, UserRound } from "lucide-react";
import { AdminPageHeader, AdminStatusBadge } from "@/components/admin-ui";
import { AdminOrderTrackingField } from "@/components/admin-order-tracking-field";
import { BpLinkButton } from "@/components/admin/blueprint/ui/button";
import { formatDateTime, formatMoney } from "@/lib/format";
import {
  orderStatusLabels,
  orderStatusTones,
  paymentStatusLabels,
  paymentStatusTones,
} from "@/modules/admin/labels";
import { optionEntries } from "@/modules/products/options";

type OrderDetail = Prisma.OrderGetPayload<{
  include: {
    user: true;
    items: { include: { product: { select: { slug: true; media: { include: { media: true } } } } } };
    payments: true;
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

function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`bp-frame relative ${className}`.trim()}>{children}</section>;
}

function PanelHead({ icon, title }: { icon: React.ReactNode; title: string }) {
  return <div className="flex items-center gap-2 border-b border-[var(--bp-divider)] px-4 py-3"><span className="text-[var(--bp-muted)]">{icon}</span><h2 className="m-0 text-[14px] font-bold">{title}</h2></div>;
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <Panel className="p-3.5">
      <span className="bp-muted mb-1.5 flex items-center gap-1.5 text-[11px]">{icon}{label}</span>
      <strong className="block text-[13px]">{value}</strong>
    </Panel>
  );
}

function Field({ label, value, ltr = false }: { label: string; value: React.ReactNode; ltr?: boolean }) {
  return (
    <div className="min-w-0 border border-[var(--bp-divider)] px-3 py-2">
      <dt className="bp-muted text-[11px]">{label}</dt>
      <dd dir={ltr ? "ltr" : undefined} className="mt-0.5 break-words text-[13px] font-bold">{value || "—"}</dd>
    </div>
  );
}

export function BlueprintOrderDetail({ order, industry }: { order: OrderDetail; industry: "GOLD" | "GENERAL" }) {
  const customerName = [order.user.firstName, order.user.lastName].filter(Boolean).join(" ") || "کاربر بدون نام";
  const address = readShippingAddress(order.shippingAddress);
  const successfulPayment = order.payments.find((payment) => payment.status === "SUCCESS");
  const itemsCount = order.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="flex flex-col gap-2">
      <AdminPageHeader
        flush
        title={`سفارش ${order.orderNumber}`}
        description="اطلاعات خریدار، اقلام سفارش، پرداخت و فاکتور را در این صفحه بررسی کنید."
        backHref="/admin/orders"
        backLabel="بازگشت به سفارش‌ها"
        action={<AdminStatusBadge tone={orderStatusTones[order.status]}>{orderStatusLabels[order.status]}</AdminStatusBadge>}
      />

      {successfulPayment && !order.inventoryReserved && (
        <p className="m-0 flex items-start gap-2 border border-[var(--bp-danger)] bg-[color-mix(in_srgb,var(--bp-danger)_8%,transparent)] p-3 text-[12px] leading-6 text-[var(--bp-danger)]">
          <TriangleAlert size={15} className="mt-0.5 shrink-0" aria-hidden />
          پرداخت این سفارش تأیید شده، اما موجودی آن به‌طور کامل رزرو نشده است. پیش از پردازش یا ارسال، موجودی اقلام را بررسی و تعیین تکلیف کنید.
        </p>
      )}

      <section className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <Stat icon={<CreditCard size={14} />} label="مبلغ نهایی" value={formatMoney(order.total.toString())} />
        <Stat icon={<Package size={14} />} label="تعداد اقلام" value={`${itemsCount.toLocaleString("fa-IR")} عدد`} />
        <Stat icon={<CalendarDays size={14} />} label="تاریخ ثبت" value={formatDateTime(order.createdAt)} />
        <Stat icon={<CreditCard size={14} />} label="تاریخ پرداخت" value={successfulPayment?.paidAt ? formatDateTime(successfulPayment.paidAt) : "هنوز پرداخت نشده"} />
        <Stat icon={<Truck size={14} />} label="روش تحویل" value={order.deliveryMethod === "STORE_PICKUP" ? "تحویل حضوری" : "ارسال بیمه‌شده"} />
        <Stat icon={<CalendarDays size={14} />} label="آماده‌سازی تخمینی" value={order.estimatedReadyAt ? formatDateTime(order.estimatedReadyAt) : `${order.preparationDaysSnapshot.toLocaleString("fa-IR")} روز`} />
      </section>

      {order.deliveryMethod === "INSURED_SHIPPING" && <AdminOrderTrackingField orderId={order.id} initialTrackingNumber={order.trackingNumber} />}

      <div className="grid items-start gap-2 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-w-0 flex-col gap-2">
          <Panel>
            <PanelHead icon={<Package size={17} />} title="محصولات سفارش" />
            <div>
              {order.items.map((item) => {
                const media = item.product?.media[0]?.media;
                return (
                  <article key={item.id} className="grid gap-3 border-b border-[var(--bp-row-line)] p-4 last:border-b-0 sm:grid-cols-[64px_minmax(0,1fr)_auto] sm:items-center">
                    <span className="relative h-16 w-16 shrink-0 overflow-hidden border border-[var(--bp-divider)] bg-white">
                      {media?.type === "IMAGE" ? <Image src={media.url} alt={media.alt ?? item.name} fill sizes="64px" className="object-cover" /> : <Package className="absolute inset-0 m-auto text-[var(--bp-muted)]" size={24} />}
                    </span>
                    <div className="min-w-0">
                      {item.product ? <Link href={`/products/${item.product.slug}`} className="font-bold hover:text-[var(--bp-accent)]">{item.name}</Link> : <strong>{item.name}</strong>}
                      <div className="bp-muted mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
                        <span>کد: <b dir="ltr">{item.sku}</b></span>
                        {optionEntries(item.selectedOptions).map(([name, value]) => <span key={name}>{name}: <b>{value}</b></span>)}
                        <span>تعداد: <b>{item.quantity.toLocaleString("fa-IR")}</b></span>
                        {item.storeIndustry === "GOLD" && <><span>وزن: <b>{Number(item.weightGrams).toLocaleString("fa-IR", { maximumFractionDigits: 3 })} گرم</b></span><span>عیار: <b>{item.purity.toLocaleString("fa-IR")}</b></span></>}
                      </div>
                    </div>
                    <div className="text-start sm:text-end">
                      <span className="bp-muted block text-[11px]">مبلغ این ردیف</span>
                      <strong className="mt-0.5 block whitespace-nowrap text-[13px]">{formatMoney(item.total.toString())}</strong>
                      {Number(item.discountAmount) > 0 && <span className="mt-0.5 block text-[11px] text-[var(--bp-danger)]">تخفیف واحد: {formatMoney(item.discountAmount.toString())}</span>}
                      <span className="bp-muted mt-0.5 block text-[11px]">واحد: {formatMoney(item.unitPrice.toString())}</span>
                    </div>
                  </article>
                );
              })}
            </div>
          </Panel>

          <Panel>
            <PanelHead icon={<CreditCard size={17} />} title="سوابق پرداخت" />
            {order.payments.length ? (
              <div className="grid gap-2 p-4">
                {order.payments.map((payment, index) => (
                  <article key={payment.id} className="border border-[var(--bp-divider)]">
                    <div className="flex flex-wrap items-center justify-between gap-2 bg-[var(--bp-hover)] px-3 py-2.5">
                      <div>
                        <span className="bp-muted block text-[11px]">تراکنش شماره {(index + 1).toLocaleString("fa-IR")}</span>
                        <strong className="mt-0.5 block text-[13px]">{formatMoney(payment.amount.toString())}</strong>
                      </div>
                      <AdminStatusBadge tone={paymentStatusTones[payment.status]}>{paymentStatusLabels[payment.status]}</AdminStatusBadge>
                    </div>
                    <dl className="grid gap-2 border-t border-[var(--bp-divider)] p-3 sm:grid-cols-2 xl:grid-cols-4">
                      <Field label="درگاه پرداخت" value={payment.provider} />
                      <Field label="زمان ایجاد تراکنش" value={formatDateTime(payment.createdAt)} />
                      <Field label="زمان پرداخت" value={payment.paidAt ? formatDateTime(payment.paidAt) : "—"} />
                      <Field label="شناسه مرجع" value={payment.referenceId ?? "—"} ltr />
                    </dl>
                    {payment.authority && <div className="border-t border-[var(--bp-divider)] px-3 py-2 text-[11px]"><span className="bp-muted me-2">شناسه درگاه:</span><b dir="ltr" className="break-all">{payment.authority}</b></div>}
                  </article>
                ))}
              </div>
            ) : <p className="bp-muted m-0 px-4 py-8 text-center text-[13px]">هنوز تراکنشی برای این سفارش ثبت نشده است.</p>}
          </Panel>

          {order.notes && (
            <Panel className="p-4">
              <h2 className="m-0 mb-2 text-[14px] font-bold">یادداشت سفارش</h2>
              <p className="m-0 whitespace-pre-wrap text-[13px] leading-7 text-[var(--bp-muted)]">{order.notes}</p>
            </Panel>
          )}
        </div>

        <aside className="flex min-w-0 flex-col gap-2">
          <Panel className="p-4">
            <h2 className="m-0 mb-3 flex items-center gap-2 text-[14px] font-bold"><UserRound size={17} className="text-[var(--bp-muted)]" /> اطلاعات خریدار</h2>
            <dl className="grid gap-2">
              <Field label="نام و نام خانوادگی" value={customerName} />
              <Field label="ایمیل" value={order.user.email ?? "—"} ltr />
              <Field label="شماره موبایل" value={order.user.phone} ltr />
              <Field label="کد ملی" value={order.user.nationalId} ltr />
            </dl>
          </Panel>

          <Panel className="p-4">
            <h2 className="m-0 mb-3 flex items-center gap-2 text-[14px] font-bold"><MapPin size={17} className="text-[var(--bp-muted)]" /> آدرس ارسال</h2>
            {address ? (
              <dl className="grid gap-2">
                <Field label="تحویل‌گیرنده" value={address.recipient} />
                <Field label="شماره تماس" value={address.phone} ltr />
                <Field label="استان و شهر" value={[address.province, address.city].filter(Boolean).join("، ")} />
                <Field label="کد پستی" value={address.postalCode} ltr />
                <Field label="نشانی" value={address.addressLine} />
              </dl>
            ) : <p className="bp-muted m-0 text-[13px]">آدرس ارسال ثبت نشده است.</p>}
          </Panel>

          <Panel className="p-4">
            <h2 className="m-0 mb-3 text-[14px] font-bold">خلاصهٔ مبالغ</h2>
            <dl className="grid gap-2.5 text-[13px]">
              <div className="bp-muted flex justify-between gap-3"><dt>جمع کالاها</dt><dd>{formatMoney(order.subtotal.toString())}</dd></div>
              {Number(order.productDiscount) > 0 && <div className="bp-muted flex justify-between gap-3"><dt>تخفیف محصولات</dt><dd>{formatMoney(order.productDiscount.toString())}</dd></div>}
              {Number(order.promotionDiscount) > 0 && <div className="flex justify-between gap-3 text-[var(--bp-accent)]"><dt>تخفیف پروموشن</dt><dd>{formatMoney(order.promotionDiscount.toString())}</dd></div>}
              {Number(order.shippingDiscount) > 0 && <div className="flex justify-between gap-3 text-[var(--bp-info)]"><dt>تخفیف ارسال</dt><dd>{formatMoney(order.shippingDiscount.toString())}</dd></div>}
              <div className="bp-muted flex justify-between gap-3"><dt>هزینهٔ ارسال</dt><dd>{formatMoney(order.shipping.toString())}</dd></div>
              <div className="bp-muted flex justify-between gap-3"><dt>مالیات</dt><dd>{formatMoney(order.tax.toString())}</dd></div>
              <div className="flex justify-between gap-3 border-t border-[var(--bp-divider)] pt-2.5 font-bold"><dt>مبلغ نهایی</dt><dd>{formatMoney(order.total.toString())}</dd></div>
              {order.promotionRedemptions.map((redemption) => (
                <div key={redemption.id} className="border border-[var(--bp-divider)] px-3 py-2 text-[11px]">
                  <dt className="font-bold">{redemption.promotion.title}</dt>
                  <dd className="bp-muted mt-0.5">{redemption.promotion.code ? `کد: ${redemption.promotion.code}` : "اعمال خودکار"}</dd>
                </div>
              ))}
              {industry === "GOLD" && <div className="flex justify-between gap-3 border border-[var(--bp-divider)] px-3 py-2 text-[11px] font-bold"><dt>نرخ طلای ثبت‌شده</dt><dd>{formatMoney(order.goldPriceSnapshot.toString())}</dd></div>}
            </dl>
          </Panel>

          {order.invoice && (
            <Panel className="p-4">
              <h2 className="m-0 mb-2 flex items-center gap-2 text-[14px] font-bold"><FileText size={17} className="text-[var(--bp-muted)]" /> فاکتور رسمی</h2>
              <p className="bp-muted m-0 mb-3 text-[11px]">شماره {order.invoice.invoiceNumber} · صادرشده در {formatDateTime(order.invoice.issuedAt)}</p>
              <BpLinkButton href={`/invoices/${order.id}?source=admin`} variant="primary" fullWidth>مشاهدهٔ فاکتور</BpLinkButton>
            </Panel>
          )}
        </aside>
      </div>
    </div>
  );
}
