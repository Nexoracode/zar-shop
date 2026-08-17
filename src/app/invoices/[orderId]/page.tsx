import { notFound, redirect } from "next/navigation";
import type { Prisma } from "@generated/prisma/client";
import { InvoiceActions } from "@/components/invoice-actions";
import { db } from "@/lib/db";
import { formatDate, formatDateTime, formatMoney } from "@/lib/format";
import { hasPermission } from "@/modules/auth/permissions";
import { requireUser } from "@/modules/auth/session";
import { optionEntries } from "@/modules/products/options";

type InvoiceOrder = Prisma.OrderGetPayload<{ include: { invoice: true; items: true; payments: true; user: true } }>;
type JsonRecord = Record<string, Prisma.JsonValue>;

export const dynamic = "force-dynamic";

function asRecord(value: Prisma.JsonValue | null | undefined): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

function text(record: JsonRecord, key: string, fallback = "—") {
  const value = record[key];
  return typeof value === "string" && value.trim() ? value : fallback;
}

function InvoiceInfo({ label, value, ltr = false }: { label: string; value: string; ltr?: boolean }) {
  return <div><dt className="text-[10px] text-slate-500">{label}</dt><dd className="m-0 mt-0.5 break-words text-xs font-bold text-slate-800" dir={ltr ? "ltr" : undefined}>{value}</dd></div>;
}

