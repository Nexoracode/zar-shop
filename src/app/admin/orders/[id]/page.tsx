import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Prisma } from "@generated/prisma/client";
import { CalendarDays, CreditCard, FileText, MapPin, Package, Truck, UserRound } from "lucide-react";
import { AdminPageHeader, AdminPanel, AdminStatusBadge } from "@/components/admin-ui";
import { AdminOrderTrackingField } from "@/components/admin-order-tracking-field";
import { db } from "@/lib/db";
import { formatDateTime, formatMoney } from "@/lib/format";
import {
  orderStatusLabels,
  orderStatusTones,
  paymentStatusLabels,
  paymentStatusTones,
} from "@/modules/admin/labels";
import { requirePermission } from "@/modules/auth/session";
import { optionEntries } from "@/modules/products/options";
import { AlertDescription, AlertRoot } from "@/components/hero";

type PageParams = Promise<{ id: string }>;

type ShippingAddress = {
  recipient: string;
  phone: string;
  province: string;
  city: string;
  postalCode: string;
  addressLine: string;
};

function readShippingAddress(value: Prisma.JsonValue): ShippingAddress | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const address = value as Prisma.JsonObject;
  const read = (key: keyof ShippingAddress) => typeof address[key] === "string" ? address[key] : "";
  return {
    recipient: read("recipient"),
    phone: read("phone"),
    province: read("province"),
    city: read("city"),
    postalCode: read("postalCode"),
    addressLine: read("addressLine"),
  };
}

function InfoItem({ label, value, ltr = false }: { label: string; value: React.ReactNode; ltr?: boolean }) {
  return (
    <div className="min-w-0 rounded-xl bg-slate-50 px-4 py-3">
      <dt className="text-xs text-slate-400">{label}</dt>
      <dd className="mt-1 break-words text-sm font-bold text-slate-700" dir={ltr ? "ltr" : undefined}>{value || "—"}</dd>
    </div>
  );
}