export default async function InvoicePage({ params, searchParams }: { params: Promise<{ orderId: string }>; searchParams: Promise<{ source?: string | string[] }> }) {
  const user = await requireUser();
  const [{ orderId }, query] = await Promise.all([params, searchParams]);
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { invoice: true, items: true, payments: { orderBy: { createdAt: "desc" } }, user: true },
  }) as InvoiceOrder | null;

  if (!order?.invoice) notFound();
  const canManageOrders = hasPermission(user.role, "orders:manage");
  if (order.userId !== user.id && !canManageOrders) redirect("/account");
  const openedFromAdmin = query.source === "admin" && canManageOrders;
  const backHref = openedFromAdmin || order.userId !== user.id ? `/admin/orders/${order.id}` : `/account/orders/${order.id}`;

  const seller = asRecord(order.invoice.sellerData);
  const buyer = asRecord(order.invoice.buyerData);
  const address = asRecord(buyer.address ?? order.shippingAddress);
  const invoiceCurrency = text(seller, "currency", "IRR") === "IRT" ? "IRT" : "IRR";
  const money = (value: number | string) => formatMoney(value, invoiceCurrency);
  const amount = (value: number | string) => (invoiceCurrency === "IRT" ? Number(value) / 10 : Number(value)).toLocaleString("fa-IR", { maximumFractionDigits: 0 });
  const successfulPayment = order.payments.find((payment) => payment.status === "SUCCESS");
  const buyerName = text(buyer, "name", [order.user.firstName, order.user.lastName].filter(Boolean).join(" ") || "—");
  const buyerPhone = text(buyer, "phone", text(address, "phone", order.user.phone ?? "—"));
  const fullAddress = [text(address, "province", ""), text(address, "city", ""), text(address, "addressLine", "")].filter(Boolean).join("، ") || "—";
  const cell = "border border-slate-300 px-2 py-2 text-center text-[10px] text-slate-700";

  return (
    <main className="invoice-page-shell min-h-screen bg-slate-100 px-3 py-6 sm:px-6">
      <InvoiceActions backHref={backHref} />

      <article className="invoice-print-area mx-auto w-full max-w-[210mm] bg-white p-5 text-slate-900 shadow-[0_18px_60px_rgba(15,23,42,0.12)] sm:p-8">
        <header className="grid grid-cols-[1fr_auto_1fr] items-center border-2 border-slate-800 px-4 py-3">
          <div className="text-right"><strong className="block text-lg font-bold text-[#17233b]">{text(seller, "name", "زر گالری")}</strong><span className="text-[10px] text-slate-500">{text(seller, "industry", "GOLD") === "GOLD" ? "فروشگاه طلا و زیورآلات" : "فروشگاه اینترنتی"}</span></div>
          <div className="px-4 text-center"><h1 className="m-0 text-xl font-bold">فاکتور رسمی فروش</h1><span className="text-[10px] text-slate-500">صورتحساب کالا و خدمات</span></div>
          <dl className="m-0 space-y-1 text-left text-[10px]"><div><dt className="inline text-slate-500">شماره فاکتور: </dt><dd className="inline font-bold" dir="ltr">{order.invoice.invoiceNumber}</dd></div><div><dt className="inline text-slate-500">تاریخ صدور: </dt><dd className="inline font-bold">{formatDate(order.invoice.issuedAt)}</dd></div><div><dt className="inline text-slate-500">شماره سفارش: </dt><dd className="inline font-bold" dir="ltr">{order.orderNumber}</dd></div></dl>
        </header>

        <section className="mt-3 border border-slate-300">
          <h2 className="m-0 border-b border-slate-300 bg-slate-100 px-3 py-1.5 text-xs font-bold">مشخصات فروشنده</h2>
          <dl className="m-0 grid grid-cols-2 gap-x-5 gap-y-3 p-3 sm:grid-cols-4">
            <InvoiceInfo label="نام فروشنده" value={text(seller, "name", "زر گالری")} />
            <InvoiceInfo label="شناسه ملی" value={text(seller, "nationalId")} ltr />
            <InvoiceInfo label="کد اقتصادی" value={text(seller, "economicCode")} ltr />
            <InvoiceInfo label="شماره تماس" value={text(seller, "phone")} ltr />
            <InvoiceInfo label="ایمیل" value={text(seller, "email")} ltr />
            <div className="col-span-2 sm:col-span-2"><InvoiceInfo label="نشانی فروشنده" value={text(seller, "address")} /></div>
          </dl>
        </section>

        <section className="mt-3 border border-slate-300">
          <h2 className="m-0 border-b border-slate-300 bg-slate-100 px-3 py-1.5 text-xs font-bold">مشخصات خریدار</h2>
          <dl className="m-0 grid grid-cols-2 gap-x-5 gap-y-3 p-3 sm:grid-cols-4">
            <InvoiceInfo label="نام خریدار" value={buyerName} />
            <InvoiceInfo label="کد ملی" value={text(buyer, "nationalId", order.user.nationalId ?? "—")} ltr />
            <InvoiceInfo label="شماره تماس" value={buyerPhone} ltr />
            <InvoiceInfo label="ایمیل" value={text(buyer, "email", order.user.isGuest ? "—" : order.user.email)} ltr />
            <InvoiceInfo label="کد پستی" value={text(address, "postalCode")} ltr />
            <div className="col-span-2 sm:col-span-3"><InvoiceInfo label="نشانی خریدار" value={fullAddress} /></div>
          </dl>
        </section>

        <section className="mt-3 overflow-hidden">
          <table className="w-full table-fixed border-collapse" aria-label="اقلام فاکتور رسمی">
            <thead className="bg-slate-100"><tr>{["ردیف", "شرح کالا", "کد کالا", "تعداد", "وزن", "عیار", "مبلغ واحد", "تخفیف", "اجرت", "سود", "مالیات", "مبلغ کل"].map((head) => <th key={head} className={`${cell} font-bold text-slate-800`}>{head}</th>)}</tr></thead>
            <tbody>
              {order.items.map((item, index) => (
                <tr key={item.id}>
                  <td className={cell}>{(index + 1).toLocaleString("fa-IR")}</td>
                  <td className={`${cell} text-right font-bold`}>{item.name}{optionEntries(item.selectedOptions).map(([name, value]) => <small key={name} className="mt-1 block font-normal text-slate-500">{name}: {value}</small>)}</td>
                  <td className={cell} dir="ltr">{item.sku}</td>
                  <td className={cell}>{item.quantity.toLocaleString("fa-IR")}</td>
                  <td className={cell}>{item.storeIndustry === "GOLD" ? Number(item.weightGrams).toLocaleString("fa-IR", { maximumFractionDigits: 3 }) : "—"}</td>
                  <td className={cell}>{item.storeIndustry === "GOLD" ? item.purity.toLocaleString("fa-IR") : "—"}</td>
                  <td className={cell}>{amount(item.unitPrice.toString())}</td>
                  <td className={cell}>{amount(item.discountAmount.toString())}</td>
                  <td className={cell}>{item.storeIndustry === "GOLD" ? amount(item.makingFee.toString()) : "—"}</td>
                  <td className={cell}>{item.storeIndustry === "GOLD" ? amount(item.profit.toString()) : "—"}</td>
                  <td className={cell}>{item.storeIndustry === "GOLD" ? amount(item.tax.toString()) : "—"}</td>
                  <td className={`${cell} font-bold`}>{amount(item.total.toString())}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="mt-3 grid gap-3 sm:grid-cols-[1fr_290px]">
          <div className="border border-slate-300 p-3 text-[10px] leading-6 text-slate-600">
            <strong className="block text-xs text-slate-800">اطلاعات پرداخت</strong>
            <span>وضعیت: {successfulPayment ? "پرداخت موفق" : "در انتظار پرداخت"}</span><br />
            <span>تاریخ پرداخت: {successfulPayment?.paidAt ? formatDateTime(successfulPayment.paidAt) : "—"}</span><br />
            <span>شناسه مرجع: <b dir="ltr">{successfulPayment?.referenceId ?? "—"}</b></span><br />
            {order.items.some((item) => item.storeIndustry === "GOLD") && <span>نرخ هر گرم طلای ۱۸ عیار هنگام ثبت سفارش: {money(order.goldPriceSnapshot.toString())}</span>}
          </div>
          <dl className="m-0 border border-slate-300 text-xs">
            <div className="flex justify-between border-b border-slate-200 px-3 py-2"><dt>جمع کالاها</dt><dd>{money(order.subtotal.toString())}</dd></div>
            {Number(order.productDiscount) > 0 && <div className="flex justify-between border-b border-slate-200 px-3 py-2"><dt>تخفیف محصولات</dt><dd>{money(order.productDiscount.toString())}</dd></div>}
            {Number(order.promotionDiscount) > 0 && <div className="flex justify-between border-b border-slate-200 px-3 py-2"><dt>تخفیف پروموشن</dt><dd>{money(order.promotionDiscount.toString())}</dd></div>}
            {Number(order.shippingDiscount) > 0 && <div className="flex justify-between border-b border-slate-200 px-3 py-2"><dt>تخفیف ارسال</dt><dd>{money(order.shippingDiscount.toString())}</dd></div>}
            <div className="flex justify-between border-b border-slate-200 px-3 py-2"><dt>ارسال</dt><dd>{money(order.shipping.toString())}</dd></div>
            <div className="flex justify-between border-b border-slate-200 px-3 py-2"><dt>مالیات</dt><dd>{money(order.tax.toString())}</dd></div>
            <div className="flex justify-between bg-slate-100 px-3 py-2.5 font-bold"><dt>مبلغ نهایی</dt><dd>{money(order.total.toString())}</dd></div>
          </dl>
        </section>

        {order.notes && <section className="mt-3 border border-slate-300 px-3 py-2 text-[10px]"><strong>توضیحات:</strong> {order.notes}</section>}

        <footer className="mt-5 grid grid-cols-2 gap-8 text-center text-xs">
          <div className="min-h-20 border-t border-dashed border-slate-400 pt-2">مهر و امضای فروشنده</div>
          <div className="min-h-20 border-t border-dashed border-slate-400 pt-2">امضای خریدار</div>
        </footer>
      </article>
    </main>
  );
}