export default async function OrderDetailsPage({ params }: { params: PageParams }) {
  await requirePermission("orders:manage");
  const { id } = await params;
  const order = await db.order.findUnique({
    where: { id },
    include: {
      user: true,
      items: {
        include: {
          product: {
            select: {
              slug: true,
              media: {
                orderBy: { position: "asc" },
                take: 1,
                include: { media: true },
              },
            },
          },
        },
      },
      payments: { orderBy: { createdAt: "desc" } },
      invoice: true,
      promotionRedemptions: { include: { promotion: { select: { title: true, type: true, code: true } } } },
    },
  });

  if (!order) notFound();

  const customerName = [order.user.firstName, order.user.lastName].filter(Boolean).join(" ") || "کاربر بدون نام";
  const address = readShippingAddress(order.shippingAddress);
  const successfulPayment = order.payments.find((payment) => payment.status === "SUCCESS");
  const itemsCount = order.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <>
      <AdminPageHeader
        eyebrow="جزئیات سفارش"
        title={`سفارش ${order.orderNumber}`}
        description="اطلاعات خریدار، اقلام سفارش، پرداخت و فاکتور را در این صفحه بررسی کنید."
        backHref="/admin/orders"
        backLabel="بازگشت به سفارش‌ها"
        action={<AdminStatusBadge tone={orderStatusTones[order.status]}>{orderStatusLabels[order.status]}</AdminStatusBadge>}
      />

      {successfulPayment && !order.inventoryReserved && <AlertRoot status="danger" className="mb-5"><AlertDescription>پرداخت این سفارش تأیید شده، اما موجودی آن به‌طور کامل رزرو نشده است. پیش از پردازش یا ارسال، موجودی اقلام را بررسی و تعیین تکلیف کنید.</AlertDescription></AlertRoot>}

      <section className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <AdminPanel className="p-4"><span className="mb-2 flex items-center gap-2 text-xs text-slate-400"><CreditCard size={16} /> مبلغ نهایی</span><strong className="text-base text-[#17233b]">{formatMoney(order.total.toString())}</strong></AdminPanel>
        <AdminPanel className="p-4"><span className="mb-2 flex items-center gap-2 text-xs text-slate-400"><Package size={16} /> تعداد اقلام</span><strong className="text-base text-[#17233b]">{itemsCount.toLocaleString("fa-IR")} عدد</strong></AdminPanel>
        <AdminPanel className="p-4"><span className="mb-2 flex items-center gap-2 text-xs text-slate-400"><CalendarDays size={16} /> تاریخ ثبت</span><strong className="text-sm text-[#17233b]">{formatDateTime(order.createdAt)}</strong></AdminPanel>
        <AdminPanel className="p-4"><span className="mb-2 flex items-center gap-2 text-xs text-slate-400"><CreditCard size={16} /> تاریخ پرداخت</span><strong className="text-sm text-[#17233b]">{successfulPayment?.paidAt ? formatDateTime(successfulPayment.paidAt) : "هنوز پرداخت نشده"}</strong></AdminPanel>
        <AdminPanel className="p-4"><span className="mb-2 flex items-center gap-2 text-xs text-slate-400"><Truck size={16} /> روش تحویل</span><strong className="text-sm text-[#17233b]">{order.deliveryMethod === "STORE_PICKUP" ? "تحویل حضوری" : "ارسال بیمه‌شده"}</strong></AdminPanel>
        <AdminPanel className="p-4"><span className="mb-2 flex items-center gap-2 text-xs text-slate-400"><CalendarDays size={16} /> آماده‌سازی تخمینی</span><strong className="text-sm text-[#17233b]">{order.estimatedReadyAt ? formatDateTime(order.estimatedReadyAt) : `${order.preparationDaysSnapshot.toLocaleString("fa-IR")} روز`}</strong></AdminPanel>
      </section>

      {order.deliveryMethod === "INSURED_SHIPPING" && <div className="mb-5"><AdminOrderTrackingField orderId={order.id} initialTrackingNumber={order.trackingNumber} /></div>}

      <div className="grid items-stretch gap-5 lg:grid-cols-2 xl:grid-cols-12">
        <div className="contents">
          <AdminPanel className="order-2 lg:col-span-2 xl:col-span-8">
            <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4"><Package size={18} className="text-[var(--warning)]" /><h2 className="m-0 text-base font-bold text-[#17233b]">محصولات سفارش</h2></div>
            <div className="divide-y divide-slate-100">
              {order.items.map((item) => {
                const image = item.product?.media[0]?.media;
                return (
                  <article key={item.id} className="grid gap-4 p-4 sm:grid-cols-[72px_minmax(0,1fr)_auto] sm:items-center sm:p-5">
                    <div className="relative h-[72px] w-[72px] overflow-hidden rounded-xl bg-slate-100">
                      {image?.type === "IMAGE" ? <Image src={image.url} alt={image.alt ?? item.name} fill sizes="72px" className="object-cover" /> : <Package className="absolute inset-0 m-auto text-slate-300" size={28} />}
                    </div>
                    <div className="min-w-0">
                      {item.product ? <Link href={`/products/${item.product.slug}`} className="font-bold text-[#17233b] transition hover:text-[var(--warning)]">{item.name}</Link> : <strong className="text-[#17233b]">{item.name}</strong>}
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                        <span>کد: <b dir="ltr">{item.sku}</b></span>
                        {optionEntries(item.selectedOptions).map(([name, value]) => <span key={name}>{name}: <b>{value}</b></span>)}
                        <span>تعداد: <b>{item.quantity.toLocaleString("fa-IR")}</b></span>
                        {item.storeIndustry === "GOLD" && <><span>وزن: <b>{Number(item.weightGrams).toLocaleString("fa-IR", { maximumFractionDigits: 3 })} گرم</b></span><span>عیار: <b>{item.purity.toLocaleString("fa-IR")}</b></span></>}
                      </div>
                    </div>
                    <div className="text-right sm:text-left"><span className="block text-xs text-slate-400">مبلغ این ردیف</span><strong className="mt-1 block whitespace-nowrap text-sm text-slate-700">{formatMoney(item.total.toString())}</strong>{Number(item.discountAmount) > 0 && <span className="mt-1 block text-[11px] text-rose-500">تخفیف واحد: {formatMoney(item.discountAmount.toString())}</span>}<span className="mt-1 block text-[11px] text-slate-400">واحد: {formatMoney(item.unitPrice.toString())}</span></div>
                  </article>
                );
              })}
            </div>
          </AdminPanel>

          <AdminPanel className={`order-3 lg:col-span-2 ${order.invoice ? "xl:col-span-8" : "xl:col-span-12"}`}>
            <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4"><CreditCard size={18} className="text-[var(--warning)]" /><h2 className="m-0 text-base font-bold text-[#17233b]">سوابق پرداخت</h2></div>
            {order.payments.length ? (
              <div className="grid gap-3 p-4 sm:p-5">
                {order.payments.map((payment, index) => (
                  <article key={payment.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                    <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50/80 px-4 py-3.5 sm:px-5">
                      <div>
                        <span className="block text-[11px] text-slate-400">تراکنش شماره {(index + 1).toLocaleString("fa-IR")}</span>
                        <strong className="mt-1 block text-sm text-[#17233b]">{formatMoney(payment.amount.toString())}</strong>
                      </div>
                      <AdminStatusBadge tone={paymentStatusTones[payment.status]}>{paymentStatusLabels[payment.status]}</AdminStatusBadge>
                    </div>
                    <dl className="grid gap-2 border-t border-slate-100 p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-4">
                      <InfoItem label="درگاه پرداخت" value={payment.provider} />
                      <InfoItem label="زمان ایجاد تراکنش" value={formatDateTime(payment.createdAt)} />
                      <InfoItem label="زمان پرداخت" value={payment.paidAt ? formatDateTime(payment.paidAt) : "—"} />
                      <InfoItem label="شناسه مرجع" value={payment.referenceId ?? "—"} ltr />
                    </dl>
                    {payment.authority && <div className="border-t border-slate-100 bg-slate-50/50 px-4 py-3 text-xs text-slate-500 sm:px-5"><span className="ml-2 text-slate-400">شناسه درگاه:</span><b className="break-all text-slate-700" dir="ltr">{payment.authority}</b></div>}
                  </article>
                ))}
              </div>
            ) : <p className="m-0 px-5 py-8 text-center text-sm text-slate-400">هنوز تراکنشی برای این سفارش ثبت نشده است.</p>}
          </AdminPanel>
        </div>

        <aside className="contents">
          <AdminPanel className="order-1 p-5 xl:col-span-5">
            <h2 className="mb-4 mt-0 flex items-center gap-2 text-base font-bold text-[#17233b]"><UserRound size={18} className="text-[var(--warning)]" /> اطلاعات خریدار</h2>
            <dl className="grid gap-2"><InfoItem label="نام و نام خانوادگی" value={customerName} /><InfoItem label="ایمیل" value={order.user.email} ltr /><InfoItem label="شماره موبایل" value={order.user.phone} ltr /><InfoItem label="کد ملی" value={order.user.nationalId} ltr /></dl>
          </AdminPanel>

          <AdminPanel className="order-1 p-5 xl:col-span-7">
            <h2 className="mb-4 mt-0 flex items-center gap-2 text-base font-bold text-[#17233b]"><MapPin size={18} className="text-[var(--warning)]" /> آدرس ارسال</h2>
            {address ? <dl className="grid gap-2"><InfoItem label="تحویل‌گیرنده" value={address.recipient} /><InfoItem label="شماره تماس" value={address.phone} ltr /><InfoItem label="استان و شهر" value={[address.province, address.city].filter(Boolean).join("، ")} /><InfoItem label="کد پستی" value={address.postalCode} ltr /><InfoItem label="نشانی" value={address.addressLine} /></dl> : <p className="m-0 text-sm text-slate-400">آدرس ارسال ثبت نشده است.</p>}
          </AdminPanel>

          <AdminPanel className="order-2 p-5 xl:col-span-4">
            <h2 className="mb-4 mt-0 text-base font-bold text-[#17233b]">خلاصه مبالغ</h2>
            <dl className="space-y-3 text-sm"><div className="flex justify-between gap-3 text-slate-500"><dt>جمع کالاها</dt><dd>{formatMoney(order.subtotal.toString())}</dd></div>{Number(order.productDiscount) > 0 && <div className="flex justify-between gap-3 text-slate-500"><dt>تخفیف محصولات</dt><dd>{formatMoney(order.productDiscount.toString())}</dd></div>}{Number(order.promotionDiscount) > 0 && <div className="flex justify-between gap-3 text-violet-600"><dt>تخفیف پروموشن</dt><dd>{formatMoney(order.promotionDiscount.toString())}</dd></div>}{Number(order.shippingDiscount) > 0 && <div className="flex justify-between gap-3 text-sky-600"><dt>تخفیف ارسال</dt><dd>{formatMoney(order.shippingDiscount.toString())}</dd></div>}<div className="flex justify-between gap-3 text-slate-500"><dt>هزینه ارسال</dt><dd>{formatMoney(order.shipping.toString())}</dd></div><div className="flex justify-between gap-3 text-slate-500"><dt>مالیات</dt><dd>{formatMoney(order.tax.toString())}</dd></div><div className="flex justify-between gap-3 border-t border-slate-100 pt-3 font-bold text-[#17233b]"><dt>مبلغ نهایی</dt><dd>{formatMoney(order.total.toString())}</dd></div>{order.promotionRedemptions.map((redemption) => <div key={redemption.id} className="rounded-lg bg-violet-50 px-3 py-2 text-xs text-violet-700"><dt className="font-bold">{redemption.promotion.title}</dt><dd className="mt-1">{redemption.promotion.code ? `کد: ${redemption.promotion.code}` : "اعمال خودکار"}</dd></div>)}<div className="flex justify-between gap-3 rounded-xl bg-[var(--warning)]/15 px-3 py-2 text-xs font-bold text-[var(--warning)]"><dt>نرخ طلای ثبت‌شده</dt><dd>{formatMoney(order.goldPriceSnapshot.toString())}</dd></div></dl>
          </AdminPanel>

          {order.invoice && <AdminPanel className="order-3 flex h-full flex-col p-5 xl:col-span-4"><h2 className="mb-3 mt-0 flex items-center gap-2 text-base font-bold text-[#17233b]"><FileText size={18} className="text-[var(--warning)]" /> فاکتور رسمی</h2><p className="mb-5 mt-0 text-xs text-slate-500">شماره {order.invoice.invoiceNumber} · صادرشده در {formatDateTime(order.invoice.issuedAt)}</p><Link href={`/invoices/${order.id}?source=admin`} className="mt-auto inline-flex min-h-10 w-full items-center justify-center rounded-xl bg-[var(--accent)] px-4 text-sm font-bold text-[var(--accent-foreground)] transition hover:bg-[var(--accent-hover)]">مشاهده فاکتور</Link></AdminPanel>}

          {order.notes && <AdminPanel className="order-4 p-5 lg:col-span-2 xl:col-span-12"><h2 className="mb-2 mt-0 text-base font-bold text-[#17233b]">یادداشت سفارش</h2><p className="m-0 whitespace-pre-wrap text-sm leading-7 text-slate-600">{order.notes}</p></AdminPanel>}
        </aside>
      </div>
    </>
  );
}
